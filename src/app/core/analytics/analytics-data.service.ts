import { Injectable, signal } from '@angular/core';
import { liveQuery, type Subscription } from 'dexie';

import { CoachDatabase } from '../storage/coach-database';
import { GameRepository } from '../storage/game-repository';

import { createAnalyticsQueryModel, type AnalyticsQueryModel } from './analytics-query';

@Injectable({ providedIn: 'root' })
export class AnalyticsDataService {
  private readonly database = new CoachDatabase();
  private readonly repository = new GameRepository(this.database);
  private subscription?: Subscription;

  readonly error = signal<unknown>(undefined);
  readonly model = signal<AnalyticsQueryModel>(
    createAnalyticsQueryModel([], new Date().toISOString()),
  );
  readonly state = signal<'error' | 'loading' | 'loaded'>('loading');

  constructor() {
    void this.watch();
  }

  async refresh(): Promise<void> {
    await this.database.open();
    this.model.set(
      createAnalyticsQueryModel(await this.repository.getRounds(), new Date().toISOString()),
    );
  }

  private async watch(): Promise<void> {
    try {
      await this.database.open();
      this.subscription = liveQuery(() => this.repository.getRounds()).subscribe({
        error: (error) => {
          this.error.set(error);
          this.state.set('error');
        },
        next: (rounds) => {
          this.model.set(createAnalyticsQueryModel(rounds, new Date().toISOString()));
          this.error.set(undefined);
          this.state.set('loaded');
        },
      });
    } catch (error) {
      this.error.set(error);
      this.state.set('error');
    }
  }
}
