import type { RoundRecord } from '../domain/game-model';

import { calculateCountryConfusions } from './country-confusion';

function createRound(overrides: Partial<RoundRecord> = {}): RoundRecord {
  return {
    actual: { latitude: 0, longitude: 0 },
    actualCountryCode: 'BWA',
    distanceInMeters: 1000,
    durationSeconds: 60,
    gameId: 'game-1',
    guess: { latitude: 0, longitude: 0 },
    guessedCountryCode: 'BWA',
    id: `round-${overrides.roundNumber ?? 1}`,
    roundNumber: 1,
    schemaVersion: 1,
    score: 4000,
    skipped: false,
    timedOut: false,
    timedOutWithGuess: false,
    ...overrides,
  };
}

describe('country confusion analysis', () => {
  it('groups and ranks incorrect guesses by actual country', () => {
    const confusions = calculateCountryConfusions([
      createRound({ actualCountryCode: 'BWA', guessedCountryCode: 'ZAF', roundNumber: 1 }),
      createRound({ actualCountryCode: 'BWA', guessedCountryCode: 'NAM', roundNumber: 2 }),
      createRound({ actualCountryCode: 'BWA', guessedCountryCode: 'ZAF', roundNumber: 3 }),
      createRound({ actualCountryCode: 'BWA', guessedCountryCode: 'BWA', roundNumber: 4 }),
      createRound({ actualCountryCode: 'ARG', guessedCountryCode: 'PRY', roundNumber: 5 }),
    ]);

    expect(confusions).toEqual([
      {
        actualCountryCode: 'ARG',
        incorrectGuessCount: 1,
        missingGuessCount: 0,
        pairs: [{ count: 1, guessedCountryCode: 'PRY', percentageOfIncorrectGuesses: 1 }],
      },
      {
        actualCountryCode: 'BWA',
        incorrectGuessCount: 3,
        missingGuessCount: 0,
        pairs: [
          {
            count: 2,
            guessedCountryCode: 'ZAF',
            percentageOfIncorrectGuesses: 2 / 3,
          },
          {
            count: 1,
            guessedCountryCode: 'NAM',
            percentageOfIncorrectGuesses: 1 / 3,
          },
        ],
      },
    ]);
  });

  it('uses alphabetical guessed-country order to break a count tie', () => {
    const [confusion] = calculateCountryConfusions([
      createRound({ guessedCountryCode: 'ZAF', roundNumber: 1 }),
      createRound({ guessedCountryCode: 'NAM', roundNumber: 2 }),
    ]);

    expect(confusion.pairs.map((pair) => pair.guessedCountryCode)).toEqual(['NAM', 'ZAF']);
  });

  it('retains an empty state and counts missing guesses without treating them as a confusion', () => {
    const [confusion] = calculateCountryConfusions([
      createRound({ guessedCountryCode: 'BWA', roundNumber: 1 }),
      createRound({ guessedCountryCode: undefined, roundNumber: 2 }),
    ]);

    expect(confusion).toEqual({
      actualCountryCode: 'BWA',
      incorrectGuessCount: 0,
      missingGuessCount: 1,
      pairs: [],
    });
  });

  it('does not attribute unresolved actual countries to a confusion report', () => {
    expect(
      calculateCountryConfusions([
        createRound({ actualCountryCode: undefined, guessedCountryCode: 'LKA' }),
      ]),
    ).toEqual([]);
  });
});
