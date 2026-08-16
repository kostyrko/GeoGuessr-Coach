# Completed-round ingestion

GGC-009 connects the automatic collector to local storage:

```text
post-result collector → raw capture envelope → parser → normalized Game/Round
→ offline country resolver → atomic IndexedDB write
```

The Chrome service worker is compiled from `src/extension/background.ts` during `npm run build`. It accepts capture messages only from a GeoGuessr tab, then delegates all payload handling to the typed capture adapter.

The deterministic normalized game ID is the atomic deduplication key. If the same completed game is observed again—whether through fetch/XHR overlap, a content-script rerun, or a service-worker restart—the repository returns `duplicate` and writes neither an additional game nor additional rounds.

Only the post-result collector produces raw envelopes. The parser immediately converts them to application input, and IndexedDB receives normalized records plus resolved or explicitly unresolved ISO country fields.
