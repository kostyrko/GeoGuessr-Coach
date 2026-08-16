import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { type CountryAnalyticsQuery } from '../core/analytics/analytics-query';
import { AnalyticsDataService } from '../core/analytics/analytics-data.service';
import { CountryNamePipe } from '../shared/country-name.pipe';

type CountrySort = 'country' | 'priority' | 'rounds' | 'score';

@Component({
  selector: 'app-countries-page',
  imports: [CountryNamePipe, DecimalPipe, PercentPipe],
  template: `
    <section class="page-header" aria-labelledby="countries-title">
      <p class="eyebrow">Performance</p>
      <h1 id="countries-title">Countries</h1>
      <p>Compare country recognition and localization from your completed rounds.</p>
    </section>

    @if (analytics.state() === 'loading') {
      <section class="analytics-state" aria-live="polite">
        <span aria-hidden="true">◌</span>
        <h2>Loading country performance…</h2>
      </section>
    } @else if (analytics.state() === 'error') {
      <section class="analytics-state error-state" role="alert">
        <span aria-hidden="true">!</span>
        <h2>Country performance could not be loaded</h2>
        <button type="button" (click)="refresh()">Try again</button>
      </section>
    } @else if (analytics.model().state === 'empty') {
      <section class="analytics-state">
        <span aria-hidden="true">◌</span>
        <h2>No country data yet</h2>
        <p>Complete a supported GeoGuessr game to begin building country-level analytics.</p>
      </section>
    } @else {
      @if (analytics.model().state === 'insufficient-data') {
        <p class="insufficient-note" role="status">
          Early results are shown, but stronger coaching needs at least 10 rounds for a country.
        </p>
      }

      <div class="country-controls">
        <label>
          <span>Search countries</span>
          <input
            type="search"
            placeholder="Search countries"
            [value]="search()"
            (input)="setSearch($any($event.target).value)"
          />
        </label>
        <label>
          <span>Sort by</span>
          <select [value]="sort()" (change)="setSort($any($event.target).value)">
            <option value="priority">Practice priority</option>
            <option value="score">Lowest average score</option>
            <option value="rounds">Most rounds</option>
            <option value="country">Country name</option>
          </select>
        </label>
      </div>

      @if (countries().length === 0) {
        <section class="analytics-state compact">
          <h2>No matching countries</h2>
          <p>Try a different country name or code.</p>
        </section>
      } @else {
        <div class="table-wrap country-table-wrap">
          <table class="country-table">
            <caption>
              Country performance. Activate a row to view its metrics and recent rounds.
            </caption>
            <thead>
              <tr>
                <th scope="col">Country</th>
                <th scope="col">Recognition</th>
                <th scope="col">Average score</th>
                <th scope="col">Rounds</th>
                <th scope="col">Trend</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (country of countries(); track country.countryCode) {
                <tr
                  class="country-row"
                  tabindex="0"
                  role="link"
                  [attr.aria-label]="'View details for ' + (country.countryCode | countryName)"
                  (click)="openCountry(country.countryCode)"
                  (keydown.enter)="openCountry(country.countryCode)"
                  (keydown.space)="openCountryFromKeyboard($event, country.countryCode)"
                >
                  <th scope="row">{{ country.countryCode | countryName }}</th>
                  <td>{{ country.performance.recognitionAccuracy | percent: '1.0-0' }}</td>
                  <td>{{ country.performance.averageScore | number: '1.0-0' }}</td>
                  <td>{{ country.performance.rounds }}</td>
                  <td>
                    <span class="trend" [class]="country.trend.direction">{{
                      trendLabel(country.trend.direction)
                    }}</span>
                  </td>
                  <td>{{ country.recommendation.priority | number: '1.2-2' }}</td>
                  <td>
                    <span
                      class="status-pill"
                      [class.strong]="country.recommendation.strength === 'strong'"
                      >{{ statusLabel(country) }}</span
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styleUrl: './countries-page.component.scss',
})
export class CountriesPageComponent {
  protected readonly analytics = inject(AnalyticsDataService);
  private readonly router = inject(Router);
  protected readonly search = signal('');
  protected readonly sort = signal<CountrySort>('priority');
  protected readonly countries = computed(() =>
    sortCountries(this.analytics.model().countries, this.search(), this.sort(), (countryCode) =>
      countryNameForSearch(countryCode),
    ),
  );

  protected setSearch(value: string): void {
    this.search.set(value);
  }

  protected refresh(): void {
    void this.analytics.refresh();
  }

  protected setSort(value: string): void {
    if (value === 'country' || value === 'priority' || value === 'rounds' || value === 'score') {
      this.sort.set(value);
    }
  }

  protected openCountry(countryCode: string): void {
    void this.router.navigate(['/countries', countryCode]);
  }

  protected openCountryFromKeyboard(event: Event, countryCode: string): void {
    event.preventDefault();
    this.openCountry(countryCode);
  }

  protected trendLabel(direction: CountryAnalyticsQuery['trend']['direction']): string {
    return {
      declining: 'Declining',
      improving: 'Improving',
      neutral: 'Stable',
      unavailable: 'Not enough data',
    }[direction];
  }

  protected statusLabel(country: CountryAnalyticsQuery): string {
    return country.recommendation.strength === 'strong'
      ? 'Practice now'
      : country.status.replace('-', ' ');
  }
}

export function sortCountries(
  countries: readonly CountryAnalyticsQuery[],
  search: string,
  sort: CountrySort,
  countryName: (countryCode: string) => string,
): readonly CountryAnalyticsQuery[] {
  const searchTerm = search.trim().toLocaleLowerCase();

  return countries
    .filter((country) => {
      const name = countryName(country.countryCode).toLocaleLowerCase();
      return (
        !searchTerm ||
        name.includes(searchTerm) ||
        country.countryCode.toLocaleLowerCase().includes(searchTerm)
      );
    })
    .sort((left, right) => {
      if (sort === 'score') {
        return (
          left.performance.averageScore - right.performance.averageScore ||
          countryName(left.countryCode).localeCompare(countryName(right.countryCode))
        );
      }
      if (sort === 'rounds') {
        return (
          right.performance.rounds - left.performance.rounds ||
          countryName(left.countryCode).localeCompare(countryName(right.countryCode))
        );
      }
      if (sort === 'country') {
        return countryName(left.countryCode).localeCompare(countryName(right.countryCode));
      }
      return (
        right.recommendation.priority - left.recommendation.priority ||
        countryName(left.countryCode).localeCompare(countryName(right.countryCode))
      );
    });
}

function countryNameForSearch(countryCode: string): string {
  return new CountryNamePipe().transform(countryCode);
}
