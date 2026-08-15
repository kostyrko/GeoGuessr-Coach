# Capture fixtures

Capture fixtures are synthetic, version-controlled examples of the **selected signed-in player’s** post-result data. They never include real account IDs, nicknames, avatars, cookies, headers, leaderboard entries, challenge tokens, or captured gameplay values.

## Current fixtures

| Fixture                                           | Purpose                                                     |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `daily-challenge-free.completed.json`             | A complete, supported Daily Challenge Free result.          |
| `daily-challenge-free.expected-parser-input.json` | The exact parser output expected from the complete fixture. |
| `daily-challenge-free.partial.json`               | A malformed result with misaligned round and guess arrays.  |

## Fixture-first workflow for a new mode

1. Validate the mode’s post-result source and timing in a spike; do not add a collector first.
2. Create a synthetic raw fixture containing only the selected player’s necessary fields.
3. Add an expected parser-input fixture and a malformed/partial fixture.
4. Write contract tests proving full field-by-field normalization and safe failure for the malformed fixture.
5. Update the support matrix and only then implement the mode’s collector adapter.

Never copy a live response into the repository, even after redaction. Recreate only the minimal structure needed for the test.
