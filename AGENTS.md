# GeoGuessr Coach — Agent Guide

## Purpose and source of truth

GeoGuessr Coach is a privacy-first, local-only Chrome extension that learns from **completed** GeoGuessr rounds and recommends countries to practice. The product must never provide live-round assistance, hints, overlays, hidden information, or current-location inference.

Read these documents before making product decisions:

1. [`PRD/geoguessr_coach_prd.md`](PRD/geoguessr_coach_prd.md) — product requirements and acceptance definition.
2. [`PRD/geoguessr-coach-design-spec.md`](PRD/geoguessr-coach-design-spec.md) — UI/UX direction and accessibility expectations.
3. [`PRD/work-plan.md`](PRD/work-plan.md) — ticket order, dependencies, milestones, and acceptance criteria.

If a task conflicts with these documents, pause and ask for direction rather than silently changing product scope. The PRD and its no-live-assistance constraint take precedence over convenience or feature ideas.

## Repository status and implementation order

This repository starts blank. Follow the implementation order in the work plan; do not jump ahead of the capture feasibility work.

The critical sequence is:

```text
capture feasibility → capture contract/fixtures → normalized data model
→ local persistence/deduplication → analytics → recommendations → UI → export/release
```

The application’s architectural boundary must remain:

```text
GeoGuessr collector → raw payload → parser → normalized Game/Round
→ repository/IndexedDB → analytics → recommendation engine → Angular UI
```

Collector and parser code may understand GeoGuessr-specific DOM or payload details. No other layer may depend on them directly.

## Non-negotiable product constraints

- Capture only data that GeoGuessr has already revealed after a supported round completes.
- Do not inspect, display, infer, or act on hidden data during an active round.
- Keep the MVP local-first: no account, backend, cloud database, or analytics tracking by default.
- Raw normalized games and rounds are the source of truth. Derived metrics, map values, and recommendations must be recalculable.
- Keep recognition (correct country identification) separate from localization (score/location quality).
- Recommendations must be deterministic, explainable, and confidence-aware; insufficient data must lead to an honest empty state rather than a fabricated recommendation.
- Isolate all undocumented/external GeoGuessr behavior behind collector/parser adapters and protect it with anonymized fixtures.

## Ticket workflow

Work on one ticket or tightly coupled ticket slice at a time.

Before implementation:

- Locate the ticket in `PRD/work-plan.md` and read its dependencies and acceptance criteria.
- Confirm prerequisite tickets or required decisions are complete. If a required product decision is unresolved, record the blocker and ask for direction.
- Inspect the existing worktree before editing. Preserve unrelated user changes.
- State any assumption that materially affects scope, storage format, capture behavior, or recommendation logic.

While implementing:

- Keep changes small, cohesive, and scoped to the active ticket.
- Prefer typed boundaries and narrow interfaces over cross-layer shortcuts.
- Put test fixtures under version control and remove/anonymize any personal, session, or credential data.
- Add or update tests alongside behavior changes. Do not suppress lint/type/test failures without explaining why.
- Use accessible semantics, keyboard support, visible focus, and non-color-only status indicators for UI work.
- Follow the design spec: dark, information-dense dashboard; conservative glassmorphism; purple accent; clear semantic performance states.

Before handoff:

- Run the smallest relevant checks first, then the project’s standard lint, type, unit, build, and E2E checks when applicable.
- Report the ticket, files changed, commands run, test result, and any remaining limitation or follow-up.
- Verify that the ticket’s acceptance criteria—not merely the code change—are satisfied.

## Data, storage, and imports

- Use IndexedDB (via Dexie) for durable gameplay data and `chrome.storage.local` only for small preferences.
- Maintain explicit schema versions and migrations. Test migration behavior before changing persisted models.
- Round persistence must be idempotent across duplicate page/network events, reruns, and browser restarts.
- Treat unresolved countries and malformed/partial records explicitly; do not silently coerce them into misleading metrics.
- Validate a full import before modifying stored data. An invalid backup must not partially corrupt existing data.
- Test JSON export → import round trips for equivalent core data and derived analytics.

## Testing expectations

At minimum, protect these behaviors with automated tests when their related code is added or changed:

- parser normalization against anonymized payload fixtures;
- round identity and deduplication;
- country resolution, borders, territories, and missing coordinates;
- recognition, localization, confidence, trend, confusion, and ranking calculations;
- migration and JSON backup round-trip behavior;
- dashboard E2E flows for history, analytics, practice queue, settings, and import/export.

For capture behavior, include a test or verifiable guard that confirms no capture occurs during an active round.

## Git and workspace rules

- **Do not create commits.** Agents must never run `git commit`, amend commits, rewrite history, force-push, push branches, open pull requests, or alter remotes.
- Do not stage changes with `git add` unless the user explicitly asks for staging.
- Do not discard, reset, checkout over, delete, or overwrite unrelated worktree changes.
- Use `git status`, `git diff`, and targeted read-only inspection to understand existing work.
- Make file edits through the approved patch workflow. Keep generated artifacts, local databases, packaged builds, and secrets out of version control unless the task explicitly requires a checked-in asset.

## External services and dependencies

- Do not add a backend, cloud sync, telemetry, or third-party tracking without explicit user approval; these are outside the MVP.
- Prefer bundled/offline country boundary data and avoid runtime geocoding.
- Keep Chrome extension permissions minimal. Any new permission must have a documented product need and be checked against the no-live-assistance constraint.
- Do not add packages merely for convenience. Favor the selected stack in the PRD: Angular, TypeScript, SCSS, Dexie, Apache ECharts, MapLibre GL JS, and Playwright.
- Before changing dependency versions or extension permissions, explain the need and verify compatibility with the existing workspace.

## Documentation rules

- Update the work plan when ticket scope, dependencies, acceptance criteria, or completion status materially changes.
- Record material technical/product decisions next to the work they unblock, including the alternatives considered and their consequence.
- Keep the README current with setup, test, build, unpacked-extension, and supported-mode instructions as the project is created.
- Do not present an unresolved assumption as a settled product decision.
