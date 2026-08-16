import type { CountryConfusion } from './country-confusion';
import type { CountryPerformance } from './country-performance';
import type { PerformanceTrend } from './country-status';
import { rankPracticeCountries } from './practice-ranking';

const AS_OF = '2030-04-01T00:00:00.000Z';

function createPerformance(overrides: Partial<CountryPerformance> = {}): CountryPerformance {
  return {
    averageDistanceInMeters: 0,
    averageScore: 2500,
    bestScore: 5000,
    countryCode: 'BWA',
    lastEncounteredAt: '2030-03-02T00:00:00.000Z',
    medianScore: 2500,
    recognitionAccuracy: 0.5,
    recognitionCorrectRounds: 5,
    recognitionKnownRounds: 10,
    rounds: 10,
    ...overrides,
  };
}

function createConfusion(percentageOfIncorrectGuesses: number): CountryConfusion {
  return {
    actualCountryCode: 'BWA',
    incorrectGuessCount: 1,
    missingGuessCount: 0,
    pairs: [{ count: 1, guessedCountryCode: 'ZAF', percentageOfIncorrectGuesses }],
  };
}

function createTrend(direction: PerformanceTrend['direction']): PerformanceTrend {
  return { direction };
}

describe('practice ranking', () => {
  it('suppresses strong recommendations for a low-confidence sample', () => {
    const [recommendation] = rankPracticeCountries(
      [{ performance: createPerformance({ rounds: 2 }) }],
      AS_OF,
    );

    expect(recommendation).toMatchObject({
      isEligibleForStrongRecommendation: false,
      strength: 'watch',
    });
  });

  it('uses country code as a stable tie-breaker', () => {
    const recommendations = rankPracticeCountries(
      [
        { performance: createPerformance({ countryCode: 'ZAF' }) },
        { performance: createPerformance({ countryCode: 'ARG' }) },
      ],
      AS_OF,
    );

    expect(recommendations.map((recommendation) => recommendation.countryCode)).toEqual([
      'ARG',
      'ZAF',
    ]);
  });

  it('adds a bounded recency boost for countries encountered longer ago', () => {
    const recommendations = rankPracticeCountries(
      [
        { performance: createPerformance({ countryCode: 'ARG', lastEncounteredAt: AS_OF }) },
        {
          performance: createPerformance({
            countryCode: 'BWA',
            lastEncounteredAt: '2029-01-01T00:00:00.000Z',
          }),
        },
      ],
      AS_OF,
    );

    expect(recommendations.map((recommendation) => recommendation.countryCode)).toEqual([
      'BWA',
      'ARG',
    ]);
    expect(recommendations[0].explanation.recencyMultiplier).toBe(1.2);
  });

  it('applies bounded declining-trend and confusion modifiers to the explanation', () => {
    const [recommendation] = rankPracticeCountries(
      [
        {
          confusion: createConfusion(1),
          performance: createPerformance(),
          trend: createTrend('declining'),
        },
      ],
      AS_OF,
    );

    expect(recommendation).toMatchObject({
      explanation: {
        primaryConfusion: { guessedCountryCode: 'ZAF', percentageOfIncorrectGuesses: 1 },
        trendDirection: 'declining',
        trendModifier: 0.05,
      },
    });
    expect(recommendation.priority).toBeCloseTo(0.7);
  });

  it('does not make a strong recommendation without known recognition data', () => {
    const [recommendation] = rankPracticeCountries(
      [{ performance: createPerformance({ recognitionAccuracy: undefined }) }],
      AS_OF,
    );

    expect(recommendation).toMatchObject({
      isEligibleForStrongRecommendation: false,
      strength: 'watch',
    });
  });

  it('enforces the strong-priority boundary', () => {
    const [recommendation] = rankPracticeCountries(
      [
        {
          performance: createPerformance({
            averageScore: 5000,
            recognitionAccuracy: 0.8,
            lastEncounteredAt: AS_OF,
          }),
        },
      ],
      AS_OF,
    );

    expect(recommendation.priority).toBeCloseTo(0.13);
    expect(recommendation.strength).toBe('watch');
  });
});
