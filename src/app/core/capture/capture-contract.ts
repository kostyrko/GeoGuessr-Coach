/**
 * Collector-facing contracts. GeoGuessr-specific response shapes end at this
 * boundary; analytics, storage, and UI may consume parser inputs only.
 */

export const CAPTURE_CONTRACT_VERSION = 1 as const;
export const DAILY_CHALLENGE_FREE_SOURCE = 'daily-challenge-free-leaderboard' as const;

export type CaptureSource = typeof DAILY_CHALLENGE_FREE_SOURCE;
export type SupportedCaptureMode = 'daily-challenge-free';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface RawDailyChallengeRound {
  lat: number;
  lng: number;
  startTime?: string;
}

export interface RawDailyChallengeGuess {
  lat: number;
  lng: number;
  distanceInMeters: number;
  roundScoreInPoints: number;
  skippedRound: boolean;
  time: number;
  timedOut: boolean;
  timedOutWithGuess: boolean;
}

/**
 * This is the selected signed-in player's game only. The collector must discard
 * all other leaderboard entries before constructing this object.
 */
export interface RawDailyChallengeFreeGame {
  mapId?: string;
  mapName?: string;
  mode: string;
  rounds: readonly RawDailyChallengeRound[];
  token: string;
  guesses: readonly RawDailyChallengeGuess[];
  totalDistanceInMeters?: number;
  totalScore?: number;
  totalTime?: number;
}

export interface PostResultEvidence {
  /** The collector observed the result-view gate before reading the response. */
  resultViewVisibleAt: string;
  /** The response was already in page traffic; the extension did not request it. */
  responseObservedAt: string;
}

export interface RawCaptureEnvelope {
  contractVersion: typeof CAPTURE_CONTRACT_VERSION;
  capturedAt: string;
  evidence: PostResultEvidence;
  game: RawDailyChallengeFreeGame;
  mode: SupportedCaptureMode;
  source: CaptureSource;
}

/**
 * Converts a deliberately selected historical, completed Daily Challenge Free
 * game. Unlike automatic collection this is used only by the explicit local
 * import action, never while a round is active.
 */
export function toHistoricalImportParserInput(
  game: RawDailyChallengeFreeGame,
  capturedAt: string,
): NormalizedParserInput {
  if (game.rounds.length !== game.guesses.length || game.rounds.length === 0) {
    throw new Error('Round and guess arrays must be aligned and non-empty.');
  }

  return {
    capturedAt,
    externalGameId: game.token,
    mapId: game.mapId,
    mapName: game.mapName,
    mode: 'daily-challenge-free',
    rounds: game.rounds.map((round, index) => {
      const guess = game.guesses[index];
      if (!guess) throw new Error('Round and guess arrays must be aligned.');
      return {
        actual: { latitude: round.lat, longitude: round.lng },
        distanceInMeters: guess.distanceInMeters,
        durationSeconds: guess.time,
        guess: { latitude: guess.lat, longitude: guess.lng },
        roundNumber: index + 1,
        score: guess.roundScoreInPoints,
        skipped: guess.skippedRound,
        sourceStartedAt: round.startTime,
        timedOut: guess.timedOut,
        timedOutWithGuess: guess.timedOutWithGuess,
      };
    }),
    source: DAILY_CHALLENGE_FREE_SOURCE,
    totalDistanceInMeters: game.totalDistanceInMeters,
    totalScore: game.totalScore,
    totalTime: game.totalTime,
  };
}

export interface ParserRoundInput {
  actual: GeoCoordinate;
  durationSeconds: number;
  guess: GeoCoordinate;
  roundNumber: number;
  score: number;
  skipped: boolean;
  sourceStartedAt?: string;
  timedOut: boolean;
  timedOutWithGuess: boolean;
  distanceInMeters: number;
}

/**
 * The only GeoGuessr-derived input the parser may receive. It has no account,
 * leaderboard, UI, request, or browser-specific data.
 */
export interface NormalizedParserInput {
  capturedAt: string;
  externalGameId: string;
  mapId?: string;
  mapName?: string;
  mode: SupportedCaptureMode;
  rounds: readonly ParserRoundInput[];
  source: CaptureSource;
  totalDistanceInMeters?: number;
  totalScore?: number;
  totalTime?: number;
}

export function toParserInput(envelope: RawCaptureEnvelope): NormalizedParserInput {
  if (envelope.contractVersion !== CAPTURE_CONTRACT_VERSION) {
    throw new Error('Unsupported capture contract version.');
  }

  if (envelope.source !== DAILY_CHALLENGE_FREE_SOURCE || envelope.mode !== 'daily-challenge-free') {
    throw new Error('Unsupported capture source or mode.');
  }

  if (!envelope.evidence.resultViewVisibleAt || !envelope.evidence.responseObservedAt) {
    throw new Error('Capture requires visible post-result evidence.');
  }

  if (
    envelope.game.rounds.length !== envelope.game.guesses.length ||
    envelope.game.rounds.length === 0
  ) {
    throw new Error('Round and guess arrays must be aligned and non-empty.');
  }

  return {
    capturedAt: envelope.capturedAt,
    externalGameId: envelope.game.token,
    mapId: envelope.game.mapId,
    mapName: envelope.game.mapName,
    mode: envelope.mode,
    rounds: envelope.game.rounds.map((round, index) => {
      const guess = envelope.game.guesses[index];

      return {
        actual: { latitude: round.lat, longitude: round.lng },
        distanceInMeters: guess.distanceInMeters,
        durationSeconds: guess.time,
        guess: { latitude: guess.lat, longitude: guess.lng },
        roundNumber: index + 1,
        score: guess.roundScoreInPoints,
        skipped: guess.skippedRound,
        sourceStartedAt: round.startTime,
        timedOut: guess.timedOut,
        timedOutWithGuess: guess.timedOutWithGuess,
      };
    }),
    source: envelope.source,
    totalDistanceInMeters: envelope.game.totalDistanceInMeters,
    totalScore: envelope.game.totalScore,
    totalTime: envelope.game.totalTime,
  };
}
