# Release checklist

## Build and package

- Run `npm test`, `npm run typecheck`, `npm run format:check`, `npm run build`, and `npm run test:e2e`.
- Confirm `npm run build` completes the package verification step and produces `dist/geoguessr-coach/browser`.
- In `chrome://extensions`, enable Developer mode, use **Load unpacked**, and select that directory.
- Confirm the toolbar icon, popup, dashboard, options-page link, background service worker, and map worker all load without extension-page CSP or asset errors.

## Permission and privacy review

The manifest must have only these permissions:

| Permission                                | Why it is needed                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| `storage`                                 | Small local preferences in `chrome.storage.local`. Gameplay records use IndexedDB. |
| `https://www.geoguessr.com/*` host access | Content scripts can observe the supported post-result page/network response.       |

- Do not add `tabs`, `activeTab`, `scripting`, `webRequest`, `identity`, notifications, or broad host permissions without a new reviewed product decision.
- Confirm there is no backend, analytics telemetry, cloud sync, account, remote configuration, or product-initiated GeoGuessr request.
- Confirm raw GeoGuessr payloads stay behind the collector/parser boundary and are not displayed in the dashboard.

## Supported-mode and safety smoke test

- Confirm the only supported collector is **Daily Challenge Free**.
- Start a supported game and check that no capture, overlay, hint, current-location inference, or dashboard intervention occurs during active rounds.
- After GeoGuessr visibly displays the completed result, verify one normalized game with five rounds is saved, then refresh the dashboard and inspect History, Overview, Countries, World Map, and Practice.
- Visit an unsupported GeoGuessr mode and confirm it is not captured.
- Check empty, partial-data, and capture-error messages remain honest and actionable.
- From Settings, explicitly import the last 90 Daily Challenge Free dates. Confirm it does not run without the button click, imports only the signed-in player’s records, reports unavailable/failed dates honestly, and deduplicates a second run.

## Data and recovery

- Test JSON export → delete extension data → restore and compare games/rounds and derived analytics.
- Verify invalid JSON import leaves existing data unchanged.
- Confirm CSV and GeoJSON downloads contain only locally stored normalized data.
- Confirm migration from existing v1/v2 databases retains records and settings.

## Scale and final evidence

- Run the 10,000-round performance fixture and record its timing and storage result in `docs/performance.md`.
- Record a manual Chrome smoke test for the map and route views.
- Validate 50–100 manually observed completed Daily Challenge Free rounds before declaring capture reliability release-ready.
