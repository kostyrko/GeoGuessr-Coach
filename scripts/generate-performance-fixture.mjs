import { writeFile } from 'node:fs/promises';

const rounds = Array.from({ length: 10_000 }, (_, index) => ({
  actual: { latitude: -24 + (index % 80) / 10, longitude: 18 + (index % 120) / 10 },
  actualCountryCode: index % 2 ? 'BWA' : 'ZAF',
  distanceInMeters: index * 17,
  durationSeconds: 30 + (index % 120),
  gameId: `performance-game-${Math.floor(index / 5)}`,
  guess: { latitude: -24, longitude: 18 },
  guessedCountryCode: index % 3 ? 'BWA' : 'ZAF',
  id: `performance-round-${index}`,
  roundNumber: (index % 5) + 1,
  schemaVersion: 1,
  score: index % 5001,
  skipped: false,
  sourceStartedAt: new Date(Date.UTC(2030, 0, 1, 0, index)).toISOString(),
  timedOut: false,
  timedOutWithGuess: false,
}));
await writeFile('tmp/performance-rounds.json', JSON.stringify(rounds));
console.log('Wrote 10,000 anonymized rounds to tmp/performance-rounds.json');
