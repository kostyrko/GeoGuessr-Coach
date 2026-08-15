import {
  CAPTURE_CONTRACT_VERSION,
  DAILY_CHALLENGE_FREE_SOURCE,
  toParserInput,
  type RawCaptureEnvelope,
} from './capture-contract';
import completedFixture from './fixtures/daily-challenge-free.completed.json';
import expectedParserInputFixture from './fixtures/daily-challenge-free.expected-parser-input.json';
import partialFixture from './fixtures/daily-challenge-free.partial.json';

function createEnvelope(): RawCaptureEnvelope {
  return {
    capturedAt: '2026-08-15T10:00:00.000Z',
    contractVersion: CAPTURE_CONTRACT_VERSION,
    evidence: {
      responseObservedAt: '2026-08-15T10:00:01.000Z',
      resultViewVisibleAt: '2026-08-15T10:00:00.500Z',
    },
    game: {
      guesses: [
        {
          distanceInMeters: 1200,
          lat: 52.2,
          lng: 21,
          roundScoreInPoints: 4300,
          skippedRound: false,
          time: 42,
          timedOut: false,
          timedOutWithGuess: false,
        },
      ],
      mapId: 'world',
      mapName: 'World',
      mode: 'standard',
      rounds: [{ lat: 52.23, lng: 21.01, startTime: '2026-08-15T09:59:00.000Z' }],
      token: 'anonymized-game-token',
      totalDistanceInMeters: 1200,
      totalScore: 4300,
      totalTime: 42,
    },
    mode: 'daily-challenge-free',
    source: DAILY_CHALLENGE_FREE_SOURCE,
  };
}

describe('toParserInput', () => {
  it('removes leaderboard and browser concerns from parser input', () => {
    const parserInput = toParserInput(completedFixture as RawCaptureEnvelope);

    expect(parserInput).toEqual(expectedParserInputFixture);
  });

  it('contains no identity, leaderboard, or request metadata in the raw fixture', () => {
    const fixtureKeys = new Set<string>();
    const collectKeys = (value: unknown): void => {
      if (value === null || typeof value !== 'object') {
        return;
      }

      for (const [key, nestedValue] of Object.entries(value)) {
        fixtureKeys.add(key);
        collectKeys(nestedValue);
      }
    };

    collectKeys(completedFixture);

    for (const forbiddenKey of ['avatar', 'cookie', 'header', 'nick', 'rank', 'userId']) {
      expect(fixtureKeys).not.toContain(forbiddenKey);
    }
  });

  it('rejects a capture without visible post-result evidence', () => {
    const envelope = createEnvelope();
    envelope.evidence.resultViewVisibleAt = '';

    expect(() => toParserInput(envelope)).toThrow('Capture requires visible post-result evidence.');
  });

  it('rejects unaligned round and guess arrays', () => {
    expect(() => toParserInput(partialFixture as RawCaptureEnvelope)).toThrow(
      'Round and guess arrays must be aligned and non-empty.',
    );
  });
});
