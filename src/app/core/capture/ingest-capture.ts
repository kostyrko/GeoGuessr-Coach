import { toNormalizedGameCapture, type NormalizedGameCapture } from '../domain/game-model';
import { resolveRoundCountries } from '../geography/country-resolver';
import { GameRepository } from '../storage/game-repository';

import {
  toHistoricalImportParserInput,
  toParserInput,
  type ParserRoundInput,
  type RawCaptureEnvelope,
  type RawDailyChallengeFreeGame,
} from './capture-contract';

export type CaptureIngestionResult = 'duplicate' | 'stored';

/**
 * The sole application adapter from a checked post-result envelope to durable,
 * normalized data. Raw GeoGuessr shapes stop at `toParserInput`.
 */
export async function ingestCapture(
  envelope: RawCaptureEnvelope,
  repository: GameRepository,
): Promise<CaptureIngestionResult> {
  const parserInput = toParserInput(envelope);
  const normalizedCapture = toNormalizedGameCapture(parserInput);
  const captureWithCountries = applyCountryResolution(normalizedCapture, parserInput.rounds);

  return repository.saveCaptureIfAbsent(captureWithCountries);
}

/** Saves one deliberately requested historical completed game through the
 * same normalization, country resolution, and idempotency path as capture. */
export async function ingestHistoricalGame(
  game: RawDailyChallengeFreeGame,
  repository: GameRepository,
  capturedAt = new Date().toISOString(),
): Promise<CaptureIngestionResult> {
  const parserInput = toHistoricalImportParserInput(game, capturedAt);
  const normalizedCapture = toNormalizedGameCapture(parserInput);
  const captureWithCountries = applyCountryResolution(normalizedCapture, parserInput.rounds);

  return repository.saveCaptureIfAbsent(captureWithCountries);
}

function applyCountryResolution(
  capture: NormalizedGameCapture,
  parserRounds: readonly ParserRoundInput[],
): NormalizedGameCapture {
  return {
    ...capture,
    rounds: capture.rounds.map((round, index) => {
      const parserRound = parserRounds[index];
      if (!parserRound) {
        throw new Error('Normalized capture has an unpaired parser round.');
      }

      const countries = resolveRoundCountries(parserRound.actual, parserRound.guess);
      return {
        ...round,
        actualCountryCode: countries.actual.countryCode,
        guessedCountryCode: countries.guess.countryCode,
      };
    }),
  };
}
