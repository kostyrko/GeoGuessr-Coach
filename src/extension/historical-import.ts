import type { RawDailyChallengeFreeGame } from '../app/core/capture/capture-contract';
import { ingestHistoricalGame } from '../app/core/capture/ingest-capture';
import type { GameRepository } from '../app/core/storage/game-repository';

const ENDPOINT = 'https://www.geoguessr.com/api/v3/challenges/daily-challenges/leaderboard/free';
export const HISTORICAL_IMPORT_DAYS = 90;

interface LeaderboardEntry {
  game?: {
    map?: { id?: string; slug?: string };
    mapName?: string;
    mode?: string;
    player?: {
      guesses?: unknown;
      id?: string;
      totalDistanceInMeters?: unknown;
      totalScore?: unknown;
      totalTime?: unknown;
    };
    rounds?: unknown;
    token?: string;
  };
  userId?: string;
}

interface LeaderboardPayload {
  entries?: LeaderboardEntry[];
}

export interface HistoricalImportResult {
  available: number;
  duplicates: number;
  failed: number;
  imported: number;
  invalid: number;
  requested: number;
}

export type HistoricalFetch = (input: string, init: RequestInit) => Promise<Response>;

export async function importRecentDailyChallenges(
  userId: string,
  repository: GameRepository,
  options: {
    days?: number;
    fetcher?: HistoricalFetch;
    now?: Date;
    pause?: () => Promise<void>;
  } = {},
): Promise<HistoricalImportResult> {
  const days = Math.min(
    Math.max(options.days ?? HISTORICAL_IMPORT_DAYS, 1),
    HISTORICAL_IMPORT_DAYS,
  );
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? new Date();
  const result: HistoricalImportResult = {
    available: 0,
    duplicates: 0,
    failed: 0,
    imported: 0,
    invalid: 0,
    requested: days,
  };

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = toUtcDateString(now, dayOffset);
    try {
      const response = await fetcher(`${ENDPOINT}?dateStr=${date}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        result.failed += 1;
        continue;
      }

      const game = extractSignedInGame((await response.json()) as LeaderboardPayload, userId);
      if (!game) continue;

      result.available += 1;
      try {
        const outcome = await ingestHistoricalGame(game, repository);
        if (outcome === 'stored') result.imported += 1;
        else result.duplicates += 1;
      } catch {
        result.invalid += 1;
      }
    } catch {
      result.failed += 1;
    }

    // Deliberately keep this user-requested lookup modest: no concurrent burst
    // and a short pause between daily endpoints.
    if (dayOffset < days - 1) await (options.pause ?? pauseBetweenRequests)();
  }

  return result;
}

export function extractSignedInGame(
  payload: LeaderboardPayload,
  userId: string,
): RawDailyChallengeFreeGame | undefined {
  const matches = (payload.entries ?? []).filter(
    (entry) => entry.userId === userId || entry.game?.player?.id === userId,
  );
  if (matches.length !== 1) return undefined;

  const game = matches[0]?.game;
  if (!game?.token) return undefined;

  return {
    guesses: Array.isArray(game.player?.guesses) ? (game.player.guesses as never[]) : [],
    mapId: game.map?.slug ?? game.map?.id,
    mapName: game.mapName,
    mode: game.mode ?? 'unknown',
    rounds: Array.isArray(game.rounds) ? (game.rounds as never[]) : [],
    token: game.token,
    totalDistanceInMeters: toFiniteNumber(game.player?.totalDistanceInMeters),
    totalScore: toFiniteNumber(game.player?.totalScore),
    totalTime: toFiniteNumber(game.player?.totalTime),
  };
}

function toFiniteNumber(value: unknown): number | undefined {
  const candidate =
    value && typeof value === 'object' ? (value as { amount?: unknown }).amount : value;
  const number = typeof candidate === 'string' ? Number(candidate) : candidate;
  return typeof number === 'number' && Number.isFinite(number) ? number : undefined;
}

function toUtcDateString(now: Date, dayOffset: number): string {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOffset),
  );
  return date.toISOString().slice(0, 10);
}

function pauseBetweenRequests(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}
