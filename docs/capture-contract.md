# Capture contract and supported-mode matrix

## Automatic collection behavior

The collector will be automatic once its adapter is implemented in GGC-005: the Manifest V3 content script is registered for GeoGuessr pages, so users will **not** start collection each day or for each game. This ticket defines that automatic behavior; it does not yet enable collection.

Automatic does not mean unrestricted. The collector must remain idle unless all of the following are true:

1. the current flow is a supported mode;
2. GeoGuessr has visibly shown the completed-result view;
3. the already-observed response matches the supported source; and
4. exactly one entry matches the signed-in player in memory.

The extension never issues a GeoGuessr request itself. It observes existing page traffic only.

## Boundary

```text
GeoGuessr content script
  → post-result gate and signed-in-player match
  → RawCaptureEnvelope
  → toParserInput()
  → NormalizedParserInput
  → future parser, repository, analytics, and UI
```

`RawCaptureEnvelope` is the only collector/parser boundary. `NormalizedParserInput` deliberately removes request metadata, DOM state, account data, and other players’ leaderboard entries. Those lower layers must never import collector or page-adapter code.

## Capture lifecycle

| Status        | Meaning                                                                              |
| ------------- | ------------------------------------------------------------------------------------ |
| `completed`   | One supported, post-result, signed-in-player game was passed to the parser boundary. |
| `skipped`     | A supported response was observed but did not represent a complete eligible result.  |
| `duplicate`   | A previously handled game/response identity was observed again.                      |
| `unsupported` | The page/game mode has no validated adapter.                                         |
| `failed`      | An expected supported flow could not be safely validated or transformed.             |

## Support matrix

| Mode                      | Status      | Behavior                                                                                              |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| Daily Challenge Free      | Supported   | Automatically observe the existing Free leaderboard response after the visible completed-result gate. |
| Standard single-player    | Unsupported | Do not collect; requires a separate validated result source.                                          |
| Daily Challenge Pro       | Unsupported | Do not collect; requires a separate validated result source.                                          |
| Challenge / replay        | Unsupported | Do not collect; requires fixture, timing, and replay-policy validation.                               |
| Competitive / duel / team | Unsupported | Do not collect; requires fairness and ownership validation.                                           |

## Data minimization

- Match the signed-in player in memory and immediately discard all non-matching leaderboard entries.
- Do not persist identity, nickname, avatar, rank, account bootstrap fields, headers, cookies, or request metadata.
- Do not read actual/guess fields before visible result evidence exists.
