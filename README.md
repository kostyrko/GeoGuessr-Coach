# GeoGuessr Coach

GeoGuessr Coach is a privacy-first Chrome extension that will analyze **completed** GeoGuessr rounds and recommend countries to practice. It must never provide live-round assistance or access hidden game information.

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
```

`npm start` serves the dashboard at `http://localhost:4200/`. It is useful for UI development; it does not emulate extension APIs.

## Load the extension in Chrome

1. Build the project with `npm run build`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `dist/geoguessr-coach/browser`.
5. Click the GeoGuessr Coach toolbar action to open the full-page dashboard.

The Manifest V3 files in `public/` are copied into the production build. `npm run build` also bundles the local-only background worker, which stores supported completed Daily Challenge Free games in IndexedDB. No collection occurs during active rounds or for unsupported modes.

## Project structure

```text
src/app/             Angular dashboard application
public/              Manifest V3 and extension runtime assets
PRD/                 Product, design, and implementation-plan documents
```

See [`AGENTS.md`](./AGENTS.md) for project constraints and the no-commit policy for agents.
