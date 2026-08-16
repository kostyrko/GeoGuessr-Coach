import type { RoundRecord } from '../domain/game-model';

export interface CountryPerformance {
  averageDistanceInMeters: number;
  averageScore: number;
  bestScore: number;
  countryCode: string;
  lastEncounteredAt?: string;
  medianScore: number;
  recognitionAccuracy?: number;
  recognitionCorrectRounds: number;
  recognitionKnownRounds: number;
  rounds: number;
}

export interface OverallPerformance {
  averageDistanceInMeters?: number;
  averageScore?: number;
  bestScore?: number;
  countriesEncountered: number;
  lastEncounteredAt?: string;
  medianScore?: number;
  recognitionAccuracy?: number;
  recognitionCorrectRounds: number;
  recognitionKnownRounds: number;
  resolvedCountryRounds: number;
  totalRounds: number;
  unresolvedCountryRounds: number;
}

export interface CountryPerformanceReport {
  countries: readonly CountryPerformance[];
  overall: OverallPerformance;
}

/** Recalculates analytics directly from normalized rounds; no derived values are persisted. */
export function calculateCountryPerformance(
  rounds: readonly RoundRecord[],
): CountryPerformanceReport {
  const byCountry = new Map<string, RoundRecord[]>();

  for (const round of rounds) {
    if (!round.actualCountryCode) {
      continue;
    }

    const countryRounds = byCountry.get(round.actualCountryCode) ?? [];
    countryRounds.push(round);
    byCountry.set(round.actualCountryCode, countryRounds);
  }

  const countries = [...byCountry.entries()]
    .map(([countryCode, countryRounds]) => calculateCountry(countryCode, countryRounds))
    .sort((left, right) => left.countryCode.localeCompare(right.countryCode));
  const resolvedRounds = rounds.filter((round) => round.actualCountryCode !== undefined);

  return {
    countries,
    overall: calculateOverall(rounds, resolvedRounds, countries),
  };
}

function calculateCountry(countryCode: string, rounds: readonly RoundRecord[]): CountryPerformance {
  const recognitionKnownRounds = rounds.filter((round) => round.guessedCountryCode !== undefined);
  const recognitionCorrectRounds = recognitionKnownRounds.filter(
    (round) => round.guessedCountryCode === countryCode,
  ).length;

  return {
    averageDistanceInMeters: average(rounds.map((round) => round.distanceInMeters)),
    averageScore: average(rounds.map((round) => round.score)),
    bestScore: Math.max(...rounds.map((round) => round.score)),
    countryCode,
    lastEncounteredAt: latestTimestamp(rounds),
    medianScore: median(rounds.map((round) => round.score)),
    recognitionAccuracy: ratio(recognitionCorrectRounds, recognitionKnownRounds.length),
    recognitionCorrectRounds,
    recognitionKnownRounds: recognitionKnownRounds.length,
    rounds: rounds.length,
  };
}

function calculateOverall(
  allRounds: readonly RoundRecord[],
  resolvedRounds: readonly RoundRecord[],
  countries: readonly CountryPerformance[],
): OverallPerformance {
  const recognitionKnownRounds = resolvedRounds.filter(
    (round) => round.guessedCountryCode !== undefined,
  );
  const recognitionCorrectRounds = recognitionKnownRounds.filter(
    (round) => round.guessedCountryCode === round.actualCountryCode,
  ).length;

  return {
    averageDistanceInMeters: averageOrUndefined(allRounds.map((round) => round.distanceInMeters)),
    averageScore: averageOrUndefined(allRounds.map((round) => round.score)),
    bestScore:
      allRounds.length > 0 ? Math.max(...allRounds.map((round) => round.score)) : undefined,
    countriesEncountered: countries.length,
    lastEncounteredAt: latestTimestamp(allRounds),
    medianScore: medianOrUndefined(allRounds.map((round) => round.score)),
    recognitionAccuracy: ratio(recognitionCorrectRounds, recognitionKnownRounds.length),
    recognitionCorrectRounds,
    recognitionKnownRounds: recognitionKnownRounds.length,
    resolvedCountryRounds: resolvedRounds.length,
    totalRounds: allRounds.length,
    unresolvedCountryRounds: allRounds.length - resolvedRounds.length,
  };
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function averageOrUndefined(values: readonly number[]): number | undefined {
  return values.length === 0 ? undefined : average(values);
}

function median(values: readonly number[]): number {
  return medianOrUndefined(values) ?? 0;
}

function medianOrUndefined(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const orderedValues = [...values].sort((left, right) => left - right);
  const middle = Math.floor(orderedValues.length / 2);

  return orderedValues.length % 2 === 0
    ? (orderedValues[middle - 1] + orderedValues[middle]) / 2
    : orderedValues[middle];
}

function ratio(numerator: number, denominator: number): number | undefined {
  return denominator === 0 ? undefined : numerator / denominator;
}

function latestTimestamp(rounds: readonly RoundRecord[]): string | undefined {
  return rounds
    .map((round) => round.sourceStartedAt)
    .filter((value): value is string => value !== undefined)
    .filter((value) => !Number.isNaN(Date.parse(value)))
    .sort()
    .at(-1);
}
