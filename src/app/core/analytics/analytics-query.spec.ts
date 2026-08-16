import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

import expectedParserInputFixture from '../capture/fixtures/daily-challenge-free.expected-parser-input.json';
import type { NormalizedParserInput } from '../capture/capture-contract';
import { toNormalizedGameCapture } from '../domain/game-model';
import { CoachDatabase } from '../storage/coach-database';
import { GameRepository } from '../storage/game-repository';

import { createAnalyticsQueryModel } from './analytics-query';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

describe('analytics query model', () => {
  const asOf = '2030-03-01T00:00:00.000Z';
  let databaseName: string;
  let database: CoachDatabase;
  let repository: GameRepository;

  beforeEach(() => {
    databaseName = `analytics-query-${crypto.randomUUID()}`;
    database = new CoachDatabase(databaseName);
    repository = new GameRepository(database);
  });

  afterEach(async () => {
    database.close();
    await Dexie.delete(databaseName);
  });

  it('flows an ingested capture into typed country, map, overview, and practice query models', async () => {
    const capture = toNormalizedGameCapture(expectedParserInputFixture as NormalizedParserInput);
    const rounds = capture.rounds.map((round, index) => ({
      ...round,
      actualCountryCode: 'BWA',
      guessedCountryCode: index < 3 ? 'ZAF' : 'BWA',
      sourceStartedAt: `2030-02-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    }));
    await repository.saveCaptureIfAbsent({ ...capture, rounds });

    const model = createAnalyticsQueryModel(await repository.getRounds(), asOf);

    expect(model.state).toBe('insufficient-data');
    expect(model.overview).toMatchObject({
      overall: { totalRounds: 5 },
      totalResolvedCountries: 1,
    });
    expect(model.countries).toHaveLength(1);
    expect(model.countries[0]).toMatchObject({
      confidence: 'low',
      confusion: { pairs: [{ guessedCountryCode: 'ZAF' }] },
      countryCode: 'BWA',
      recommendation: { strength: 'watch' },
    });
    expect(model.countryDetails.get('BWA')?.recentRounds).toHaveLength(5);
    expect(model.map).toEqual([expect.objectContaining({ countryCode: 'BWA', rounds: 5 })]);
    expect(model.practice.items).toHaveLength(1);
  });

  it('returns a deliberate empty model when there are no persisted rounds', () => {
    const model = createAnalyticsQueryModel([], asOf);

    expect(model).toMatchObject({
      countries: [],
      map: [],
      practice: { items: [], strongItems: [] },
      state: 'empty',
    });
  });
});
