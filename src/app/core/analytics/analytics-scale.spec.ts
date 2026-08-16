import type { RoundRecord } from '../domain/game-model';

import { createAnalyticsQueryModel } from './analytics-query';

function createRound(index: number): RoundRecord {
  const country = index % 2 === 0 ? 'BWA' : 'ZAF';
  return {
    actual: { latitude: -24, longitude: 18 },
    actualCountryCode: country,
    distanceInMeters: index * 10,
    durationSeconds: 30 + (index % 120),
    gameId: `game-${Math.floor(index / 5)}`,
    guess: { latitude: -24, longitude: 18 },
    guessedCountryCode: index % 3 === 0 ? (country === 'BWA' ? 'ZAF' : 'BWA') : country,
    id: `round-${index}`,
    roundNumber: (index % 5) + 1,
    schemaVersion: 1,
    score: index % 5001,
    skipped: false,
    sourceStartedAt: new Date(Date.UTC(2030, 0, 1, 0, index)).toISOString(),
    timedOut: false,
    timedOutWithGuess: false,
  };
}

describe('analytics storage-scale validation', () => {
  it('recalculates a 10,000-round query model within the local responsiveness budget', () => {
    const rounds = Array.from({ length: 10_000 }, (_, index) => createRound(index));
    const start = performance.now();
    const model = createAnalyticsQueryModel(rounds, '2031-01-01T00:00:00.000Z');
    const elapsed = performance.now() - start;

    expect(model.overview.overall.totalRounds).toBe(10_000);
    expect(model.countries).toHaveLength(2);
    expect(elapsed).toBeLessThan(5_000);
  });
});
