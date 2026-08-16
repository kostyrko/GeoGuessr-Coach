import type { RawCaptureEnvelope } from '../app/core/capture/capture-contract';
import type { CaptureLifecycleEvent } from '../app/core/capture/capture-lifecycle';
import { ingestCapture } from '../app/core/capture/ingest-capture';
import { CoachDatabase } from '../app/core/storage/coach-database';
import { GameRepository } from '../app/core/storage/game-repository';

declare const chrome: {
  action: { onClicked: { addListener(listener: () => void): void } };
  runtime: {
    onMessage: {
      addListener(
        listener: (message: unknown, sender: { tab?: { url?: string } }) => boolean | undefined,
      ): void;
    };
    openOptionsPage(): void;
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

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!isGeoGuessrContentMessage(sender)) {
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
