import type { RoundRecord } from '../domain/game-model';

import type { CountryPerformance } from './country-performance';

export type ConfidenceBand = 'none' | 'very-low' | 'low' | 'medium' | 'high';
export type CountryStatus = 'insufficient-data' | 'needs-work' | 'learning' | 'mastered';
export type TrendDirection = 'improving' | 'declining' | 'neutral' | 'unavailable';

/**
 * The single source of truth for sample confidence and trend stability. Ten rounds is
 * deliberately the first high-confidence count: it takes precedence over the medium
 * band at the shared boundary in the product requirement.
 */
export const DEFAULT_PERFORMANCE_POLICY = Object.freeze({
  highConfidenceMinRounds: 10,
  lowConfidenceMaxRounds: 5,
  mediumConfidenceMaxRounds: 9,
  minimumConfidenceRounds: 1,
  recognitionMeaningfulDelta: 0.1,
  scoreMeaningfulDelta: 250,
  trendWindowRounds: 3,
  veryLowConfidenceMaxRounds: 2,
});

export interface PerformancePolicy {
  readonly highConfidenceMinRounds: number;
  readonly lowConfidenceMaxRounds: number;
  readonly mediumConfidenceMaxRounds: number;
  readonly minimumConfidenceRounds: number;
  readonly recognitionMeaningfulDelta: number;
  readonly scoreMeaningfulDelta: number;
  readonly trendWindowRounds: number;
  readonly veryLowConfidenceMaxRounds: number;
}

export interface TrendWindow {
  readonly averageScore: number;
  readonly recognitionAccuracy?: number;
  readonly rounds: number;
}

export interface PerformanceTrend {
  readonly baseline?: TrendWindow;
  readonly direction: TrendDirection;
  readonly recognitionDelta?: number;
  readonly recent?: TrendWindow;
  readonly scoreDelta?: number;
}

export function confidenceForRoundCount(
  rounds: number,
  policy: PerformancePolicy = DEFAULT_PERFORMANCE_POLICY,
): ConfidenceBand {
  if (rounds < policy.minimumConfidenceRounds) {
    return 'none';
  }

  if (rounds <= policy.veryLowConfidenceMaxRounds) {
    return 'very-low';
  }

  if (rounds <= policy.lowConfidenceMaxRounds) {
    return 'low';
  }

  if (rounds <= policy.mediumConfidenceMaxRounds) {
    return 'medium';
  }

  return 'high';
}

/**
 * Compares the latest completed rounds to the immediately preceding rounds. A trend
 * is unavailable until both windows contain the configured number of dated rounds.
 */
export function calculatePerformanceTrend(
  rounds: readonly RoundRecord[],
  policy: PerformancePolicy = DEFAULT_PERFORMANCE_POLICY,
): PerformanceTrend {
  const datedRounds = rounds
    .filter(
      (round) =>
        round.sourceStartedAt !== undefined && !Number.isNaN(Date.parse(round.sourceStartedAt)),
    )
    .sort((left, right) => Date.parse(right.sourceStartedAt!) - Date.parse(left.sourceStartedAt!));
  const recentRounds = datedRounds.slice(0, policy.trendWindowRounds);
  const baselineRounds = datedRounds.slice(policy.trendWindowRounds, policy.trendWindowRounds * 2);

  if (
    recentRounds.length < policy.trendWindowRounds ||
    baselineRounds.length < policy.trendWindowRounds
  ) {
    return { direction: 'unavailable' };
  }

  const recent = createTrendWindow(recentRounds);
  const baseline = createTrendWindow(baselineRounds);
  const scoreDelta = recent.averageScore - baseline.averageScore;
  const recognitionDelta =
    recent.recognitionAccuracy !== undefined && baseline.recognitionAccuracy !== undefined
      ? recent.recognitionAccuracy - baseline.recognitionAccuracy
      : undefined;

  return {
    baseline,
    direction: resolveTrendDirection(scoreDelta, recognitionDelta, policy),
    recognitionDelta,
    recent,
    scoreDelta,
  };
}

/** A strong presentational status is withheld until the country has a high-confidence sample. */
export function countryStatusForPerformance(
  performance: CountryPerformance,
  policy: PerformancePolicy = DEFAULT_PERFORMANCE_POLICY,
): CountryStatus {
  if (
    confidenceForRoundCount(performance.rounds, policy) !== 'high' ||
    performance.recognitionAccuracy === undefined
  ) {
    return 'insufficient-data';
  }

  if (performance.recognitionAccuracy >= 0.8) {
    return 'mastered';
  }

  return performance.recognitionAccuracy >= 0.5 ? 'learning' : 'needs-work';
}

function createTrendWindow(rounds: readonly RoundRecord[]): TrendWindow {
  const knownRecognitionRounds = rounds.filter((round) => round.guessedCountryCode !== undefined);
  const correctRecognitionRounds = knownRecognitionRounds.filter(
    (round) => round.guessedCountryCode === round.actualCountryCode,
  );

  return {
    averageScore: average(rounds.map((round) => round.score)),
    recognitionAccuracy:
      knownRecognitionRounds.length === 0
        ? undefined
        : correctRecognitionRounds.length / knownRecognitionRounds.length,
    rounds: rounds.length,
  };
}

function resolveTrendDirection(
  scoreDelta: number,
  recognitionDelta: number | undefined,
  policy: PerformancePolicy,
): TrendDirection {
  const scoreDirection = directionForDelta(scoreDelta, policy.scoreMeaningfulDelta);
  const recognitionDirection =
    recognitionDelta === undefined
      ? 'neutral'
      : directionForDelta(recognitionDelta, policy.recognitionMeaningfulDelta);

  if (scoreDirection === 'neutral') {
    return recognitionDirection;
  }

  if (recognitionDirection === 'neutral' || recognitionDirection === scoreDirection) {
    return scoreDirection;
  }

  return 'neutral';
}

function directionForDelta(
  value: number,
  meaningfulDelta: number,
): Exclude<TrendDirection, 'unavailable'> {
  if (value >= meaningfulDelta) {
    return 'improving';
  }

  if (value <= -meaningfulDelta) {
    return 'declining';
  }

  return 'neutral';
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
