import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalyticsDataService } from '../core/analytics/analytics-data.service';
import { CountryNamePipe } from '../shared/country-name.pipe';

@Component({
  selector: 'app-overview-page',
  imports: [CountryNamePipe, DecimalPipe, PercentPipe, RouterLink],
  template: `
    <section class="page-header" aria-labelledby="overview-title">
      <p class="eyebrow">Personal improvement, locally stored</p>
      <h1 id="overview-title">Overview</h1>
      <p>Play GeoGuessr normally. This dashboard turns completed games into clear next steps.</p>
    </section>
    @if (analytics.state() === 'loading') {
      <section class="empty-hero" aria-live="polite">
        <div><h2>Loading your local dashboard…</h2></div>
      </section>
    } @else if (analytics.model().state === 'empty') {
      <section class="empty-hero" aria-labelledby="empty-games-title">
        <span class="empty-icon" aria-hidden="true">◎</span>
        <div>
          <h2 id="empty-games-title">No games analyzed yet</h2>
          <p>Play a supported GeoGuessr game. Completed rounds will appear here automatically.</p>
        </div>
        <a href="https://www.geoguessr.com/" target="_blank" rel="noreferrer"
          >Open GeoGuessr <span aria-hidden="true">↗</span></a
        >
      </section>
    } @else {
      <section class="dashboard-grid" aria-label="Dashboard empty states">
        <article class="card summary-card">
          <p class="card-label">Performance snapshot</p>
          <div class="metric-grid">
            <div>
              <span>Recognition</span
              ><strong>{{
                analytics.model().overview.overall.recognitionAccuracy | percent: '1.0-0'
              }}</strong
              ><small>Resolved country guesses</small>
            </div>
            <div>
              <span>Average score</span
              ><strong>{{
                analytics.model().overview.overall.averageScore | number: '1.0-0'
              }}</strong
              ><small>Across completed rounds</small>
            </div>
            <div>
              <span>Rounds played</span
              ><strong>{{ analytics.model().overview.overall.totalRounds }}</strong
              ><small
                >{{ analytics.model().overview.totalResolvedCountries }} countries resolved</small
              >
            </div>
          </div>
        </article>
        <article class="card recommendation-card">
          <p class="card-label">Next practice</p>
          @if (analytics.model().overview.practiceRecommendation; as recommendation) {
            <h2>{{ recommendation.countryCode | countryName }}</h2>
            <p>
              Recognition {{ recommendation.explanation.recognitionAccuracy | percent: '1.0-0' }} ·
              {{ recommendation.explanation.confidence }} confidence.
            </p>
            <a [routerLink]="['/countries', recommendation.countryCode]">View country details</a>
          } @else {
            <h2>Not enough data yet</h2>
            <p>
              More completed rounds are needed before GeoGuessr Coach can make a reliable
              recommendation.
            </p>
            <span class="status-pill">Confidence: building</span>
          }
        </article>
        <article class="card map-card">
          <div class="card-heading">
            <p class="card-label">World proficiency</p>
            <span>Country level</span>
          </div>
          <div class="map-placeholder">
            <span aria-hidden="true">◌</span>
            <p>
              {{ analytics.model().overview.totalResolvedCountries }} countries available for
              mapping.
            </p>
            <a routerLink="/world-map">Open World Map</a>
          </div>
        </article>
        <article class="card queue-card">
          <p class="card-label">Practice queue</p>
          <h2>
            {{ analytics.model().practice.items.length }} country
            {{ analytics.model().practice.items.length === 1 ? 'signal' : 'signals' }}
          </h2>
          <p>Your ranked coaching signals are available in Practice.</p>
          <a routerLink="/practice">Open Practice</a>
        </article>
      </section>
    }
  `,
  styleUrl: './pages.scss',
})
export class OverviewPageComponent {
  protected readonly analytics = inject(AnalyticsDataService);
}
