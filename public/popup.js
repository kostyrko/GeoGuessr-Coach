const status = document.querySelector('#status');
const openDashboard = document.querySelector('#open-dashboard');

chrome.runtime.sendMessage({ type: 'geoguessr-coach:get-capture-status' }, (response) => {
  const event = response?.event;
  if (!event) {
    status.textContent = 'No completed-game capture has been recorded yet.';
    return;
  }

  const labels = {
    completed: 'A completed game was saved locally.',
    duplicate: 'The most recent completed game was already saved locally.',
    failed: 'The most recent capture could not be saved. Open History for details.',
    skipped: 'The last observed page was not a completed result view.',
    unsupported: 'The last observed GeoGuessr mode is not supported yet.',
  };
  status.textContent = labels[event.status] ?? 'Capture status is unavailable.';
});

openDashboard.addEventListener('click', () => chrome.runtime.openOptionsPage());
