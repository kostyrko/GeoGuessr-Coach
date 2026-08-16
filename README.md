# GeoGuessr Coach

GeoGuessr Coach is a privacy-first, local-only Chrome extension for reviewing **completed** GeoGuessr rounds and deciding which countries to practise. It never provides live-round assistance, hints, overlays, or hidden-location inference.

## Prerequisites

- Node.js 24.0.0 or later (this workspace was created with Node 24.14.0)
- npm 11 or later
- Google Chrome for unpacked-extension testing

## Setup

```bash
npm install
```

## Development and checks

```bash
npm start
npm run typecheck
npm run format:check
npm test
npm run build
npm run test:e2e
```

`npm start` serves the dashboard at `http://localhost:4200/`. It is useful for UI development; it does not emulate extension APIs.

## Load the extension in Chrome

1. Build the project with `npm run build`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `dist/geoguessr-coach/browser`.
5. Click the GeoGuessr Coach toolbar icon, then choose **Open dashboard**.

`npm run build` creates a production-ready unpacked extension and verifies that its manifest, workers, MapLibre assets, popup, and icons are present. The Manifest V3 files in `public/` are copied into the build; the local-only background worker is bundled separately.

## What the extension supports

| Area          | MVP behaviour                                                                             |
| ------------- | ----------------------------------------------------------------------------------------- |
| Collection    | **Daily Challenge Free only**, after GeoGuessr has visibly shown the completed result.    |
| Active rounds | No collection, hint, overlay, inference, or live assistance.                              |
| Storage       | IndexedDB on this device; small preferences in `chrome.storage.local`.                    |
| Network       | The collector runs only on `geoguessr.com`; no product backend, cloud sync, or telemetry. |
| Other modes   | Unsupported and intentionally not collected.                                              |

The dashboard starts with useful empty states. Complete a supported game, reach GeoGuessr’s visible result screen, then open or refresh the dashboard to see locally saved history and analytics.

## Release and recovery

Use the Settings screen to make a versioned JSON backup before clearing extension data or upgrading a development build. Restore validates the entire backup before changing IndexedDB. CSV and GeoJSON are export-only formats.

Before publishing or sharing an unpacked build, run the [release checklist](docs/release-checklist.md). It includes the manual Chrome smoke test and the remaining real-world capture validation. See [exports](docs/exports.md) and [performance validation](docs/performance.md) for data portability and scale checks.

## Project structure

```text
src/app/             Angular dashboard application
public/              Manifest V3 and extension runtime assets
PRD/                 Product, design, and implementation-plan documents
```

See [`AGENTS.md`](./AGENTS.md) for project constraints and the no-commit policy for agents.
