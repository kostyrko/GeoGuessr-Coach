import type { CountryAnalyticsQuery } from '../core/analytics/analytics-query';

import { sortCountries } from './countries-page.component';

function country(
  countryCode: string,
  priority: number,
  averageScore = 2500,
  rounds = 10,
): CountryAnalyticsQuery {
  return {
    confidence: 'high',
    confusion: {
      actualCountryCode: countryCode,
      incorrectGuessCount: 0,
      missingGuessCount: 0,
      pairs: [],
    },
    countryCode,
    performance: {
      averageDistanceInMeters: 0,
      averageScore,
      bestScore: averageScore,
      countryCode,
      medianScore: averageScore,
      recognitionCorrectRounds: 5,
      recognitionKnownRounds: 10,
      rounds,
    },
    recommendation: {
      countryCode,
      explanation: {
        averageScore,
        confidence: 'high',
        confidenceWeight: 1,
        localizationWeakness: 0.5,
        recognitionWeakness: 0.5,
        recencyMultiplier: 1,
        trendDirection: 'unavailable',
        trendModifier: 0,
      },
      isEligibleForStrongRecommendation: true,
      priority,
      strength: 'strong',
    },
    status: 'learning',
    trend: { direction: 'unavailable' },
  };
}

describe('country list ordering', () => {
  const names = { ARG: 'Argentina', BWA: 'Botswana', ZAF: 'South Africa' };
  const nameFor = (code: string) => names[code as keyof typeof names];

  it('defaults to descending practice priority with country name as its stable tie-breaker', () => {
    const countries = sortCountries(
      [country('ZAF', 0.6), country('ARG', 0.6), country('BWA', 0.8)],
      '',
      'priority',
      nameFor,
    );

    expect(countries.map((item) => item.countryCode)).toEqual(['BWA', 'ARG', 'ZAF']);
  });

  it('searches full names and ISO codes', () => {
    expect(
      sortCountries([country('ARG', 0.5), country('BWA', 0.4)], 'bots', 'priority', nameFor),
    ).toHaveLength(1);
    expect(
      sortCountries([country('ARG', 0.5), country('BWA', 0.4)], 'arg', 'priority', nameFor)[0]
        .countryCode,
    ).toBe('ARG');
  });
});
