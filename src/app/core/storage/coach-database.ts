import Dexie, { type Table } from 'dexie';

import type { CaptureLifecycleEvent } from '../capture/capture-lifecycle';
import type { GameRecord, RoundRecord, SettingsRecord } from '../domain/game-model';

export const DATABASE_SCHEMA_VERSION = 2;

export interface SchemaMetadataRecord {
  id: 'schema';
  updatedAt: string;
  version: number;
}

/**
 * Local-only IndexedDB schema. Every table contains normalized application
 * records; collector payloads are deliberately excluded from this boundary.
 */
export class CoachDatabase extends Dexie {
  captureEvents!: Table<CaptureLifecycleEvent, string>;
  games!: Table<GameRecord, string>;
  metadata!: Table<SchemaMetadataRecord, 'schema'>;
  rounds!: Table<RoundRecord, string>;
  settings!: Table<SettingsRecord, 'settings'>;

  constructor(name = 'geoguessr-coach') {
    super(name);

    this.version(1).stores({
      games: 'id, playedAt, mode, source, mapId',
      metadata: 'id',
      rounds:
        'id, gameId, roundNumber, actualCountryCode, guessedCountryCode, sourceStartedAt, [actualCountryCode+sourceStartedAt], [guessedCountryCode+sourceStartedAt]',
      settings: 'id',
    });

    this.version(DATABASE_SCHEMA_VERSION)
      .stores({
        captureEvents: 'occurredAt, status, source, supportedMode',
        games: 'id, playedAt, mode, source, mapId',
        metadata: 'id',
        rounds:
          'id, gameId, roundNumber, actualCountryCode, guessedCountryCode, sourceStartedAt, [actualCountryCode+sourceStartedAt], [guessedCountryCode+sourceStartedAt]',
        settings: 'id',
      })
      .upgrade((transaction) =>
        transaction.table('metadata').put({
          id: 'schema',
          updatedAt: new Date().toISOString(),
          version: DATABASE_SCHEMA_VERSION,
        } satisfies SchemaMetadataRecord),
      );
  }
}
