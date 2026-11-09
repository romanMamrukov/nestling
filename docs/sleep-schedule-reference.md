# Sleep schedule reference — Unimums

Nestling's optional age-based forecasting reference is derived from the table on **page 2** of the supplied Russian-language document *«Время бодрствования и сна, таблица режима»* (Unimums, by Dr. Ekaterina Yuryeva). The table gives age, wake time between sleeps, expected number and duration of daytime naps, total daytime sleep, night sleep, and daily total sleep.

**Classification:** a practitioner's scheduling reference, not a clinical guideline, standardized normative dataset, or prospective validation of prediction accuracy. The table is not asserted to be superior to the AASM population-level total sleep recommendations.

## Data representation
The `schedule.js` module contains the source table ranges in **minutes**, with half-open completed-calendar-month age bands: `[minMonths,maxMonths)`. No user sleep data is transmitted. When the original table overlaps (10, 12, 18, and 24 months), the newer age band takes precedence at its beginning. The 4–7-year row is represented as **0–1 optional naps**, rather than requiring older children to nap.

| Completed months | Wake window | Daytime naps | Single nap | Total daytime sleep | Night sleep | Total sleep per 24h |
|---|---|---|---|---|---|---|
| 0 | 20–50 min | 4–8 | 15–240 min | 6–10 h | 8–10 h | 16–20 h |
| 1–2 | 50–80 min | 4–5 | 30–120 min | 6–8 h | 10–12 h | 14–17 h |
| 3 | 80–100 min | 3–4 | 30–120 min | 5–6 h | 10–12 h | 14–17 h |
| 4 | 90–120 min | 3–4 | 30–120 min | 4–5 h | 10–12 h | 14–16 h |
| 5 | 105–135 min | 3 | 30–120 min | 3–4 h | 10–12 h | 13–16 h |
| 6–7 | 150–180 min | 2–3 | 60–120 min | 3–4 h | 10–12 h | 13–15 h |
| 8–9 | 180–225 min | 2 | 60–120 min | 2–3 h | 11–12 h | 13–15 h |
| 10–11 | 210–270 min | 1–2 (1 uncommon) | 60–120 min | 2–3 h | 11–12 h | 13–14 h |
| 12–17 | 240–330 min | 1–2 | 60–120 min | 1.5–3 h | 11–12 h | 12.5–13 h |
| 18–23 | 240–360 min | 1 | 60–120 min | 1–2 h | 11–12 h | 12–13 h |
| 24–35 | 240–360 min | 1 | 60–120 min | 1–2 h | 11–12 h | 12–13 h |
| 36–47 | 300–360 min | 0–1 | 60–120 min if napping | 1–2 h if napping | 10–11 h | 12 h |
| 48–83 | ~360 min if napping | 0–1 | 60–120 min if napping | 1–2 h if napping | 10–11 h | 10–13 h |

The original table labels 8–10, 10–12, 12–18, 18–24 months and 4–7 years with overlapping ranges; these implementation boundaries are explicitly chosen to remove overlap, not quoted verbatim. The 1–2 month row includes two completed months. "1.20" is parsed as 1 hour 20 minutes (80 minutes), not decimal hours. The source is retained as **documentation** and is not redistributed in the repository.

## Prediction logic
1. Determine age by calendar birthday.
2. Select the applicable reference profile.
3. Review recent completed sleep records, classify daytime vs night using a heuristic, and exclude extreme or stale gaps.
4. Compute the midpoint of the reference wake window and blend with a robust historical median; the recent history weight increases only with usable samples, to a maximum of 55%.
5. Constrain predictions to the profile's wake interval. Use observed daytime nap count and user-defined bedtime to decide between next nap and bedtime.
6. Present an approximate range. With at least eight sequential retrospective error observations, widen or narrow the range based on the 80th percentile of those observed absolute errors; otherwise use a transparent heuristic range.
7. Display the profile's nap count, nap duration, daytime/nighttime sleep, and daily total alongside a **separate** broader AASM daily sleep-duration reference.

## Limitations and safety
- Retrospective matching to a family's recorded routine does not establish medical benefit or prospective accuracy.
- Wake window ranges are suggestions, never minimum or maximum safe physiological awake durations.
- Do not automatically force waking, delay feeds, or impose a sleep schedule on newborns; use caregiver judgment and pediatric advice.
- The PDF discusses bed-sharing and sleep positioners. None of that advice is incorporated into the application. Follow current safe-sleep recommendations from authoritative pediatric health bodies.
- Missing logs, night-waking misclassification, time-zone changes, nap transitions, and incomplete calendars may reduce accuracy.
- The app does not assess illness, clinical sleep disorders, infant breathing, or feeding needs.

## Testing
Run `npm test` to execute the age-band and forecasting tests as well as the v3 data-integrity and encryption tests. Device acceptance tests remain required before merging the branch to `main`.
