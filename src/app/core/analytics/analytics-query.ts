import type { RoundRecord } from '../domain/game-model';

import { calculateCountryConfusions, type CountryConfusion } from './country-confusion';
import {
  calculateCountryPerformance,
  type CountryPerformance,
  type OverallPerformance,
} from './country-performance';
import { rankPracticeCountries, type PracticeRecommendation } from './practice-ranking';
import {
  calculatePerformanceTrend,
  confidenceForRoundCount,
  countryStatusForPerformance,
  type ConfidenceBand,
  type CountryStatus,
  type PerformanceTrend,
} from './country-status';

export type AnalyticsDataState = 'empty' | 'insufficient-data' | 'ready';

export interface RoundSummaryQuery {
  readonly actualCountryCode?: string;
  readonly distanceInMeters: number;
  readonly durationSeconds: number;
  readonly guessedCountryCode?: string;
  readonly id: string;
  readonly roundNumber: number;
  readonly score: number;
  readonly sourceStartedAt?: string;
}

export interface CountryAnalyticsQuery {
  readonly confidence: ConfidenceBand;
  readonly confusion: CountryConfusion;
  readonly countryCode: string;
  readonly performance: CountryPerformance;
  readonly recommendation: PracticeRecommendation;
  readonly status: CountryStatus;
  readonly trend: PerformanceTrend;
}

export interface CountryDetailQuery extends CountryAnalyticsQuery {
  readonly recentRounds: readonly RoundSummaryQuery[];
}

export interface MapCountryMetricQuery {
  readonly averageScore: number;
  readonly confidence: ConfidenceBand;
  readonly countryCode: string;
  readonly recognitionAccuracy?: number;
  readonly rounds: number;
  readonly status: CountryStatus;
}

export interface OverviewQuery {
  readonly overall: OverallPerformance;
  readonly practiceRecommendation?: PracticeRecommendation;
  readonly totalResolvedCountries: number;
}

export interface PracticeQueueQuery {
  readonly items: readonly PracticeRecommendation[];
  readonly strongItems: readonly PracticeRecommendation[];
}

export interface AnalyticsQueryModel {
  readonly countries: readonly CountryAnalyticsQuery[];
  readonly countryDetails: ReadonlyMap<string, CountryDetailQuery>;
  readonly map: readonly MapCountryMetricQuery[];
  readonly overview: OverviewQuery;
  readonly practice: PracticeQueueQuery;
  readonly state: AnalyticsDataState;
}

export function createAnalyticsQueryModel(
  rounds: readonly RoundRecord[],
  asOf: string,
): AnalyticsQueryModel {
  const performanceReport = calculateCountryPerformance(rounds);
  const confusions = calculateCountryConfusions(rounds);
  const roundsByCountry = groupRoundsByActualCountry(rounds);
  const confusionByCountry = new Map(
    confusions.map((confusion) => [confusion.actualCountryCode, confusion]),
  );
  const candidates = performanceReport.countries.map((performance) => ({
    confusion: confusionByCountry.get(performance.countryCode),
    performance,
    trend: calculatePerformanceTrend(roundsByCountry.get(performance.countryCode) ?? []),
  }));
  const recommendations = rankPracticeCountries(candidates, asOf);
  const recommendationByCountry = new Map(
    recommendations.map((recommendation) => [recommendation.countryCode, recommendation]),
  );
  const countries = performanceReport.countries.map((performance) => {
    const countryCode = performance.countryCode;
    const confusion = confusionByCountry.get(countryCode)!;
    const trend = calculatePerformanceTrend(roundsByCountry.get(countryCode) ?? []);
    const recommendation = recommendationByCountry.get(countryCode)!;

    return {
      confidence: confidenceForRoundCount(performance.rounds),
      confusion,
      countryCode,
      performance,
      recommendation,
      status: countryStatusForPerformance(performance),
      trend,
    } satisfies CountryAnalyticsQuery;
  });
  const countryDetails = new Map(
    countries.map((country) => [
      country.countryCode,
      {
        ...country,
        recentRounds: toRecentRoundSummaries(roundsByCountry.get(country.countryCode) ?? []),
      } satisfies CountryDetailQuery,
    ]),
  );
  const strongItems = recommendations.filter(
    (recommendation) => recommendation.isEligibleForStrongRecommendation,
  );

  return {
    countries,
    countryDetails,
    map: countries.map((country) => ({
      averageScore: country.performance.averageScore,
      confidence: country.confidence,
      countryCode: country.countryCode,
      recognitionAccuracy: country.performance.recognitionAccuracy,
      rounds: country.performance.rounds,
      status: country.status,
    })),
    overview: {
      overall: performanceReport.overall,
      practiceRecommendation: strongItems[0],
      totalResolvedCountries: performanceReport.countries.length,
    },
    practice: { items: recommendations, strongItems },
    state: stateFor(rounds.length, strongItems.length),
  };
}

function groupRoundsByActualCountry(rounds: readonly RoundRecord[]): Map<string, RoundRecord[]> {
  const grouped = new Map<string, RoundRecord[]>();

  for (const round of rounds) {
    if (!round.actualCountryCode) {
      continue;
    }

    const countryRounds = grouped.get(round.actualCountryCode) ?? [];
    countryRounds.push(round);
    grouped.set(round.actualCountryCode, countryRounds);
  }

  return grouped;
}

function toRecentRoundSummaries(rounds: readonly RoundRecord[]): readonly RoundSummaryQuery[] {
  return [...rounds]
    .sort((left, right) => {
      const leftTime = left.sourceStartedAt
        ? Date.parse(left.sourceStartedAt)
        : Number.NEGATIVE_INFINITY;
      const rightTime = right.sourceStartedAt
        ? Date.parse(right.sourceStartedAt)
        : Number.NEGATIVE_INFINITY;
      return rightTime - leftTime || right.id.localeCompare(left.id);
    })
    .map((round) => ({
      actualCountryCode: round.actualCountryCode,
      distanceInMeters: round.distanceInMeters,
      durationSeconds: round.durationSeconds,
      guessedCountryCode: round.guessedCountryCode,
      id: round.id,
      roundNumber: round.roundNumber,
      score: round.score,
      sourceStartedAt: round.sourceStartedAt,
    }));
}

function stateFor(roundCount: number, strongRecommendationCount: number): AnalyticsDataState {
  if (roundCount === 0) {
    return 'empty';
  }

  return strongRecommendationCount > 0 ? 'ready' : 'insufficient-data';
}
