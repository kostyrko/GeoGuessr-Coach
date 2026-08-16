# Local exports and restore

Settings provides three local downloads: the canonical versioned JSON backup, one-row-per-round CSV, and GeoJSON point features. JSON is the only restore format. Restore validates the format, schema version, timestamps, record identities, coordinate bounds, duplicate IDs, and game-to-round links before its single IndexedDB transaction begins. An invalid backup changes nothing.

CSV uses the PRD’s stable headers. GeoJSON emits two point features per round: an `actual` and a `guess`, each with game/round, score, distance, time, and country-correctness metadata. Coordinates are normalized values already saved locally; no export sends data to a service.
