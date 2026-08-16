# Local storage

GeoGuessr Coach stores only normalized application records in browser IndexedDB through Dexie. Raw GeoGuessr responses do not enter this database.

The `geoguessr-coach` database currently has schema version 2:

- `games`: primary key `id`; indexed by played time, mode, source, and map.
- `rounds`: primary key `id`; indexed by game, round number, actual/guessed country, timestamp, and compound country-plus-timestamp keys for analytics.
- `settings`: singleton local preference record.
- `captureEvents`: normalized capture lifecycle status for inspection and backup.
- `metadata`: schema migration record.

The v1 → v2 migration adds capture-event storage and writes metadata without changing existing game or round records. The migration test opens a real v1 database, upgrades it, and verifies the gameplay history remains intact.

Repository APIs return `GameRecord`, `RoundRecord`, settings, and capture lifecycle records only. Export is an in-memory normalized backup contract; file import/export arrives in GGC-024.
