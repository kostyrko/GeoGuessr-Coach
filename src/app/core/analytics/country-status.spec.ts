import type { RoundRecord } from '../domain/game-model';

import type { CountryPerformance } from './country-performance';
import {
  calculatePerformanceTrend,
  confidenceForRoundCount,
  countryStatusForPerformance,
} from './country-status';

function createRound(
  index: number,
  score: number,
  guessedCountryCode: string | undefined = 'BWA',
): RoundRecord {
  return {
    actual: { latitude: 0, longitude: 0 },
    actualCountryCode: 'BWA',
    distanceInMeters: 1000,
    durationSeconds: 60,
    gameId: 'game-1',
    guess: { latitude: 0, longitude: 0 },
    guessedCountryCode,
    id: `round-${index}`,
    roundNumber: index,
    schemaVersion: 1,
    score,
    skipped: false,
    sourceStartedAt: `2030-01-${String(index).padStart(2, '0')}T00:00:00.000Z`,
    timedOut: false,
    timedOutWithGuess: false,
  };
}

function createPerformance(overrides: Partial<CountryPerformance> = {}): CountryPerformance {
  return {
    averageDistanceInMeters: 0,
    averageScore: 0,
    bestScore: 0,
    countryCode: 'BWA',
    medianScore: 0,
    recognitionAccuracy: 0.5,
    recognitionCorrectRounds: 5,
    recognitionKnownRounds: 10,
    rounds: 10,
    ...overrides,
  };
}

describe('confidence and country status', () => {
  it.each([
    [0, 'none'],
    [1, 'very-low'],
    [2, 'very-low'],
    [3, 'low'],
    [5, 'low'],
    [6, 'medium'],
    [9, 'medium'],
    [10, 'high'],
  ] as const)('assigns %i rounds to the %s confidence band', (rounds, expected) => {
    expect(confidenceForRoundCount(rounds)).toBe(expected);
  });

  it('withholds a trend when either stable comparison window is incomplete', () => {
    const trend = calculatePerformanceTrend([
      createRound(1, 1000),
      createRound(2, 1000),
      createRound(3, 1000),
      createRound(4, 5000),
      createRound(5, 5000),
    ]);

    expect(trend).toEqual({ direction: 'unavailable' });
  });

  it('compares a fixed recent window with the immediately preceding baseline', () => {
    const trend = calculatePerformanceTrend([
      createRound(1, 1000),
      createRound(2, 1000),
      createRound(3, 1000),
      createRound(4, 2000),
      createRound(5, 2000),
      createRound(6, 2000),
    ]);

    expect(trend).toMatchObject({
      baseline: { averageScore: 1000, rounds: 3 },
      direction: 'improving',
      recent: { averageScore: 2000, rounds: 3 },
      scoreDelta: 1000,
    });
  });

  it('returns neutral when score and recognition changes conflict', () => {
    const trend = calculatePerformanceTrend([
      createRound(1, 1000, 'BWA'),
      createRound(2, 1000, 'BWA'),
      createRound(3, 1000, 'BWA'),
      createRound(4, 2000, 'ZAF'),
      createRound(5, 2000, 'ZAF'),
      createRound(6, 2000, 'ZAF'),
    ]);

    expect(trend).toMatchObject({ direction: 'neutral', recognitionDelta: -1 });
  });

  it('does not publish a strong country status from a small or incomplete sample', () => {
    expect(countryStatusForPerformance(createPerformance({ rounds: 9 }))).toBe('insufficient-data');
    expect(countryStatusForPerformance(createPerformance({ recognitionAccuracy: undefined }))).toBe(
      'insufficient-data',
    );
  });

  it.each([
    [0.49, 'needs-work'],
    [0.5, 'learning'],
    [0.79, 'learning'],
    [0.8, 'mastered'],
  ] as const)('derives %s recognition as %s', (recognitionAccuracy, expected) => {
    expect(countryStatusForPerformance(createPerformance({ recognitionAccuracy }))).toBe(expected);
  });
});
