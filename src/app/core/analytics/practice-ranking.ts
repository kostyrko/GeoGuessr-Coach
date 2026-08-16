import type { CountryConfusion, ConfusionPair } from './country-confusion';
import type { CountryPerformance } from './country-performance';
import {
  confidenceForRoundCount,
  type ConfidenceBand,
  type PerformancePolicy,
  type PerformanceTrend,
  type TrendDirection,
  DEFAULT_PERFORMANCE_POLICY,
} from './country-status';

export type RecommendationStrength = 'strong' | 'watch';

export const DEFAULT_PRACTICE_RANKING_POLICY = Object.freeze({
  confusionModifierMaximum: 0.1,
  localizationWeight: 0.35,
  maximumRecencyDays: 60,
  recognitionWeight: 0.65,
  recencyModifierMaximum: 0.2,
  strongRecommendationMinPriority: 0.25,
  trendModifierMagnitude: 0.05,
  veryLowConfidenceWeight: 0.2,
  lowConfidenceWeight: 0.4,
  mediumConfidenceWeight: 0.7,
  highConfidenceWeight: 1,
});

export interface PracticeRankingPolicy {
  readonly confusionModifierMaximum: number;
  readonly highConfidenceWeight: number;
  readonly localizationWeight: number;
  readonly lowConfidenceWeight: number;
  readonly maximumRecencyDays: number;
  readonly mediumConfidenceWeight: number;
  readonly recognitionWeight: number;
  readonly recencyModifierMaximum: number;
  readonly strongRecommendationMinPriority: number;
  readonly trendModifierMagnitude: number;
  readonly veryLowConfidenceWeight: number;
}

export interface PracticeRankingCandidate {
  readonly confusion?: CountryConfusion;
  readonly performance: CountryPerformance;
  readonly trend?: PerformanceTrend;
}

export interface PracticeRecommendationExplanation {
  readonly averageScore: number;
  readonly confidence: ConfidenceBand;
  readonly confidenceWeight: number;
  readonly daysSinceLastEncounter?: number;
  readonly localizationWeakness: number;
  readonly primaryConfusion?: ConfusionPair;
  readonly recognitionAccuracy?: number;
  readonly recognitionWeakness: number;
  readonly recencyMultiplier: number;
  readonly trendDirection: TrendDirection;
  readonly trendModifier: number;
}

export interface PracticeRecommendation {
  readonly countryCode: string;
  readonly explanation: PracticeRecommendationExplanation;
  readonly isEligibleForStrongRecommendation: boolean;
  readonly priority: number;
  readonly strength: RecommendationStrength;
}

/**
 * Produces a deterministic, explainable practice queue from already-derived analytics.
 * `asOf` is explicit rather than using the current clock so the same inputs always rank
 * identically in tests and in a rendered query model.
 */
export function rankPracticeCountries(
  candidates: readonly PracticeRankingCandidate[],
  asOf: string,
  rankingPolicy: PracticeRankingPolicy = DEFAULT_PRACTICE_RANKING_POLICY,
  performancePolicy: PerformancePolicy = DEFAULT_PERFORMANCE_POLICY,
): readonly PracticeRecommendation[] {
  const asOfTime = Date.parse(asOf);
  if (Number.isNaN(asOfTime)) {
    throw new Error('The ranking reference time must be a valid ISO timestamp.');
  }

  return candidates
    .map((candidate) => createRecommendation(candidate, asOfTime, rankingPolicy, performancePolicy))
    .sort(
      (left, right) =>
        right.priority - left.priority || left.countryCode.localeCompare(right.countryCode),
    );
}

function createRecommendation(
  candidate: PracticeRankingCandidate,
  asOfTime: number,
  rankingPolicy: PracticeRankingPolicy,
  performancePolicy: PerformancePolicy,
): PracticeRecommendation {
  const { performance } = candidate;
  const confidence = confidenceForRoundCount(performance.rounds, performancePolicy);
  const confidenceWeight = confidenceWeightFor(confidence, rankingPolicy);
  const recognitionWeakness =
    performance.recognitionAccuracy === undefined ? 0 : 1 - performance.recognitionAccuracy;
  const localizationWeakness = clamp(1 - performance.averageScore / 5000);
  const recency = calculateRecency(performance.lastEncounteredAt, asOfTime, rankingPolicy);
  const trendModifier = trendModifierFor(candidate.trend?.direction, rankingPolicy);
  const primaryConfusion = candidate.confusion?.pairs[0];
  const confusionModifier = primaryConfusion
    ? clamp(primaryConfusion.percentageOfIncorrectGuesses, 0, 1) *
      rankingPolicy.confusionModifierMaximum
    : 0;
  const weakness =
    recognitionWeakness * rankingPolicy.recognitionWeight +
    localizationWeakness * rankingPolicy.localizationWeight;
  const priority =
    weakness * confidenceWeight * recency.multiplier + trendModifier + confusionModifier;
  const isEligibleForStrongRecommendation =
    confidence === 'high' &&
    performance.recognitionAccuracy !== undefined &&
    priority >= rankingPolicy.strongRecommendationMinPriority;

  return {
    countryCode: performance.countryCode,
    explanation: {
      averageScore: performance.averageScore,
      confidence,
      confidenceWeight,
      daysSinceLastEncounter: recency.daysSinceLastEncounter,
      localizationWeakness,
      primaryConfusion,
      recognitionAccuracy: performance.recognitionAccuracy,
      recognitionWeakness,
      recencyMultiplier: recency.multiplier,
      trendDirection: candidate.trend?.direction ?? 'unavailable',
      trendModifier,
    },
    isEligibleForStrongRecommendation,
    priority,
    strength: isEligibleForStrongRecommendation ? 'strong' : 'watch',
  };
}

function confidenceWeightFor(confidence: ConfidenceBand, policy: PracticeRankingPolicy): number {
  switch (confidence) {
    case 'very-low':
      return policy.veryLowConfidenceWeight;
    case 'low':
      return policy.lowConfidenceWeight;
    case 'medium':
      return policy.mediumConfidenceWeight;
    case 'high':
      return policy.highConfidenceWeight;
    case 'none':
      return 0;
  }
}

function calculateRecency(
  lastEncounteredAt: string | undefined,
  asOfTime: number,
  policy: PracticeRankingPolicy,
): { daysSinceLastEncounter?: number; multiplier: number } {
  if (!lastEncounteredAt) {
    return { multiplier: 1 };
  }

  const lastEncounteredTime = Date.parse(lastEncounteredAt);
  if (Number.isNaN(lastEncounteredTime)) {
    return { multiplier: 1 };
  }

  const daysSinceLastEncounter = Math.max(0, (asOfTime - lastEncounteredTime) / 86_400_000);
  const normalizedAge = clamp(daysSinceLastEncounter / policy.maximumRecencyDays);

  return {
    daysSinceLastEncounter,
    multiplier: 1 + normalizedAge * policy.recencyModifierMaximum,
  };
}

function trendModifierFor(
  direction: TrendDirection | undefined,
  policy: PracticeRankingPolicy,
): number {
  if (direction === 'declining') {
    return policy.trendModifierMagnitude;
  }

  return direction === 'improving' ? -policy.trendModifierMagnitude : 0;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}
