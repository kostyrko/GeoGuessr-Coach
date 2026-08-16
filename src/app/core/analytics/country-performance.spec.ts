import type { RoundRecord } from '../domain/game-model';

import { calculateCountryPerformance } from './country-performance';

function createRound(overrides: Partial<RoundRecord> = {}): RoundRecord {
  return {
    actual: { latitude: 0, longitude: 0 },
    actualCountryCode: 'BWA',
    distanceInMeters: 1000,
    durationSeconds: 60,
    gameId: 'game-1',
    guess: { latitude: 0, longitude: 0 },
    guessedCountryCode: 'BWA',
    id: `round-${overrides.roundNumber ?? 1}`,
    roundNumber: 1,
    schemaVersion: 1,
    score: 4000,
    skipped: false,
    sourceStartedAt: '2030-01-01T00:00:00.000Z',
    timedOut: false,
    timedOutWithGuess: false,
    ...overrides,
  };
}

describe('country performance', () => {
  it('returns an explicit empty report for no rounds', () => {
    expect(calculateCountryPerformance([])).toEqual({
      countries: [],
      overall: {
        averageDistanceInMeters: undefined,
        averageScore: undefined,
        bestScore: undefined,
        countriesEncountered: 0,
        lastEncounteredAt: undefined,
        medianScore: undefined,
        recognitionAccuracy: undefined,
        recognitionCorrectRounds: 0,
        recognitionKnownRounds: 0,
        resolvedCountryRounds: 0,
        totalRounds: 0,
        unresolvedCountryRounds: 0,
      },
    });
  });

  it('calculates recognition separately from localization for one country', () => {
    const report = calculateCountryPerformance([
      createRound({ distanceInMeters: 0, roundNumber: 1, score: 5000 }),
      createRound({
        distanceInMeters: 800000,
        guessedCountryCode: 'ZAF',
        roundNumber: 2,
        score: 0,
      }),
      createRound({ guessedCountryCode: undefined, roundNumber: 3, score: 2000 }),
    ]);

    expect(report.countries).toEqual([
      expect.objectContaining({
        averageDistanceInMeters: 801000 / 3,
        averageScore: 7000 / 3,
        bestScore: 5000,
        countryCode: 'BWA',
        medianScore: 2000,
        recognitionAccuracy: 0.5,
        recognitionCorrectRounds: 1,
        recognitionKnownRounds: 2,
        rounds: 3,
      }),
    ]);
  });

  it('groups mixed countries and keeps unresolved actual countries out of attribution', () => {
    const report = calculateCountryPerformance([
      createRound({
        actualCountryCode: 'ARG',
        guessedCountryCode: 'ARG',
        roundNumber: 1,
        score: 100,
      }),
      createRound({
        actualCountryCode: 'ARG',
        guessedCountryCode: 'PRY',
        roundNumber: 2,
        score: 300,
      }),
      createRound({
        actualCountryCode: 'BWA',
        guessedCountryCode: 'BWA',
        roundNumber: 3,
        score: 500,
      }),
      createRound({
        actualCountryCode: undefined,
        guessedCountryCode: 'LKA',
        roundNumber: 4,
        score: 0,
      }),
    ]);

    expect(report.countries.map((country) => country.countryCode)).toEqual(['ARG', 'BWA']);
    expect(report.countries[0]).toMatchObject({
      averageScore: 200,
      recognitionAccuracy: 0.5,
      rounds: 2,
    });
    expect(report.overall).toMatchObject({
      averageScore: 225,
      medianScore: 200,
      recognitionAccuracy: 2 / 3,
      resolvedCountryRounds: 3,
      totalRounds: 4,
      unresolvedCountryRounds: 1,
    });
  });
});
