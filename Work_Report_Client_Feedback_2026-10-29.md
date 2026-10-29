# SDH Scheduling Dashboard: work report

**Date:** 2026-10-29
**Scope:** your feedback on Project Portfolio, Project Overview and PPC, and the P6 Gantt missing tasks

## Project Portfolio

- **Contractual End Date** is now shown as `yyyy-MM-dd`, like the other dates.

## Project Overview

- **Title:** renamed from "Executive Overview" to **Project Overview**, to match the left bar.
- **Construction Progress card:** now colour-coded with the same rule as the Portfolio table. Green means on or ahead of plan, amber up to 5% behind, red more than 5% behind.
- **Progress by Activity Code:** now calculated exactly like Construction Progress, with construction tasks weighted by duration at the status date. Before, it was a simple average of task % complete.
- **Reference dates header:** the 784 was correct, but it included WBS summary rows and gave no total. The header now reads "*N* of *M* tasks have reference dates" and counts real tasks only, on the same basis as the ✓ / ⚠ status. It turns amber below 90%. For 232408 that is about 66%, so it shows ⚠ Partial. Most tasks without reference dates were added after the baseline was saved, and MS Project only gives them reference dates when the planner re-baselines.
- **Contractual End Date card:** now in `yyyy-MM-dd`. It also shows when you pick an older snapshot date; before, it showed N/A.
- **Total Tasks / Open Tasks:** Total Tasks included the WBS summary rows. For 24087, Open Tasks now reads 3,366 of 3,422 (98.4%), not 3,366 of 3,836 (87.7%).
- **Schedule Quality table:** now shows two decimals (for example, Missing Logic 0.09%), the same figures as the Quality page.

## PPC

- **Missed By Activity Code** now adds up to the same total as **Delay Causes for Missed Commitments**. The activity-code chart used to have three differences:
  - it included procurement tasks;
  - it skipped missed tasks that have no activity code;
  - it counted snapshots after the selected date.
- Both charts now follow the same rules. Missed tasks without a code appear under a **No activity code** bar.
- **Card titles:** corrected to "Construction Missed" and "Procurement Missed".

## All pages: date format

- Every date is now `yyyy-MM-dd`: slicers, cards, tables, tooltips and the Gantt timeline.
- Import times and the "last refresh" label are `yyyy-MM-dd HH:mm`.

## Quality page

- **All values checked:**
  - each percentage equals its numerator ÷ denominator in the Data Quality table;
  - each colour matches its target;
  - the global score of 61 (grade D) adds up.
- **High values:** Leads (23.67%) and High Float (72.91%) on 24087 come from the schedule itself, not from a calculation error.
- **Display fixes:**
  - the Quality Trend axis title reads "Snapshot Date";
  - the Activity Code Coverage card shows "Target ≥ 95%" like the other cards;
  - the reference dates header is no longer cut off.

## Schedule Explorer and Lookahead: the P6 Gantt now shows all tasks

- **Cause:** Power BI sends a custom visual only its first 1,000 rows unless the visual asks for more. The P6 Gantt, a free AppSource visual, doesn't ask for more, so large schedules were cut off. Beaubassin stopped at 8.6 TOITURE.
- **Fix:** both Gantts now use a copy of the same visual with the limit raised to 30,000 rows, which is Power BI's maximum. Nothing else in the visual changed, and all tasks now appear.
- **Limits of the copy:** Microsoft hasn't certified it, so the Gantt is blank in Export to PowerPoint and in email subscriptions. It also doesn't update automatically. If the author adds the row limit to the official version, we can switch back.

## Also in this release

- **Automatic refresh (solution v44):** the dashboard data now refreshes as soon as a schedule import finishes, with no manual refresh.

## Still open

- **Gantt WBS numbers:** from level 3 down, they show leading zeros (`02.02.01` instead of `2.2.1`). We know the cause and the fix is ready; it will be in the next update.

## For your planners (schedule data)

- **Contractual End Date:** the dashboard reads it from a milestone named exactly **Fin contractuelle**.
  - In Beaubassin the milestone is spelled "Fin contactuelle" (missing "r"), so the date shows N/A.
  - 232408 has no such milestone, so it shows N/A too.
- **25009 L'Horizon:** the contractual end date (2025-02-06) is the same day as construction start. Please check that milestone.
