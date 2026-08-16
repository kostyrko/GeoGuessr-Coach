import { Injectable } from '@angular/core';

import type { CaptureLifecycleEvent } from '../capture/capture-lifecycle';
import type { GameRecord, RoundRecord } from '../domain/game-model';

import { CoachDatabase } from './coach-database';
import { GameRepository } from './game-repository';

export interface HistoryGame {
  game: GameRecord;
  rounds: readonly RoundRecord[];
}

export interface HistoryData {
  failedCapture?: CaptureLifecycleEvent;
  games: readonly HistoryGame[];
}

@Injectable({ providedIn: 'root' })
export class HistoryDataService {
  private readonly database = new CoachDatabase();
  private readonly repository = new GameRepository(this.database);

  async load(): Promise<HistoryData> {
    await this.database.open();
    const games = await this.repository.getGames();
    const historyGames = await Promise.all(
      games.map(async (game) => ({
        game,
        rounds: await this.repository.getRoundsForGame(game.id),
      })),
    );

    return {
      failedCapture: await this.repository.getLatestFailedCaptureEvent(),
      games: historyGames,
    };
  }
}
