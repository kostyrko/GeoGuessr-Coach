import Dexie from 'dexie';

import type { CaptureLifecycleEvent } from '../capture/capture-lifecycle';
import type {
  BackupDocument,
  GameRecord,
  NormalizedGameCapture,
  RoundRecord,
  SettingsRecord,
} from '../domain/game-model';
import { GAME_SCHEMA_VERSION } from '../domain/game-model';

import {
  CoachDatabase,
  DATABASE_SCHEMA_VERSION,
  type SchemaMetadataRecord,
} from './coach-database';

export class GameRepository {
  constructor(private readonly database: CoachDatabase) {}

  async saveCapture(capture: NormalizedGameCapture): Promise<void> {
    await this.database.transaction('rw', this.database.games, this.database.rounds, async () => {
      await this.database.games.put(capture.game);
      await this.database.rounds.bulkPut([...capture.rounds]);
    });
  }

  /**
   * Atomically creates a game and its rounds once. The deterministic game ID is
   * the deduplication key across repeated messages and service-worker restarts.
   */
  async saveCaptureIfAbsent(capture: NormalizedGameCapture): Promise<'duplicate' | 'stored'> {
    return this.database.transaction('rw', this.database.games, this.database.rounds, async () => {
      if (await this.database.games.get(capture.game.id)) {
        return 'duplicate';
      }

      await this.database.games.put(capture.game);
      await this.database.rounds.bulkPut([...capture.rounds]);
      return 'stored';
    });
  }

  async getGame(id: string): Promise<GameRecord | undefined> {
    return this.database.games.get(id);
  }

  async getGames(): Promise<GameRecord[]> {
    return this.database.games.orderBy('playedAt').reverse().toArray();
  }

  async getRounds(): Promise<RoundRecord[]> {
    return this.database.rounds.toArray();
  }

  async getRoundsForGame(gameId: string): Promise<RoundRecord[]> {
    const rounds = await this.database.rounds.where('gameId').equals(gameId).toArray();
    return rounds.sort((left, right) => left.roundNumber - right.roundNumber);
  }

  async getRoundsForActualCountry(countryCode: string): Promise<RoundRecord[]> {
    return this.database.rounds
      .where('[actualCountryCode+sourceStartedAt]')
      .between([countryCode, Dexie.minKey], [countryCode, Dexie.maxKey])
      .toArray();
  }

  async getRoundsStartedBetween(start: string, end: string): Promise<RoundRecord[]> {
    return this.database.rounds.where('sourceStartedAt').between(start, end, true, true).toArray();
  }

  async getSettings(): Promise<SettingsRecord> {
    return (
      (await this.database.settings.get('settings')) ?? {
        id: 'settings',
        schemaVersion: GAME_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  async saveSettings(settings: SettingsRecord): Promise<void> {
    await this.database.settings.put(settings);
  }

  async recordCaptureEvent(event: CaptureLifecycleEvent): Promise<void> {
    await this.database.captureEvents.put(event);
  }

  async getLatestFailedCaptureEvent(): Promise<CaptureLifecycleEvent | undefined> {
    const failedEvents = await this.database.captureEvents
      .where('status')
      .equals('failed')
      .toArray();
    return failedEvents.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))[0];
  }

  async getSchemaMetadata(): Promise<SchemaMetadataRecord> {
    return (
      (await this.database.metadata.get('schema')) ?? {
        id: 'schema',
        updatedAt: new Date().toISOString(),
        version: DATABASE_SCHEMA_VERSION,
      }
    );
  }

  async exportNormalizedData(exportedAt = new Date().toISOString()): Promise<BackupDocument> {
    const [games, rounds, settings, captureEvents] = await Promise.all([
      this.getGames(),
      this.database.rounds.toArray(),
      this.getSettings(),
      this.database.captureEvents.toArray(),
    ]);

    return {
      captureEvents,
      exportedAt,
      format: 'geoguessr-coach-backup',
      games,
      rounds,
      schemaVersion: GAME_SCHEMA_VERSION,
      settings,
    };
  }

  async deleteAllGameplayData(): Promise<void> {
    await this.database.transaction('rw', this.database.games, this.database.rounds, async () => {
      await this.database.games.clear();
      await this.database.rounds.clear();
    });
  }
}
