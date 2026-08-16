import type { BackupDocument, GameRecord, RoundRecord } from '../domain/game-model';

const CSV_HEADERS = [
  'played_at',
  'game_mode',
  'map_name',
  'round_number',
  'actual_country',
  'actual_latitude',
  'actual_longitude',
  'guessed_country',
  'guessed_latitude',
  'guessed_longitude',
  'score',
  'distance_km',
  'time_seconds',
  'country_correct',
] as const;

export function validateBackupDocument(value: unknown): BackupDocument {
  if (!isRecord(value) || value['format'] !== 'geoguessr-coach-backup')
    throw new Error('This is not a GeoGuessr Coach backup.');
  if (value['schemaVersion'] !== 1)
    throw new Error('This backup uses an unsupported schema version.');
  if (
    !isIso(value['exportedAt']) ||
    !Array.isArray(value['games']) ||
    !Array.isArray(value['rounds']) ||
    !Array.isArray(value['captureEvents']) ||
    !isRecord(value['settings'])
  )
    throw new Error('The backup is incomplete or malformed.');
  const backup = value as unknown as BackupDocument;
  const gameIds = new Set<string>();
  const roundIds = new Set<string>();
  for (const game of backup.games) {
    if (!isGame(game) || gameIds.has(game.id))
      throw new Error('The backup contains an invalid or duplicate game.');
    gameIds.add(game.id);
  }
  for (const round of backup.rounds) {
    if (!isRound(round) || roundIds.has(round.id) || !gameIds.has(round.gameId))
      throw new Error('The backup contains an invalid, duplicate, or orphaned round.');
    roundIds.add(round.id);
  }
  if (backup.settings.id !== 'settings') throw new Error('The backup settings are invalid.');
  return backup;
}

export function toRoundCsv(games: readonly GameRecord[], rounds: readonly RoundRecord[]): string {
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const rows = rounds.map((round) => {
    const game = gamesById.get(round.gameId);
    return [
      game?.playedAt ?? '',
      game?.mode ?? '',
      game?.mapName ?? '',
      round.roundNumber,
      round.actualCountryCode ?? '',
      round.actual.latitude,
      round.actual.longitude,
      round.guessedCountryCode ?? '',
      round.guess.latitude,
      round.guess.longitude,
      round.score,
      round.distanceInMeters / 1000,
      round.durationSeconds,
      round.actualCountryCode && round.guessedCountryCode
        ? String(round.actualCountryCode === round.guessedCountryCode)
        : '',
    ];
  });
  return [CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function toRoundGeoJson(games: readonly GameRecord[], rounds: readonly RoundRecord[]) {
  const gamesById = new Map(games.map((game) => [game.id, game]));
  return {
    type: 'FeatureCollection',
    features: rounds.flatMap((round) => {
      const properties = roundProperties(round, gamesById.get(round.gameId));
      return [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [round.actual.longitude, round.actual.latitude] },
          properties: {
            ...properties,
            location_kind: 'actual',
            country_code: round.actualCountryCode ?? null,
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [round.guess.longitude, round.guess.latitude] },
          properties: {
            ...properties,
            location_kind: 'guess',
            country_code: round.guessedCountryCode ?? null,
          },
        },
      ];
    }),
  } as const;
}

function roundProperties(round: RoundRecord, game: GameRecord | undefined) {
  return {
    game_id: round.gameId,
    game_mode: game?.mode ?? null,
    map_name: game?.mapName ?? null,
    played_at: game?.playedAt ?? null,
    round_number: round.roundNumber,
    score: round.score,
    distance_km: round.distanceInMeters / 1000,
    time_seconds: round.durationSeconds,
    country_correct:
      round.actualCountryCode && round.guessedCountryCode
        ? round.actualCountryCode === round.guessedCountryCode
        : null,
  };
}
function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isIso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
function isGame(value: unknown): value is GameRecord {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['externalGameId'] === 'string' &&
    isIso(value['playedAt']) &&
    Array.isArray(value['roundIds'])
  );
}
function isRound(value: unknown): value is RoundRecord {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['gameId'] === 'string' &&
    typeof value['roundNumber'] === 'number' &&
    typeof value['score'] === 'number' &&
    isCoordinate(value['actual']) &&
    isCoordinate(value['guess'])
  );
}
function isCoordinate(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value['latitude'] === 'number' &&
    Number.isFinite(value['latitude']) &&
    value['latitude'] >= -90 &&
    value['latitude'] <= 90 &&
    typeof value['longitude'] === 'number' &&
    Number.isFinite(value['longitude']) &&
    value['longitude'] >= -180 &&
    value['longitude'] <= 180
  );
}
