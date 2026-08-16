import type { RoundRecord } from '../domain/game-model';

export interface ConfusionPair {
  readonly count: number;
  readonly guessedCountryCode: string;
  /** Share of resolved, incorrect guesses for this actual country. */
  readonly percentageOfIncorrectGuesses: number;
}

export interface CountryConfusion {
  readonly actualCountryCode: string;
  readonly incorrectGuessCount: number;
  readonly missingGuessCount: number;
  readonly pairs: readonly ConfusionPair[];
}

/**
 * Calculates only country-recognition mistakes. Countries with no resolved incorrect
 * guesses are deliberately retained with an empty pair list so callers can render an
 * honest "no confusions yet" state.
 */
export function calculateCountryConfusions(
  rounds: readonly RoundRecord[],
): readonly CountryConfusion[] {
  const roundsByActualCountry = new Map<string, RoundRecord[]>();

  for (const round of rounds) {
    if (!round.actualCountryCode) {
      continue;
    }

    const countryRounds = roundsByActualCountry.get(round.actualCountryCode) ?? [];
    countryRounds.push(round);
    roundsByActualCountry.set(round.actualCountryCode, countryRounds);
  }

  return [...roundsByActualCountry.entries()]
    .map(([actualCountryCode, countryRounds]) =>
      calculateCountryConfusion(actualCountryCode, countryRounds),
    )
    .sort((left, right) => left.actualCountryCode.localeCompare(right.actualCountryCode));
}

function calculateCountryConfusion(
  actualCountryCode: string,
  rounds: readonly RoundRecord[],
): CountryConfusion {
  const incorrectRounds = rounds.filter(
    (round) =>
      round.guessedCountryCode !== undefined && round.guessedCountryCode !== actualCountryCode,
  );
  const pairsByGuessedCountry = new Map<string, number>();

  for (const round of incorrectRounds) {
    const guessedCountryCode = round.guessedCountryCode!;
    pairsByGuessedCountry.set(
      guessedCountryCode,
      (pairsByGuessedCountry.get(guessedCountryCode) ?? 0) + 1,
    );
  }

  return {
    actualCountryCode,
    incorrectGuessCount: incorrectRounds.length,
    missingGuessCount: rounds.filter((round) => round.guessedCountryCode === undefined).length,
    pairs: [...pairsByGuessedCountry.entries()]
      .map(([guessedCountryCode, count]) => ({
        count,
        guessedCountryCode,
        percentageOfIncorrectGuesses: count / incorrectRounds.length,
      }))
      .sort(
        (left, right) =>
          right.count - left.count ||
          left.guessedCountryCode.localeCompare(right.guessedCountryCode),
      ),
  };
}
