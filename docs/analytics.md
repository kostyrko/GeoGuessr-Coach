# Country performance analytics

Country performance is recalculated from normalized `RoundRecord` values each time it is requested. No metric is stored as source-of-truth data.

- A country metric includes rounds whose **actual** country resolved to that ISO alpha-3 code.
- Recognition is known only when both actual and guessed country codes are resolved. It is correct only when those codes are equal.
- Localization metrics—average/median/best score and average distance—use every attributed actual-country round, independently of recognition.
- An unresolved actual country remains in overall score/distance totals and is counted as unresolved, but is not assigned to a country metric or recognition denominator.
- Zero score, zero distance, skipped rounds, and timed-out rounds remain valid performance signals.

This keeps “I recognized the country” distinct from “I located it well within the country.”
