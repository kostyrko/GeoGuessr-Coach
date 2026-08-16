import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

import expectedParserInputFixture from '../capture/fixtures/daily-challenge-free.expected-parser-input.json';
import type { NormalizedParserInput } from '../capture/capture-contract';
import { toNormalizedGameCapture } from '../domain/game-model';

import { CoachDatabase, DATABASE_SCHEMA_VERSION } from './coach-database';
import { GameRepository } from './game-repository';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

describe('GameRepository', () => {
  let databaseName: string;
  let database: CoachDatabase;
  let repository: GameRepository;

  beforeEach(() => {
    databaseName = `geoguessr-coach-test-${crypto.randomUUID()}`;
    database = new CoachDatabase(databaseName);
    repository = new GameRepository(database);
  });

  afterEach(async () => {
    database.close();
    await Dexie.delete(databaseName);
  });

  it('persists only normalized records across database instances', async () => {
    const capture = toNormalizedGameCapture(expectedParserInputFixture as NormalizedParserInput);
    await repository.saveCapture(capture);
    await repository.saveSettings({
      id: 'settings',
      schemaVersion: 1,
      updatedAt: '2030-01-02T04:00:00.000Z',
    });
    database.close();

    database = new CoachDatabase(databaseName);
    repository = new GameRepository(database);

    await expect(repository.getGame(capture.game.id)).resolves.toEqual(capture.game);
    await expect(repository.getRoundsForGame(capture.game.id)).resolves.toEqual(capture.rounds);
    await expect(repository.getSettings()).resolves.toMatchObject({
      id: 'settings',
      updatedAt: '2030-01-02T04:00:00.000Z',
    });
  });

  it('supports indexed country and date queries', async () => {
    const capture = toNormalizedGameCapture(expectedParserInputFixture as NormalizedParserInput);
    const rounds = capture.rounds.map((round, index) => ({
      ...round,
      actualCountryCode: index === 0 ? 'BWA' : 'ZAF',
      sourceStartedAt: `2030-01-0${index + 1}T03:00:00.000Z`,
    }));
    await repository.saveCapture({ ...capture, rounds });

    await expect(repository.getRoundsForActualCountry('BWA')).resolves.toHaveLength(1);
    await expect(
      repository.getRoundsStartedBetween('2030-01-02T00:00:00.000Z', '2030-01-03T23:59:59.999Z'),
    ).resolves.toHaveLength(2);
  });

  it('migrates a v1 database without losing normalized gameplay records', async () => {
    const capture = toNormalizedGameCapture(expectedParserInputFixture as NormalizedParserInput);
    const legacy = new Dexie(databaseName);
    legacy.version(1).stores({
      games: 'id, playedAt, mode, source, mapId',
      metadata: 'id',
      rounds:
        'id, gameId, roundNumber, actualCountryCode, guessedCountryCode, sourceStartedAt, [actualCountryCode+sourceStartedAt], [guessedCountryCode+sourceStartedAt]',
      settings: 'id',
    });
    await legacy.open();
    await legacy.table('games').put(capture.game);
    await legacy.table('rounds').bulkPut(capture.rounds);
    legacy.close();

    await expect(repository.getGame(capture.game.id)).resolves.toEqual(capture.game);
    await expect(repository.getRoundsForGame(capture.game.id)).resolves.toEqual(capture.rounds);
    await expect(repository.getSchemaMetadata()).resolves.toMatchObject({
      id: 'schema',
      version: DATABASE_SCHEMA_VERSION,
    });
  });

  it('migrates legacy total-score amount objects to numeric normalized values', async () => {
    const capture = toNormalizedGameCapture(expectedParserInputFixture as NormalizedParserInput);
    const legacy = new Dexie(databaseName);
    legacy.version(2).stores({
      captureEvents: 'occurredAt, status, source, supportedMode',
      games: 'id, playedAt, mode, source, mapId',
      metadata: 'id',
      rounds:
        'id, gameId, roundNumber, actualCountryCode, guessedCountryCode, sourceStartedAt, [actualCountryCode+sourceStartedAt], [guessedCountryCode+sourceStartedAt]',
      settings: 'id',
    });
    await legacy.open();
    await legacy.table('games').put({ ...capture.game, totalScore: { amount: '19651' } });
    legacy.close();

    await expect(repository.getGame(capture.game.id)).resolves.toMatchObject({ totalScore: 19651 });
    await expect(repository.getSchemaMetadata()).resolves.toMatchObject({
      version: DATABASE_SCHEMA_VERSION,
    });
  });

  it('deletes games, rounds, and capture lifecycle records together', async () => {
    const capture = toNormalizedGameCapture(expectedParserInputFixture as NormalizedParserInput);
    await repository.saveCapture(capture);
    await repository.recordCaptureEvent({
      occurredAt: '2030-01-01T00:00:00.000Z',
      status: 'completed',
    });

    await repository.deleteAllGameplayData();

    await expect(repository.getGames()).resolves.toEqual([]);
    await expect(repository.getRounds()).resolves.toEqual([]);
    await expect(database.captureEvents.toArray()).resolves.toEqual([]);
  });
});
