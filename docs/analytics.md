# Country performance analytics

Country performance is recalculated from normalized `RoundRecord` values each time it is requested. No metric is stored as source-of-truth data.

- A country metric includes rounds whose **actual** country resolved to that ISO alpha-3 code.
- Recognition is known only when both actual and guessed country codes are resolved. It is correct only when those codes are equal.
- Localization metrics—average/median/best score and average distance—use every attributed actual-country round, independently of recognition.
- An unresolved actual country remains in overall score/distance totals and is counted as unresolved, but is not assigned to a country metric or recognition denominator.
- Zero score, zero distance, skipped rounds, and timed-out rounds remain valid performance signals.

This keeps “I recognized the country” distinct from “I located it well within the country.”

## Confidence, trend, and status policy

The analytics policy is centralized in `DEFAULT_PERFORMANCE_POLICY`. Confidence is based on the number of rounds attributed to a country: 1–2 is very low, 3–5 low, 6–9 medium, and 10 or more high. The stated 10-round boundary is classified as high so it does not belong to two bands.

No country gets a strong presentational status until it has a high-confidence sample and a known recognition rate. At that point, recognition below 50% is **needs work**, 50%–79% is **learning**, and 80% or higher is **mastered**. This is presentational only; practice-ranking eligibility is defined separately in GGC-015.

Trends compare the latest three valid, dated rounds with the immediately preceding three. Until both windows are full, the trend is unavailable. A score change must be at least 250 points or a recognition change at least 10 percentage points to be meaningful. If the two signals conflict, the trend is neutral. These conservative windows prevent very small samples from implying a reliable improvement or decline.

## Country confusion policy

Confusion analysis groups resolved, incorrect country guesses by the resolved actual country. Each pair includes a count and its percentage of that country’s resolved incorrect guesses. Pairs are ranked by descending count, then guessed ISO alpha-3 code alphabetically for a stable tie-break. Correct guesses and missing guessed-country data are not confusion pairs; missing guesses are counted separately. A resolved actual country with no incorrect guesses is retained with an empty pair list, allowing the UI to show an intentional empty state. Unresolved actual countries cannot be attributed and are excluded.
