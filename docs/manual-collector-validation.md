# Manual collector validation

## Purpose

Validate the automatic Daily Challenge Free collector against real completed games. The extension must already be installed and enabled; users do not start collection per day or per game.

## Setup

1. Run `npm run build`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Use **Load unpacked** for the first installation, or **Reload** GeoGuessr Coach after a new build.
4. Open the extension’s **Service worker** inspector from its card on `chrome://extensions`.

## Validation procedure

1. Open GeoGuessr and play a Daily Challenge Free game normally.
2. While a round is active, confirm the service-worker console shows no capture event.
3. Finish the game and wait for GeoGuessr’s visible result view.
4. Confirm exactly one `raw-capture` event and one `completed` lifecycle event appear in the service-worker console.
5. Confirm the event contains only one selected game and its rounds/guesses—never other leaderboard entries, nickname, rank, avatar, cookies, or headers.
6. Reload the GeoGuessr result page or trigger the same response again. Confirm a `duplicate` lifecycle event appears rather than a second raw capture.
7. Test an unsupported mode. Confirm no raw capture is emitted and an `unsupported` or `skipped` lifecycle result is recorded when applicable.

## Evidence to record

For each validated game, record only:

- date and supported mode;
- whether the completed-result UI was visible;
- lifecycle statuses and raw-capture count; and
- any failure reason.

Do not copy game coordinates, player identity, response bodies, cookies, request headers, or screenshots containing those values into repository files or chat.

## Release gate

Repeat the procedure across 50–100 manually validated completed Daily Challenge Free games before marking GGC-005 complete or expanding mode support.
