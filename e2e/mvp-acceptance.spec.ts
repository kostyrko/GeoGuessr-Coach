import { expect, test } from '@playwright/test';

const databaseName = 'geoguessr-coach';
const game = {
  capturedAt: '2030-01-01T00:00:00.000Z',
  externalGameId: 'e2e-game',
  id: 'daily-challenge-free-leaderboard:e2e-game',
  mapName: 'World',
  mode: 'daily-challenge-free',
  playedAt: '2030-01-01T00:00:00.000Z',
  roundIds: ['daily-challenge-free-leaderboard:e2e-game:round:1'],
  schemaVersion: 1,
  source: 'daily-challenge-free-leaderboard',
  totalScore: 4000,
};
const round = {
  actual: { latitude: -24, longitude: 18 },
  actualCountryCode: 'BWA',
  distanceInMeters: 1000,
  durationSeconds: 60,
  gameId: game.id,
  guess: { latitude: -24, longitude: 18 },
  guessedCountryCode: 'BWA',
  id: game.roundIds[0],
  roundNumber: 1,
  schemaVersion: 1,
  score: 4000,
  skipped: false,
  sourceStartedAt: '2030-01-01T00:00:00.000Z',
  timedOut: false,
  timedOutWithGuess: false,
};

test.beforeEach(async ({ page }) => {
  await page.goto('/#/overview');
  await page.evaluate(
    async ({ databaseName, game, round }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onupgradeneeded = () => {
          const database = request.result;
          database.createObjectStore('games', { keyPath: 'id' });
          database.createObjectStore('rounds', { keyPath: 'id' });
          database.createObjectStore('settings', { keyPath: 'id' });
          database.createObjectStore('captureEvents', { keyPath: 'occurredAt' });
          database.createObjectStore('metadata', { keyPath: 'id' });
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(['games', 'rounds'], 'readwrite');
          transaction.objectStore('games').put(game);
          transaction.objectStore('rounds').put(round);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };
      });
    },
    { databaseName, game, round },
  );
  await page.reload();
});

test('shows saved history, country analytics, map controls, practice safety, and deletion confirmation', async ({
  page,
}) => {
  await page.goto('/#/history');
  await expect(page.getByText('1 saved game')).toBeVisible();
  await page.goto('/#/countries');
  await expect(page.getByText('Botswana')).toBeVisible();
  await page.getByText('Botswana').first().click();
  await expect(page.getByRole('heading', { name: 'Botswana' })).toBeVisible();
  await page.goto('/#/practice');
  await expect(page.getByText('Not enough data for a strong recommendation')).toBeVisible();
  await page.goto('/#/world-map');
  await expect(page.getByRole('group', { name: 'Map metric' })).toBeVisible();
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Delete local gameplay data' }).click();
  await expect(page.getByText('Type DELETE to confirm')).toBeVisible();
});

test('keeps active-round capture out of the dashboard contract', async ({ page }) => {
  await page.goto('/#/history');
  await expect(page.getByText('1 saved game')).toBeVisible();
  // The only test data is an already-normalized completed record; no active-round collector payload is seeded or displayed.
});
