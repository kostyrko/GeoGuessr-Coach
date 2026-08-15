chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    message?.type !== 'geoguessr-coach:raw-capture' &&
    message?.type !== 'geoguessr-coach:capture-lifecycle'
  ) {
    return;
  }

  // GGC-005 deliberately stops at the parser boundary. Nothing is persisted
  // until the data-model and repository tickets are complete.
  console.info('[GeoGuessr Coach capture]', {
    message,
    tabId: sender.tab?.id,
  });
});
