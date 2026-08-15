import type {
  CaptureSource,
  GeoCoordinate,
  NormalizedParserInput,
  SupportedCaptureMode,
} from '../capture/capture-contract';
import type { CaptureLifecycleEvent } from '../capture/capture-lifecycle';

export const GAME_SCHEMA_VERSION = 1 as const;

export interface GameRecord {
  capturedAt: string;
  externalGameId: string;
  id: string;
  mapId?: string;
  mapName?: string;
  mode: SupportedCaptureMode;
  playedAt: string;
  roundIds: readonly string[];
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  source: CaptureSource;
  totalDistanceInMeters?: number;
  totalScore?: number;
  totalTime?: number;
}

export interface RoundRecord {
  actual: GeoCoordinate;
  actualCountryCode?: string;
  distanceInMeters: number;
  durationSeconds: number;
  gameId: string;
  guess: GeoCoordinate;
  guessedCountryCode?: string;
  id: string;
  roundNumber: number;
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  score: number;
  skipped: boolean;
  sourceStartedAt?: string;
  timedOut: boolean;
  timedOutWithGuess: boolean;
}

export interface NormalizedGameCapture {
  game: GameRecord;
  rounds: readonly RoundRecord[];
}

/** The singleton settings record persisted outside gameplay history. */
export interface SettingsRecord {
  id: 'settings';
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  updatedAt: string;
}

/** A portable, versioned local backup. Import/export implementation follows in GGC-024. */
export interface BackupDocument {
  captureEvents: readonly CaptureLifecycleEvent[];
  exportedAt: string;
  format: 'geoguessr-coach-backup';
  games: readonly GameRecord[];
  rounds: readonly RoundRecord[];
  schemaVersion: typeof GAME_SCHEMA_VERSION;
  settings: SettingsRecord;
}

export interface ImportPreview {
  backupSchemaVersion: number;
  gameCount: number;
  roundCount: number;
  valid: boolean;
}

export function createGameId(source: CaptureSource, externalGameId: string): string {
  if (!externalGameId) {
    throw new Error('External game ID is required.');
  }

  return `${source}:${encodeURIComponent(externalGameId)}`;
}

export function createRoundId(gameId: string, roundNumber: number): string {
  if (!Number.isInteger(roundNumber) || roundNumber < 1) {
    throw new Error('Round number must be a positive integer.');
  }

  return `${gameId}:round:${roundNumber}`;
}

export function toNormalizedGameCapture(input: NormalizedParserInput): NormalizedGameCapture {
  const gameId = createGameId(input.source, input.externalGameId);
  const seenRoundNumbers = new Set<number>();

  const rounds = input.rounds.map((round) => {
    if (seenRoundNumbers.has(round.roundNumber)) {
      throw new Error('Round numbers must be unique within a game.');
    }

    seenRoundNumbers.add(round.roundNumber);
    assertCoordinate(round.actual, 'Actual coordinate');
    assertCoordinate(round.guess, 'Guess coordinate');

    return {
      actual: round.actual,
      distanceInMeters: round.distanceInMeters,
      durationSeconds: round.durationSeconds,
      gameId,
      guess: round.guess,
      id: createRoundId(gameId, round.roundNumber),
      roundNumber: round.roundNumber,
      schemaVersion: GAME_SCHEMA_VERSION,
      score: round.score,
      skipped: round.skipped,
      sourceStartedAt: round.sourceStartedAt,
      timedOut: round.timedOut,
      timedOutWithGuess: round.timedOutWithGuess,
    } satisfies RoundRecord;
  });

  return {
    game: {
      capturedAt: input.capturedAt,
      externalGameId: input.externalGameId,
      id: gameId,
      mapId: input.mapId,
      mapName: input.mapName,
      mode: input.mode,
      playedAt: getPlayedAt(input),
      roundIds: rounds.map((round) => round.id),
      schemaVersion: GAME_SCHEMA_VERSION,
      source: input.source,
      totalDistanceInMeters: input.totalDistanceInMeters,
      totalScore: input.totalScore,
      totalTime: input.totalTime,
    },
    rounds,
  };
}

function assertCoordinate(coordinate: GeoCoordinate, label: string): void {
  if (
    !Number.isFinite(coordinate.latitude) ||
    !Number.isFinite(coordinate.longitude) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90 ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new Error(`${label} is invalid.`);
  }
}

function getPlayedAt(input: NormalizedParserInput): string {
  const sourceStartTimes = input.rounds
    .map((round) => round.sourceStartedAt)
    .filter((value): value is string => value !== undefined)
    .filter((value) => !Number.isNaN(Date.parse(value)))
    .sort();

  return sourceStartTimes[0] ?? input.capturedAt;
}
