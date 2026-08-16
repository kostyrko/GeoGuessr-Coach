import type { RawCaptureEnvelope } from '../app/core/capture/capture-contract';
import type { CaptureLifecycleEvent } from '../app/core/capture/capture-lifecycle';
import { ingestCapture } from '../app/core/capture/ingest-capture';
import { CoachDatabase } from '../app/core/storage/coach-database';
import { GameRepository } from '../app/core/storage/game-repository';
import { importRecentDailyChallenges, type HistoricalImportResult } from './historical-import';

declare const chrome: {
  action: { onClicked: { addListener(listener: () => void): void } };
  runtime: {
    onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: { tab?: { url?: string } },
          sendResponse: (response: unknown) => void,
        ) => boolean | undefined,
      ): void;
    };
    openOptionsPage(): void;
  };
  storage: {
    session: {
      get(keys: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

const database = new CoachDatabase();
const repository = new GameRepository(database);

// Open on service-worker wake so schema migrations apply even before another
// game is captured. The database remains local to the browser profile.
void database.open();

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isCaptureStatusRequest(message)) {
    void repository.getLatestCaptureEvent().then((event) => sendResponse({ event }));
    return true;
  }

  if (isHistoricalImportRequest(message)) {
    void importHistoricalGames().then(sendResponse);
    return true;
  }

  if (!isGeoGuessrContentMessage(sender)) {
    return;
  }

  if (isIdentityObservedMessage(message)) {
    void chrome.storage.session.set({ historicalImportUserId: message.userId });
    return;
  }

  if (isRawCaptureMessage(message)) {
    void persistRawCapture(message.envelope);
    return true;
  }

  if (isLifecycleMessage(message)) {
    void repository.recordCaptureEvent(message);
    return true;
  }

  return;
});

async function importHistoricalGames(): Promise<
  { error: string; result?: undefined } | { error?: undefined; result: HistoricalImportResult }
> {
  const session = await chrome.storage.session.get('historicalImportUserId');
  const userId = session['historicalImportUserId'];
  if (typeof userId !== 'string' || userId.length === 0) {
    return {
      error:
        'Open or refresh any GeoGuessr page while signed in, then try the historical import again.',
    };
  }

  const result = await importRecentDailyChallenges(userId, repository);
  await repository.recordCaptureEvent({
    occurredAt: new Date().toISOString(),
    reason: `historical-import:${result.imported}-imported:${result.duplicates}-duplicates:${result.failed}-failed`,
    source: 'daily-challenge-free-leaderboard',
    status: result.failed === result.requested ? 'failed' : 'completed',
    supportedMode: 'daily-challenge-free',
  });
  return { result };
}

function isCaptureStatusRequest(message: unknown): boolean {
  return isRecord(message) && message['type'] === 'geoguessr-coach:get-capture-status';
}

function isHistoricalImportRequest(message: unknown): boolean {
  return isRecord(message) && message['type'] === 'geoguessr-coach:import-recent-daily-challenges';
}

function isIdentityObservedMessage(message: unknown): message is { userId: string } {
  return (
    isRecord(message) &&
    message['type'] === 'geoguessr-coach:identity-observed' &&
    typeof message['userId'] === 'string'
  );
}

async function persistRawCapture(envelope: RawCaptureEnvelope): Promise<void> {
  try {
    const result = await ingestCapture(envelope, repository);
    await repository.recordCaptureEvent({
      occurredAt: new Date().toISOString(),
      reason: result === 'duplicate' ? 'game-already-persisted' : 'capture-persisted',
      source: envelope.source,
      status: result === 'duplicate' ? 'duplicate' : 'completed',
      supportedMode: envelope.mode,
    });
  } catch {
    await repository.recordCaptureEvent({
      occurredAt: new Date().toISOString(),
      reason: 'capture-rejected-by-ingestion',
      source: envelope.source,
      status: 'failed',
      supportedMode: envelope.mode,
    });
  }
}

function isGeoGuessrContentMessage(sender: { tab?: { url?: string } }): boolean {
  return sender.tab?.url?.startsWith('https://www.geoguessr.com/') ?? false;
}

function isRawCaptureMessage(message: unknown): message is { envelope: RawCaptureEnvelope } {
  return (
    isRecord(message) &&
    message['type'] === 'geoguessr-coach:raw-capture' &&
    isRecord(message['envelope'])
  );
}

function isLifecycleMessage(message: unknown): message is CaptureLifecycleEvent {
  return isRecord(message) && message['type'] === 'geoguessr-coach:capture-lifecycle';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
