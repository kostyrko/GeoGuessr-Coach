import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

import completedCaptureFixture from './fixtures/daily-challenge-free.completed.json';
import type { RawCaptureEnvelope } from './capture-contract';
import { ingestCapture } from './ingest-capture';
import { CoachDatabase } from '../storage/coach-database';
import { GameRepository } from '../storage/game-repository';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

describe('capture ingestion', () => {
  let databaseName: string;
  let database: CoachDatabase;
  let repository: GameRepository;

  beforeEach(() => {
    databaseName = `geoguessr-coach-ingest-${crypto.randomUUID()}`;
    database = new CoachDatabase(databaseName);
    repository = new GameRepository(database);
  });

  afterEach(async () => {
    database.close();
    await Dexie.delete(databaseName);
  });

  it('stores a completed capture once with resolved and unresolved country fields', async () => {
    const envelope = {
      ...(completedCaptureFixture as RawCaptureEnvelope),
      game: {
        ...completedCaptureFixture.game,
        guesses: completedCaptureFixture.game.guesses.map((guess, index) =>
          index === 0 ? { ...guess, lat: 47.14, lng: 9.52 } : guess,
        ),
        rounds: completedCaptureFixture.game.rounds.map((round, index) =>
          index === 0 ? { ...round, lat: -24.65, lng: 25.91 } : round,
        ),
      },
    } as RawCaptureEnvelope;

    await expect(ingestCapture(envelope, repository)).resolves.toBe('stored');

    const [game] = await repository.getGames();
    const rounds = await repository.getRoundsForGame(game.id);

    expect(rounds).toHaveLength(5);
    expect(rounds.map((round) => round.roundNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(rounds.every((round) => round.gameId === game.id)).toBe(true);
    expect(rounds[0]).toMatchObject({ actualCountryCode: 'BWA', guessedCountryCode: 'LIE' });
    expect(rounds.some((round) => round.actualCountryCode === undefined)).toBe(true);
  });

  it('is idempotent across duplicate capture attempts and a reopened database', async () => {
    const envelope = completedCaptureFixture as RawCaptureEnvelope;

    await expect(ingestCapture(envelope, repository)).resolves.toBe('stored');
    await expect(ingestCapture(envelope, repository)).resolves.toBe('duplicate');
    database.close();

    database = new CoachDatabase(databaseName);
    repository = new GameRepository(database);

    await expect(ingestCapture(envelope, repository)).resolves.toBe('duplicate');
    await expect(repository.getGames()).resolves.toHaveLength(1);
    await expect(
      repository.getRoundsForGame(
        'daily-challenge-free-leaderboard:fixture-daily-challenge-free-001',
      ),
    ).resolves.toHaveLength(5);
  });
});
