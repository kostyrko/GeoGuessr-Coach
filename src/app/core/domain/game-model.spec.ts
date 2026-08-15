import expectedParserInputFixture from '../capture/fixtures/daily-challenge-free.expected-parser-input.json';
import type { NormalizedParserInput } from '../capture/capture-contract';
import {
  type BackupDocument,
  GAME_SCHEMA_VERSION,
  createGameId,
  createRoundId,
  toNormalizedGameCapture,
} from './game-model';

describe('game model', () => {
  const parserInput = expectedParserInputFixture as NormalizedParserInput;

  it('creates deterministic identities for a game and its rounds', () => {
    const gameId = createGameId('daily-challenge-free-leaderboard', 'fixture/daily game');

    expect(gameId).toBe('daily-challenge-free-leaderboard:fixture%2Fdaily%20game');
    expect(createRoundId(gameId, 3)).toBe(
      'daily-challenge-free-leaderboard:fixture%2Fdaily%20game:round:3',
    );
  });

  it('maps parser input to versioned game and round records', () => {
    const capture = toNormalizedGameCapture(parserInput);

    expect(capture.game).toMatchObject({
      externalGameId: 'fixture-daily-challenge-free-001',
      id: 'daily-challenge-free-leaderboard:fixture-daily-challenge-free-001',
      playedAt: '2030-01-02T03:00:00.000Z',
      schemaVersion: GAME_SCHEMA_VERSION,
    });
    expect(capture.game.roundIds).toHaveLength(5);
    expect(capture.rounds).toHaveLength(5);
    expect(capture.rounds[0]).toMatchObject({
      gameId: capture.game.id,
      id: `${capture.game.id}:round:1`,
      roundNumber: 1,
      schemaVersion: GAME_SCHEMA_VERSION,
    });
    expect(capture.rounds[4]).toMatchObject({
      skipped: true,
      timedOut: false,
    });
  });

  it('uses capture time when the source has no valid round timestamp', () => {
    const capture = toNormalizedGameCapture({
      ...parserInput,
      rounds: parserInput.rounds.map((round) => ({ ...round, sourceStartedAt: undefined })),
    });

    expect(capture.game.playedAt).toBe(parserInput.capturedAt);
  });

  it('rejects duplicate round numbers and invalid coordinates', () => {
    const duplicateRound = {
      ...parserInput,
      rounds: [parserInput.rounds[0], { ...parserInput.rounds[0] }],
    };
    const invalidCoordinate = {
      ...parserInput,
      rounds: [
        {
          ...parserInput.rounds[0],
          actual: { latitude: 100, longitude: 0 },
        },
      ],
    };

    expect(() => toNormalizedGameCapture(duplicateRound)).toThrow(
      'Round numbers must be unique within a game.',
    );
    expect(() => toNormalizedGameCapture(invalidCoordinate)).toThrow(
      'Actual coordinate is invalid.',
    );
  });

  it('provides a versioned, normalized backup contract', () => {
    const normalized = toNormalizedGameCapture(parserInput);
    const backup: BackupDocument = {
      captureEvents: [],
      exportedAt: '2026-08-15T12:00:00.000Z',
      format: 'geoguessr-coach-backup',
      games: [normalized.game],
      rounds: normalized.rounds,
      schemaVersion: GAME_SCHEMA_VERSION,
      settings: {
        id: 'settings',
        schemaVersion: GAME_SCHEMA_VERSION,
        updatedAt: '2026-08-15T12:00:00.000Z',
      },
    };

    expect(backup.games[0].id).toBe(backup.rounds[0].gameId);
    expect(backup.captureEvents).toEqual([]);
  });
});
