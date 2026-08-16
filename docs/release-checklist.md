# Release checklist

- Run `npm test`, `npm run typecheck`, and `npm run build`.
- Load `dist/geoguessr-coach/browser` as an unpacked extension and test every route.
- Confirm the sole supported collector is Daily Challenge Free, only after a visible completed result; active rounds must produce no capture.
- Confirm no backend, telemetry, cloud storage, live hints, overlays, or extra GeoGuessr requests exist.
- Test JSON export → delete → restore, plus CSV and GeoJSON downloads.
- Run the 10,000-round performance fixture and record results.
- Confirm migration from existing v1/v2 databases and the local worker-backed map.
- Review the known limitation: supported-mode release validation still requires 50–100 manually observed completed rounds.
