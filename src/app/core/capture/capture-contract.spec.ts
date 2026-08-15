import {
  CAPTURE_CONTRACT_VERSION,
  DAILY_CHALLENGE_FREE_SOURCE,
  toParserInput,
  type RawCaptureEnvelope,
} from './capture-contract';

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
    const parserInput = toParserInput(createEnvelope());

    expect(parserInput).toEqual({
      capturedAt: '2026-08-15T10:00:00.000Z',
      externalGameId: 'anonymized-game-token',
      mapId: 'world',
      mapName: 'World',
      mode: 'daily-challenge-free',
      rounds: [
        {
          actual: { latitude: 52.23, longitude: 21.01 },
          distanceInMeters: 1200,
          durationSeconds: 42,
          guess: { latitude: 52.2, longitude: 21 },
          roundNumber: 1,
          score: 4300,
          skipped: false,
          sourceStartedAt: '2026-08-15T09:59:00.000Z',
          timedOut: false,
          timedOutWithGuess: false,
        },
      ],
      source: DAILY_CHALLENGE_FREE_SOURCE,
      totalDistanceInMeters: 1200,
      totalScore: 4300,
      totalTime: 42,
    });
  });

  it('rejects a capture without visible post-result evidence', () => {
    const envelope = createEnvelope();
    envelope.evidence.resultViewVisibleAt = '';

    expect(() => toParserInput(envelope)).toThrow('Capture requires visible post-result evidence.');
  });

  it('rejects unaligned round and guess arrays', () => {
    const envelope = createEnvelope();
    envelope.game.guesses = [];

    expect(() => toParserInput(envelope)).toThrow(
      'Round and guess arrays must be aligned and non-empty.',
    );
  });
});
