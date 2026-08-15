const BRIDGE_EVENT = 'geoguessr-coach:collector-event';

window.addEventListener(BRIDGE_EVENT, (event) => {
  if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') {
    return;
  }

  try {
    const message = JSON.parse(event.detail);
    chrome.runtime.sendMessage(message);
  } catch {
    // Ignore malformed events. The page must never be able to break gameplay.
  }
});
