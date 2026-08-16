import { describe, expect, it, vi } from 'vitest';

import {
  extractSignedInGame,
  importRecentDailyChallenges,
  type HistoricalFetch,
} from './historical-import';

const payload = {
  entries: [
    { userId: 'other-player', game: { token: 'other-game' } },
    {
      userId: 'signed-in-player',
      game: {
        map: { slug: 'world' },
        mapName: 'World',
        // This is intentionally GeoGuessr's value, not the extension mode label.
        mode: 'challenge',
        player: {
          guesses: [
            {
              distanceInMeters: 2400,
              lat: 46.2,
              lng: 6.1,
              roundScoreInPoints: 4900,
              skippedRound: false,
              time: 35,
              timedOut: false,
              timedOutWithGuess: false,
            },
          ],
          totalDistanceInMeters: { amount: '2400' },
          totalScore: { amount: '4900' },
          totalTime: 35,
        },
        rounds: [{ lat: 46.1, lng: 6.2, startTime: '2026-08-15T12:00:00.000Z' }],
        token: 'my-historical-game',
      },
    },
  ],
};

describe('historical Daily Challenge import', () => {
  it('selects only the signed-in player and discards leaderboard data', () => {
    const game = extractSignedInGame(payload, 'signed-in-player');

    expect(game).toMatchObject({
      mapId: 'world',
      mode: 'challenge',
      token: 'my-historical-game',
      totalScore: 4900,
    });
    expect(extractSignedInGame(payload, 'missing-player')).toBeUndefined();
  });

  it('imports historical dates through idempotent storage', async () => {
    const requestedUrls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      requestedUrls.push(url);
      return { json: async () => payload, ok: true } as Response;
    });
    const saveCaptureIfAbsent = vi.fn(async () => 'stored' as const);
    const repository = { saveCaptureIfAbsent };

    const result = await importRecentDailyChallenges('signed-in-player', repository as never, {
      days: 2,
      fetcher: fetcher as HistoricalFetch,
      now: new Date('2026-08-16T14:00:00.000Z'),
      pause: async () => undefined,
    });

    expect(requestedUrls).toEqual([
      'https://www.geoguessr.com/api/v3/challenges/daily-challenges/leaderboard/free?dateStr=2026-08-16',
      'https://www.geoguessr.com/api/v3/challenges/daily-challenges/leaderboard/free?dateStr=2026-08-15',
    ]);
    expect(saveCaptureIfAbsent).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      available: 2,
      duplicates: 0,
      failed: 0,
      imported: 2,
      invalid: 0,
      requested: 2,
    });
  });
});
