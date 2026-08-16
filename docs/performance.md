# Performance and storage-scale validation

Run `node scripts/generate-performance-fixture.mjs` to create an anonymized, repeatable 10,000-round input outside version control. Analytics remain derived on demand from IndexedDB records; no derived cache is authoritative. The World Map route is lazy-loaded because MapLibre plus bundled boundaries is intentionally large.

Release validation must import the generated fixture, measure Countries sorting, Practice recomputation, Overview load, and World Map interaction on the agreed target laptop. Record browser/version and elapsed timings in the release checklist before claiming the target-scale gate is complete.

The automated query-model benchmark recalculates 10,000 rounds within a five-second CI-safe budget. This protects algorithmic regressions; browser rendering and map-interaction measurements remain recorded release evidence rather than synthetic claims.
