import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { HistoryDataService, type HistoryGame } from '../core/storage/history-data.service';

@Component({
  selector: 'app-history-page',
  imports: [DatePipe, DecimalPipe],
  template: `
    <section class="page-header" aria-labelledby="history-title">
      <p class="eyebrow">Local gameplay data</p>
      <h1 id="history-title">History</h1>
      <p>Inspect the completed games GeoGuessr Coach has saved on this device.</p>
    </section>

    @if (state() === 'loading') {
      <section class="history-state" aria-live="polite">
        <span aria-hidden="true">◌</span>
        <h2>Loading saved games…</h2>
        <p>Reading your local gameplay history.</p>
      </section>
    } @else if (state() === 'error') {
      <section class="history-state error-state" role="alert">
        <span aria-hidden="true">!</span>
        <h2>History could not be loaded</h2>
        <p>Your local data was not changed. Try loading the page again.</p>
        <button type="button" (click)="load()">Try again</button>
      </section>
    } @else if (games().length === 0) {
      <section class="history-state">
        <span aria-hidden="true">◌</span>
        <h2>No games analyzed yet</h2>
        <p>Play a supported GeoGuessr game. Completed rounds will appear here automatically.</p>
        @if (failedReason()) {
          <p class="failure-note"><strong>Latest capture issue:</strong> {{ failedReason() }}</p>
        }
      </section>
    } @else {
      <p class="history-count" aria-live="polite">
        {{ games().length }} saved {{ games().length === 1 ? 'game' : 'games' }}
      </p>
      <section class="history-list" aria-label="Saved games">
        @for (entry of games(); track entry.game.id) {
          <details class="game-card" open>
            <summary>
              <span
                ><strong>{{ entry.game.mapName ?? 'Unknown map' }}</strong
                ><small
                  >{{ entry.game.playedAt | date: 'medium' }} ·
                  {{ entry.rounds.length }} rounds</small
                ></span
              ><span class="game-score">{{ entry.game.totalScore ?? '—' | number }} pts</span>
            </summary>
            <div class="table-wrap">
              <table>
                <caption>
                  Round details for
                  {{
                    entry.game.mapName ?? 'this game'
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Round</th>
                    <th scope="col">Actual</th>
                    <th scope="col">Guess</th>
                    <th scope="col">Score</th>
                    <th scope="col">Distance</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  @for (round of entry.rounds; track round.id) {
                    <tr>
                      <th scope="row">{{ round.roundNumber }}</th>
                      <td>{{ round.actualCountryCode ?? 'Unresolved' }}</td>
                      <td>{{ round.guessedCountryCode ?? 'Unresolved' }}</td>
                      <td>{{ round.score | number }}</td>
                      <td>{{ round.distanceInMeters / 1000 | number: '1.1-1' }} km</td>
                      <td>{{ round.durationSeconds | number }} s</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </details>
        }
      </section>
    }
  `,
  styleUrl: './history-page.component.scss',
})
export class HistoryPageComponent implements OnInit {
  private readonly historyData = inject(HistoryDataService);

  protected readonly failedReason = signal<string | undefined>(undefined);
  protected readonly games = signal<readonly HistoryGame[]>([]);
  protected readonly state = signal<'error' | 'loaded' | 'loading'>('loading');

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      const history = await this.historyData.load();
      this.games.set(history.games);
      this.failedReason.set(history.failedCapture?.reason);
      this.state.set('loaded');
    } catch {
      this.state.set('error');
    }
  }
}
