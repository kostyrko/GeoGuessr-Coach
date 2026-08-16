import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AnalyticsDataService } from '../core/analytics/analytics-data.service';
import { CountryNamePipe } from '../shared/country-name.pipe';

@Component({
  selector: 'app-country-detail-page',
  imports: [CountryNamePipe, DatePipe, DecimalPipe, PercentPipe, RouterLink],
  template: `
    @if (analytics.state() === 'loading') {
      <section class="analytics-state" aria-live="polite">
        <h1>Loading country details…</h1>
      </section>
    } @else if (analytics.state() === 'error') {
      <section class="analytics-state error-state" role="alert">
        <h1>Country details could not be loaded</h1>
        <button type="button" (click)="refresh()">Try again</button>
      </section>
    } @else if (!detail()) {
      <section class="analytics-state">
        <h1>Country not found</h1>
        <p>This country has no saved, resolved rounds yet.</p>
        <a routerLink="/countries">Back to Countries</a>
      </section>
    } @else {
      <section class="page-header detail-header" aria-labelledby="country-title">
        <p class="eyebrow">Country performance</p>
        <div>
          <h1 id="country-title">{{ detail()!.countryCode | countryName }}</h1>
          <span
            class="status-pill"
            [class.strong]="detail()!.recommendation.strength === 'strong'"
            >{{
              detail()!.recommendation.strength === 'strong'
                ? 'Practice priority: high'
                : statusLabel()
            }}</span
          >
        </div>
        @if (detail()!.recommendation.isEligibleForStrongRecommendation) {
          <button type="button" disabled aria-describedby="practice-note">
            Practice {{ detail()!.countryCode | countryName }}
          </button>
          <p id="practice-note" class="button-note">
            Practice launching will be added after a verified GeoGuessr destination is approved.
          </p>
        }
      </section>

      @if (analytics.model().state === 'insufficient-data') {
        <p class="insufficient-note" role="status">
          This country has early results only. Coaching remains cautious until its sample grows.
        </p>
      }

      <section class="detail-grid" aria-label="Country metrics">
        <article class="card metrics-card">
          <h2>Performance</h2>
          <dl class="metric-list">
            <div>
              <dt>Recognition</dt>
              <dd>{{ detail()!.performance.recognitionAccuracy | percent: '1.0-0' }}</dd>
            </div>
            <div>
              <dt>Average score</dt>
              <dd>{{ detail()!.performance.averageScore | number: '1.0-0' }}</dd>
            </div>
            <div>
              <dt>Median score</dt>
              <dd>{{ detail()!.performance.medianScore | number: '1.0-0' }}</dd>
            </div>
            <div>
              <dt>Rounds</dt>
              <dd>{{ detail()!.performance.rounds }}</dd>
            </div>
            <div>
              <dt>Average distance</dt>
              <dd>
                {{ detail()!.performance.averageDistanceInMeters / 1000 | number: '1.0-0' }} km
              </dd>
            </div>
            <div>
              <dt>Best score</dt>
              <dd>{{ detail()!.performance.bestScore | number: '1.0-0' }}</dd>
            </div>
          </dl>
        </article>
        <article class="card insight-card">
          <h2>Confidence and trend</h2>
          <p>
            <strong>{{ detail()!.confidence.replace('-', ' ') }}</strong> confidence from
            {{ detail()!.performance.rounds }} rounds.
          </p>
          <p>
            <strong>{{ trendLabel() }}</strong> trend.
          </p>
          @if (detail()!.trend.recent && detail()!.trend.baseline) {
            <p class="muted">
              Recent average score {{ detail()!.trend.recent!.averageScore | number: '1.0-0' }} vs.
              {{ detail()!.trend.baseline!.averageScore | number: '1.0-0' }} baseline.
            </p>
          }
        </article>
        <article class="card confusion-card">
          <h2>Common incorrect guesses</h2>
          @if (detail()!.confusion.pairs.length === 0) {
            <p>No resolved incorrect country guesses for this country yet.</p>
          } @else {
            <ol class="confusion-list">
              @for (pair of detail()!.confusion.pairs; track pair.guessedCountryCode) {
                <li>
                  <span>{{ pair.guessedCountryCode | countryName }}</span
                  ><strong>{{ pair.percentageOfIncorrectGuesses | percent: '1.0-0' }}</strong
                  ><small>{{ pair.count }} {{ pair.count === 1 ? 'round' : 'rounds' }}</small>
                </li>
              }
            </ol>
          }
        </article>
      </section>

      <section class="card recent-rounds" aria-labelledby="recent-rounds-title">
        <h2 id="recent-rounds-title">Recent rounds</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Guess</th>
                <th scope="col">Score</th>
                <th scope="col">Distance</th>
              </tr>
            </thead>
            <tbody>
              @for (round of detail()!.recentRounds; track round.id) {
                <tr>
                  <td>{{ round.sourceStartedAt | date: 'mediumDate' }}</td>
                  <td>{{ round.guessedCountryCode | countryName }}</td>
                  <td>{{ round.score | number }}</td>
                  <td>{{ round.distanceInMeters / 1000 | number: '1.0-1' }} km</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
  styleUrl: './countries-page.component.scss',
})
export class CountryDetailPageComponent {
  protected readonly analytics = inject(AnalyticsDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly countryCode = signal(
    this.route.snapshot.paramMap.get('countryCode')?.toUpperCase() ?? '',
  );
  protected readonly detail = computed(() =>
    this.analytics.model().countryDetails.get(this.countryCode()),
  );

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.countryCode.set(params.get('countryCode')?.toUpperCase() ?? '');
    });
  }

  protected refresh(): void {
    void this.analytics.refresh();
  }

  protected trendLabel(): string {
    return this.detail()?.trend.direction === 'unavailable'
      ? 'Not enough data for a stable'
      : (this.detail()?.trend.direction ?? 'Unknown');
  }

  protected statusLabel(): string {
    return this.detail()?.status.replace('-', ' ') ?? 'Insufficient data';
  }
}
