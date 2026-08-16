import { DecimalPipe, PercentPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalyticsDataService } from '../core/analytics/analytics-data.service';
import { CountryNamePipe } from '../shared/country-name.pipe';

@Component({
  selector: 'app-practice-page',
  imports: [CountryNamePipe, DecimalPipe, PercentPipe, RouterLink],
  template: `
    <section class="page-header" aria-labelledby="practice-title">
      <p class="eyebrow">Coaching</p>
      <h1 id="practice-title">Practice</h1>
      <p>A transparent, local queue based only on your completed rounds.</p>
    </section>
    @if (analytics.state() === 'loading') {
      <section class="practice-state" aria-live="polite"><h2>Building practice queue…</h2></section>
    } @else if (analytics.state() === 'error') {
      <section class="practice-state error-state" role="alert">
        <h2>Practice queue could not be loaded</h2>
        <button type="button" (click)="refresh()">Try again</button>
      </section>
    } @else if (analytics.model().state === 'empty') {
      <section class="practice-state">
        <h2>No practice queue yet</h2>
        <p>Finish a supported game to begin collecting private, local performance data.</p>
      </section>
    } @else {
      @if (analytics.model().practice.strongItems[0]; as recommendation) {
        <section class="practice-hero card" aria-labelledby="recommendation-title">
          <p class="card-label">Your next practice</p>
          <h2 id="recommendation-title">{{ recommendation.countryCode | countryName }}</h2>
          <p>
            Recognition {{ recommendation.explanation.recognitionAccuracy | percent: '1.0-0' }} ·
            Average score {{ recommendation.explanation.averageScore | number: '1.0-0' }} ·
            {{ recommendation.explanation.confidence }} confidence
          </p>
          @if (recommendation.explanation.primaryConfusion; as confusion) {
            <p class="reason">
              Most often confused with
              <strong>{{ confusion.guessedCountryCode | countryName }}</strong> ({{
                confusion.percentageOfIncorrectGuesses | percent: '1.0-0'
              }}
              of incorrect guesses).
            </p>
          }
          <button type="button" disabled aria-describedby="practice-destination-note">
            Practice {{ recommendation.countryCode | countryName }}</button
          ><small id="practice-destination-note"
            >A verified GeoGuessr practice destination has not been selected yet.</small
          >
        </section>
      } @else {
        <section class="practice-state">
          <h2>Not enough data for a strong recommendation</h2>
          <p>
            Early patterns are shown below, but GeoGuessr Coach will wait for a reliable country
            sample before telling you what to practice.
          </p>
        </section>
      }
      <section class="card queue-card" aria-labelledby="queue-title">
        <p class="card-label">Practice queue</p>
        <h2 id="queue-title">Country signals</h2>
        <ol class="practice-list">
          @for (
            item of analytics.model().practice.items;
            track item.countryCode;
            let index = $index
          ) {
            <li>
              <span class="rank">{{ index + 1 }}</span
              ><a [routerLink]="['/countries', item.countryCode]">{{
                item.countryCode | countryName
              }}</a
              ><span
                >{{ item.explanation.recognitionAccuracy | percent: '1.0-0' }} recognition ·
                {{ item.explanation.averageScore | number: '1.0-0' }} avg.</span
              ><strong>{{ item.strength === 'strong' ? 'Practice now' : 'Early signal' }}</strong>
            </li>
          }
        </ol>
      </section>
    }
  `,
  styleUrl: './practice-page.component.scss',
})
export class PracticePageComponent {
  protected readonly analytics = inject(AnalyticsDataService);
  protected refresh(): void {
    void this.analytics.refresh();
  }
}
