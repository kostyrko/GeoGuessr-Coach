import { Component, inject, signal } from '@angular/core';

import { AnalyticsDataService } from '../core/analytics/analytics-data.service';
import { toRoundCsv, toRoundGeoJson } from '../core/export/data-portability';
import { CoachDatabase } from '../core/storage/coach-database';
import { GameRepository } from '../core/storage/game-repository';

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
}

function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
