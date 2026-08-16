import { Component, inject, signal } from '@angular/core';

import { AnalyticsDataService } from '../core/analytics/analytics-data.service';
import { toRoundCsv, toRoundGeoJson } from '../core/export/data-portability';
import { CoachDatabase } from '../core/storage/coach-database';
import { GameRepository } from '../core/storage/game-repository';

declare const chrome: {
  runtime: {
    sendMessage(
      message: unknown,
      callback: (response: HistoricalImportResponse | undefined) => void,
    ): void;
  };
};

interface HistoricalImportResponse {
  error?: string;
  result?: {
    available: number;
    duplicates: number;
    failed: number;
    imported: number;
    invalid: number;
    requested: number;
  };
}

@Component({
  selector: 'app-settings-page',
  template: `
    <section class="page-header" aria-labelledby="settings-title">
      <p class="eyebrow">Local-first controls</p>
      <h1 id="settings-title">Settings</h1>
      <p>Control the data stored by GeoGuessr Coach on this browser.</p>
    </section>
    <section class="settings-grid">
      <article class="card">
        <p class="card-label">Privacy</p>
        <h2>Your data stays on this device</h2>
        <ul>
          <li>No account is required.</li>
          <li>No cloud database or analytics tracking is used.</li>
          <li>Only supported, completed GeoGuessr rounds are collected.</li>
          <li>Export and restore will be added in the backup ticket.</li>
        </ul>
      </article>
      <article class="card">
        <p class="card-label">Historical Daily Challenge Free</p>
        <h2>Import the last 90 days</h2>
        <p>
          On request, GeoGuessr Coach checks the last 90 Daily Challenge Free dates and saves only
          completed games that match your signed-in account. It never runs in the background.
        </p>
        <p class="import-note">
          Before importing, open or refresh any GeoGuessr page while signed in. A temporary
          browser-session identifier is used only to exclude other leaderboard players.
        </p>
        <button type="button" [disabled]="importingHistory()" (click)="importRecentHistory()">
          {{ importingHistory() ? 'Importing up to 90 days…' : 'Import last 90 days' }}
        </button>
        @if (historicalImportMessage()) {
          <p class="deletion-message" role="status">{{ historicalImportMessage() }}</p>
        }
      </article>
      <article class="card">
        <p class="card-label">Backup and export</p>
        <h2>Keep a local copy</h2>
        <div class="export-actions">
          <button type="button" (click)="exportJson()">Download JSON backup</button
          ><button type="button" (click)="exportCsv()">Download round CSV</button
          ><button type="button" (click)="exportGeoJson()">Download GeoJSON</button
          ><label
            >Restore JSON backup
            <input
              type="file"
              accept="application/json,.json"
              (change)="importJson($any($event.target).files?.[0])"
          /></label>
        </div>
        @if (transferMessage()) {
          <p class="deletion-message" role="status">{{ transferMessage() }}</p>
        }
      </article>
      <article class="card danger-card">
        <p class="card-label">Data management</p>
        <h2>Delete local gameplay data</h2>
        <p>
          This removes saved games, rounds, and capture-status history from this browser. It cannot
          be undone.
        </p>
        @if (confirming()) {
          <label class="confirm-label"
            >Type <strong>DELETE</strong> to confirm
            <input
              [value]="confirmationText()"
              (input)="setConfirmation($any($event.target).value)"
          /></label>
          <div class="danger-actions">
            <button type="button" (click)="cancelDelete()">Cancel</button
            ><button
              type="button"
              class="delete-button"
              [disabled]="confirmationText() !== 'DELETE' || deleting()"
              (click)="deleteData()"
            >
              {{ deleting() ? 'Deleting…' : 'Delete all local data' }}
            </button>
          </div>
        } @else {
          <button type="button" class="delete-button" (click)="beginDelete()">
            Delete local gameplay data
          </button>
        }
        @if (message()) {
          <p class="deletion-message" role="status">{{ message() }}</p>
        }
      </article>
    </section>
  `,
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  private readonly database = new CoachDatabase();
  private readonly repository = new GameRepository(this.database);
  private readonly analytics = inject(AnalyticsDataService);
  protected readonly confirmationText = signal('');
  protected readonly confirming = signal(false);
  protected readonly deleting = signal(false);
  protected readonly message = signal('');
  protected readonly transferMessage = signal('');
  protected readonly historicalImportMessage = signal('');
  protected readonly importingHistory = signal(false);
  protected beginDelete(): void {
    this.confirming.set(true);
    this.message.set('');
  }
  protected cancelDelete(): void {
    this.confirming.set(false);
    this.confirmationText.set('');
  }
  protected setConfirmation(value: string): void {
    this.confirmationText.set(value);
  }
  protected async deleteData(): Promise<void> {
    if (this.confirmationText() !== 'DELETE') return;
    this.deleting.set(true);
    try {
      await this.database.open();
      await this.repository.deleteAllGameplayData();
      await this.analytics.refresh();
      this.message.set('All local gameplay data was deleted.');
      this.cancelDelete();
    } catch {
      this.message.set('Local data could not be deleted. Nothing else was changed.');
    } finally {
      this.deleting.set(false);
    }
  }
  protected async exportJson(): Promise<void> {
    await this.database.open();
    download(
      'geoguessr-coach-backup.json',
      JSON.stringify(await this.repository.exportNormalizedData(), null, 2),
      'application/json',
    );
  }
  protected async exportCsv(): Promise<void> {
    await this.database.open();
    const backup = await this.repository.exportNormalizedData();
    download('geoguessr-coach-rounds.csv', toRoundCsv(backup.games, backup.rounds), 'text/csv');
  }
  protected async exportGeoJson(): Promise<void> {
    await this.database.open();
    const backup = await this.repository.exportNormalizedData();
    download(
      'geoguessr-coach-rounds.geojson',
      JSON.stringify(toRoundGeoJson(backup.games, backup.rounds)),
      'application/geo+json',
    );
  }
  protected async importJson(file: File | undefined): Promise<void> {
    if (!file) return;
    try {
      await this.repository.importNormalizedData(JSON.parse(await file.text()));
      await this.analytics.refresh();
      this.transferMessage.set('Backup restored successfully.');
    } catch (error) {
      this.transferMessage.set(
        error instanceof Error ? error.message : 'Backup could not be restored.',
      );
    }
  }
  protected async importRecentHistory(): Promise<void> {
    this.importingHistory.set(true);
    this.historicalImportMessage.set('');
    try {
      const response = await requestHistoricalImport();
      if (response?.error) {
        this.historicalImportMessage.set(response.error);
        return;
      }
      const result = response?.result;
      if (!result) {
        this.historicalImportMessage.set('Historical import did not return a result. Try again.');
        return;
      }
      await this.analytics.refresh();
      this.historicalImportMessage.set(
        `Checked ${result.requested} days: ${result.imported} imported, ${result.duplicates} already saved, ${result.available - result.imported - result.duplicates} unavailable, ${result.invalid} invalid, ${result.failed} failed.`,
      );
    } catch {
      this.historicalImportMessage.set(
        'Historical import could not be completed. Try again later.',
      );
    } finally {
      this.importingHistory.set(false);
    }
  }
}

function requestHistoricalImport(): Promise<HistoricalImportResponse | undefined> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'geoguessr-coach:import-recent-daily-challenges' }, resolve);
  });
}

function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
