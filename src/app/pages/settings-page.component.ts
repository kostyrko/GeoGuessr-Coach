import { Component, inject, signal } from '@angular/core';

import { AnalyticsDataService } from '../core/analytics/analytics-data.service';
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
}
