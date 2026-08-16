import Dexie, { type Table } from 'dexie';

import type { CaptureLifecycleEvent } from '../capture/capture-lifecycle';
import type { GameRecord, RoundRecord, SettingsRecord } from '../domain/game-model';

export const DATABASE_SCHEMA_VERSION = 3;

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

    this.version(2)
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
          version: 2,
        } satisfies SchemaMetadataRecord),
      );

    this.version(DATABASE_SCHEMA_VERSION)
      .stores({
        captureEvents: 'occurredAt, status, source, supportedMode',
        games: 'id, playedAt, mode, source, mapId',
        metadata: 'id',
        rounds:
          'id, gameId, roundNumber, actualCountryCode, guessedCountryCode, sourceStartedAt, [actualCountryCode+sourceStartedAt], [guessedCountryCode+sourceStartedAt]',
        settings: 'id',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('games')
          .toCollection()
          .modify((game: Record<string, unknown>) => {
            const normalizedScore = normalizeLegacyTotalScore(game['totalScore']);

            if (normalizedScore === undefined) {
              delete game['totalScore'];
              return;
            }

            game['totalScore'] = normalizedScore;
          });

        await transaction.table('metadata').put({
          id: 'schema',
          updatedAt: new Date().toISOString(),
          version: DATABASE_SCHEMA_VERSION,
        } satisfies SchemaMetadataRecord);
      });
  }
}

function normalizeLegacyTotalScore(value: unknown): number | undefined {
  const candidate =
    typeof value === 'object' && value !== null && 'amount' in value
      ? (value as { amount?: unknown }).amount
      : value;
  const numericValue = typeof candidate === 'string' ? Number(candidate) : candidate;

  return typeof numericValue === 'number' && Number.isFinite(numericValue)
    ? numericValue
    : undefined;
}
