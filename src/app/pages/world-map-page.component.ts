import { DecimalPipe, PercentPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import * as maplibregl from 'maplibre-gl';
import { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';

import countriesGeoJson from '@geo-maps/countries-land-10km/map.geo.json';

import { type MapCountryMetricQuery } from '../core/analytics/analytics-query';
import { AnalyticsDataService } from '../core/analytics/analytics-data.service';
import { CountryNamePipe } from '../shared/country-name.pipe';

type MapMetric = 'average-score' | 'priority' | 'recognition' | 'rounds';

interface HoveredCountry {
  readonly countryCode: string;
  readonly metric: MapCountryMetricQuery;
}

@Component({
  selector: 'app-world-map-page',
  imports: [CountryNamePipe, DecimalPipe, PercentPipe],
  template: `
    <section class="page-header" aria-labelledby="map-title">
      <p class="eyebrow">Geographic overview</p>
      <h1 id="map-title">World Map</h1>
      <p>
        Explore completed-round performance by country. The map is rendered from bundled boundaries.
      </p>
    </section>

    @if (analytics.state() === 'loading') {
      <section class="map-state" aria-live="polite"><h2>Loading world performance…</h2></section>
    } @else if (analytics.state() === 'error') {
      <section class="map-state error-state" role="alert">
        <h2>World performance could not be loaded</h2>
        <button type="button" (click)="refresh()">Try again</button>
      </section>
    } @else if (analytics.model().state === 'empty') {
      <section class="map-state">
        <h2>No mapped performance yet</h2>
        <p>Complete a supported game to add country metrics to this local map.</p>
      </section>
    } @else {
      @if (analytics.model().state === 'insufficient-data') {
        <p class="insufficient-note" role="status">
          Early results are visible. Strong coaching remains unavailable until a country has enough
          rounds.
        </p>
      }
      <section class="map-layout" aria-label="World country performance map">
        <div class="map-card">
          <div class="map-controls">
            <fieldset>
              <legend>Map metric</legend>
              <div class="metric-options">
                @for (option of metricOptions; track option.value) {
                  <label
                    ><input
                      type="radio"
                      name="map-metric"
                      [value]="option.value"
                      [checked]="metric() === option.value"
                      (change)="selectMetric(option.value)"
                    />
                    {{ option.label }}</label
                  >
                }
              </div>
            </fieldset>
            <button type="button" (click)="resetView()">Reset view</button>
          </div>
          <div
            #mapContainer
            class="map-canvas"
            aria-label="Interactive world map. Choose a metric, then select a colored country to open details."
          ></div>
          <div class="map-legend" aria-label="Map legend">
            <span><i class="legend-swatch weak"></i>Lower / weaker</span
            ><span><i class="legend-swatch medium"></i>Middle</span
            ><span><i class="legend-swatch strong"></i>Higher / stronger</span
            ><span><i class="legend-swatch missing"></i>No data</span>
          </div>
        </div>
        <aside class="map-info card" aria-live="polite">
          @if (hovered()) {
            <p class="card-label">Selected country</p>
            <h2>{{ hovered()!.countryCode | countryName }}</h2>
            <dl>
              <div>
                <dt>{{ metricLabel() }}</dt>
                <dd>{{ selectedValue(hovered()!.metric) }}</dd>
              </div>
              <div>
                <dt>Recognition</dt>
                <dd>{{ hovered()!.metric.recognitionAccuracy | percent: '1.0-0' }}</dd>
              </div>
              <div>
                <dt>Average score</dt>
                <dd>{{ hovered()!.metric.averageScore | number: '1.0-0' }}</dd>
              </div>
              <div>
                <dt>Rounds</dt>
                <dd>{{ hovered()!.metric.rounds }}</dd>
              </div>
            </dl>
            <button type="button" (click)="openCountry(hovered()!.countryCode)">
              View country details
            </button>
          } @else {
            <p class="card-label">Explore your data</p>
            <h2>Select a country</h2>
            <p>
              Hover or select any colored country to inspect its saved performance. Countries
              without data remain muted.
            </p>
          }
        </aside>
      </section>
    }
  `,
  styleUrl: './world-map-page.component.scss',
})
export class WorldMapPageComponent implements AfterViewInit {
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  protected readonly analytics = inject(AnalyticsDataService);
  private readonly router = inject(Router);
  protected readonly hovered = signal<HoveredCountry | undefined>(undefined);
  protected readonly metric = signal<MapMetric>('recognition');
  protected readonly metricOptions: readonly { label: string; value: MapMetric }[] = [
    { label: 'Recognition', value: 'recognition' },
    { label: 'Average score', value: 'average-score' },
    { label: 'Rounds played', value: 'rounds' },
    { label: 'Practice priority', value: 'priority' },
  ];
  private map?: MapLibreMap;

  constructor() {
    effect(() => {
      const metric = this.metric();
      const mapMetrics = this.analytics.model().map;
      if (this.map?.isStyleLoaded()) {
        this.updateMapData(mapMetrics, metric);
      }
    });
  }

  ngAfterViewInit(): void {
    const container = this.mapContainer?.nativeElement;
    if (!container) {
      return;
    }

    const workerUrl = new URL('maplibre-gl-worker.mjs', document.baseURI).href;
    console.info('[GeoGuessr Coach map] configuring local MapLibre worker', { workerUrl });
    maplibregl.setWorkerUrl(workerUrl);

    try {
      this.map = new maplibregl.Map({
        attributionControl: false,
        center: [10, 20],
        container,
        maxZoom: 5,
        minZoom: 0.75,
        style: {
          layers: [
            { id: 'background', paint: { 'background-color': '#0b1020' }, type: 'background' },
          ],
          sources: {},
          version: 8,
        },
        zoom: 1.15,
      });
    } catch (error) {
      console.error('[GeoGuessr Coach map] map construction failed', error);
      return;
    }

    console.info('[GeoGuessr Coach map] map construction succeeded');
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    this.map.on('error', (event) => {
      console.error('[GeoGuessr Coach map] MapLibre error event', event.error);
    });
    this.map.on('load', () => {
      console.info('[GeoGuessr Coach map] style loaded; adding local country source', {
        metric: this.metric(),
        savedCountryCount: this.analytics.model().map.length,
      });
      this.map?.addSource('country-metrics', {
        data: this.createMapData(this.analytics.model().map, this.metric()),
        type: 'geojson',
      });
      this.map?.addLayer({
        id: 'country-fill',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.88 },
        source: 'country-metrics',
        type: 'fill',
      });
      this.map?.addLayer({
        id: 'country-outline',
        paint: { 'line-color': '#334155', 'line-width': 0.45 },
        source: 'country-metrics',
        type: 'line',
      });
      this.bindMapEvents();
      console.info('[GeoGuessr Coach map] country layers initialized');
    });
  }

  protected selectMetric(metric: MapMetric): void {
    this.metric.set(metric);
  }

  protected refresh(): void {
    void this.analytics.refresh();
  }

  protected resetView(): void {
    this.map?.easeTo({ center: [10, 20], duration: 400, zoom: 1.15 });
  }

  protected openCountry(countryCode: string): void {
    void this.router.navigate(['/countries', countryCode]);
  }

  protected metricLabel(): string {
    return this.metricOptions.find((option) => option.value === this.metric())!.label;
  }

  protected selectedValue(country: MapCountryMetricQuery): string {
    switch (this.metric()) {
      case 'recognition':
        return country.recognitionAccuracy === undefined
          ? 'Unresolved'
          : `${Math.round(country.recognitionAccuracy * 100)}%`;
      case 'average-score':
        return Math.round(country.averageScore).toLocaleString();
      case 'rounds':
        return String(country.rounds);
      case 'priority':
        return country.status.replace('-', ' ');
    }
  }

  private bindMapEvents(): void {
    this.map?.on('mousemove', 'country-fill', (event) =>
      this.setHoveredFromFeature(event.features?.[0]?.properties),
    );
    this.map?.on('click', 'country-fill', (event) => {
      const countryCode = this.setHoveredFromFeature(event.features?.[0]?.properties);
      if (countryCode) {
        this.openCountry(countryCode);
      }
    });
    this.map?.on('mouseleave', 'country-fill', () => this.hovered.set(undefined));
  }

  private setHoveredFromFeature(
    properties: Record<string, unknown> | undefined,
  ): string | undefined {
    const countryCode = typeof properties?.['A3'] === 'string' ? properties['A3'] : undefined;
    const metric = countryCode
      ? this.analytics.model().map.find((candidate) => candidate.countryCode === countryCode)
      : undefined;
    this.hovered.set(metric && countryCode ? { countryCode, metric } : undefined);
    return metric ? countryCode : undefined;
  }

  private updateMapData(mapMetrics: readonly MapCountryMetricQuery[], metric: MapMetric): void {
    const source = this.map?.getSource('country-metrics') as GeoJSONSource | undefined;
    if (source) {
      source.setData(this.createMapData(mapMetrics, metric));
    }
  }

  private createMapData(mapMetrics: readonly MapCountryMetricQuery[], metric: MapMetric) {
    const metricsByCountry = new globalThis.Map(mapMetrics.map((item) => [item.countryCode, item]));
    const features = countriesGeoJson.features.map((feature) => {
      const countryCode = feature.properties['A3'] as string | undefined;
      const countryMetric = countryCode ? metricsByCountry.get(countryCode) : undefined;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          color: countryMetric ? colorFor(countryMetric, metric) : '#1e293b',
        },
      };
    });

    return { ...countriesGeoJson, features };
  }
}

function colorFor(country: MapCountryMetricQuery, metric: MapMetric): string {
  const value = metricValue(country, metric);
  if (value >= 0.67) return '#22c55e';
  if (value >= 0.34) return '#fbbf24';
  return '#fb7185';
}

function metricValue(country: MapCountryMetricQuery, metric: MapMetric): number {
  switch (metric) {
    case 'recognition':
      return country.recognitionAccuracy ?? 0;
    case 'average-score':
      return Math.min(1, country.averageScore / 5000);
    case 'rounds':
      return Math.min(1, country.rounds / 20);
    case 'priority':
      return country.status === 'needs-work'
        ? 1
        : country.status === 'learning'
          ? 0.6
          : country.status === 'mastered'
            ? 0.2
            : 0;
  }
}
