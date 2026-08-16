import expectedParserInputFixture from '../capture/fixtures/daily-challenge-free.expected-parser-input.json';
import type { NormalizedParserInput } from '../capture/capture-contract';
import { toNormalizedGameCapture } from '../domain/game-model';
import { toRoundCsv, toRoundGeoJson, validateBackupDocument } from './data-portability';

const capture = toNormalizedGameCapture(expectedParserInputFixture as NormalizedParserInput);
const backup = {
  captureEvents: [],
  exportedAt: '2030-01-01T00:00:00.000Z',
  format: 'geoguessr-coach-backup',
  games: [capture.game],
  rounds: capture.rounds,
  schemaVersion: 1,
  settings: { id: 'settings', schemaVersion: 1, updatedAt: '2030-01-01T00:00:00.000Z' },
} as const;
describe('data portability', () => {
  it('validates complete backups and rejects incompatible or duplicate data', () => {
    expect(validateBackupDocument(backup)).toEqual(backup);
    expect(() => validateBackupDocument({ ...backup, schemaVersion: 2 })).toThrow('unsupported');
    expect(() =>
      validateBackupDocument({ ...backup, games: [capture.game, capture.game] }),
    ).toThrow('duplicate');
  });
  it('exports one escaped CSV row per round using stable headers', () => {
    const csv = toRoundCsv([{ ...capture.game, mapName: 'Map, name' }], capture.rounds);
    expect(csv.split('\n')).toHaveLength(capture.rounds.length + 1);
    expect(csv.split('\n')[0]).toContain('played_at,game_mode');
    expect(csv).toContain('"Map, name"');
  });
  it('exports actual and guess GeoJSON point features with round metadata', () => {
    const geoJson = toRoundGeoJson([capture.game], capture.rounds);
    expect(geoJson.type).toBe('FeatureCollection');
    expect(geoJson.features).toHaveLength(capture.rounds.length * 2);
    expect(geoJson.features[0]).toMatchObject({
      geometry: { type: 'Point' },
      properties: { location_kind: 'actual', round_number: 1 },
    });
  });
});
