# Follow-up: date format, Activity Progress %, Project Overview / Quality check

Apply Parts 1–4 in **SDH Scheduling Model (4).pbix**, then publish with **Replace** (keeps dataset ID `9a88558d-…` used by the v44 auto-refresh).
Apply Part 5 in **SDH Project Scheduling Dashboard (4).pbix**, then publish.

---

## 1. Activity Progress % shows 0.22 instead of 22%

The measure is right: it now returns 0–1 (0.22 = 22%). Only its format was not changed.

1. Model view → Data pane → `_Measures` → **Activity Progress %**.
2. Properties → **Formatting**:
   - **Format**: `Percentage` (or keep *Decimal number* and set **Percentage format** = **Yes**)
   - **Decimal places**: `0`

This matches **Construction Actual Progress %** (`0%;-0%;0%`).

Expected for 24087 / 2026-10-23: *31 00 00 - Excavation et remblais* **22%**, every other code **0%**.
That is consistent with the **Construction Progress** card (1%): construction started 2026-09-14, and by the status date only excavation has progressed.

---

## 2. Every date as `yyyy-MM-dd`

**Cause.** The contractual date is a text measure that calls `FORMAT(…, "yyyy-MM-dd")`, so it is fixed.
Every other date uses the model format **Short Date**, which follows the viewer's locale. That gives `10/23/2026` in English (US).

**Fix.** Give each date field the format `yyyy-MM-dd` in the model. Every visual that uses the field follows (cards, tables, slicers, tooltips); no report change is needed.

**How, for a column:** Model view → select the column → Properties → Formatting → **Date time format** = `Custom` → **Custom format** = `yyyy-MM-dd`.
In Report view you can instead use **Column tools → Format** and type `yyyy-MM-dd`.

**How, for a measure:** select it → Properties → Formatting → **Format** = `Custom` → `yyyy-MM-dd`.

### 2a. Columns shown in the report → `yyyy-MM-dd`

| Table | Column | Where it shows |
|---|---|---|
| sdh_schedulesnapshot | `sdh_snapshotdate` | Snapshot Date slicer on every page |
| sdh_schedulesnapshot | `sdh_statusdate` | Portfolio *Status Date*, Gantt |
| sdh_schedulesnapshot | `sdh_constructionstartdate` | Portfolio *Start Date* |
| sdh_schedulesnapshot | `sdh_substantialcompletiondate` | Portfolio and Overview *Substantial Completion* |
| sdh_schedulesnapshot | `sdh_constructionfinishdate` | Portfolio *Construction Finish Date* |
| sdh_schedulesnapshot | `sdh_projectfinishdate` | Overview *Full Schedule Finish Date* |
| sdh_scheduletaskversion | `sdh_startdate` | Explorer / Lookahead Gantt |
| sdh_scheduletaskversion | `sdh_finishdate` | PPC *Missed Commitments* → Forecast Finish, Gantt |
| sdh_importrun | `sdh_snapshotdate` | Data Health table |
| Progress Trend Axis | `Date` | Schedule Progress Trend tooltip |

Recommended too, so any future visual is already right (none is on a page today):
`sdh_scheduletaskversion`: `sdh_actualstart`, `sdh_actualfinish`, `sdh_plannedstart`, `sdh_plannedfinish`, `sdh_referencestart`, `sdh_referencefinish`, `sdh_constraintdate`, `sdh_deadlinedate`;
`sdh_ppcresult`: `sdh_plannedfinishdate`, `sdh_actualfinishdate`, `sdh_planningweekstart`, `sdh_planningweekend`;
`sdh_schedulesnapshot`: `sdh_fullschedulestartdate`.

### 2b. Timestamps (keep the time) → `yyyy-MM-dd HH:mm`

| Table | Column | Where it shows |
|---|---|---|
| sdh_importrun | `sdh_startedat`, `sdh_completedat` | Data Health table and chart |

Leave `createdon` / `modifiedon` alone; they are not shown.

### 2c. Measures

| Measure | New format | Where it shows |
|---|---|---|
| `Executive Status Date` | `yyyy-MM-dd` | Overview *Status Date* card |
| `PPC Planned Finish Derived` | `yyyy-MM-dd` | PPC *Missed Commitments* → Planned Finish |
| `PPC Actual Finish Derived` | `yyyy-MM-dd` | PPC *Missed Commitments* → Actual Finish |
| `Lookahead Window Start`, `Lookahead Window End` | `yyyy-MM-dd` | Lookahead cards |
| `Admin Latest Import Date` | `yyyy-MM-dd HH:mm` | Data Health card |

### 2d. Text measures that build the date in DAX (edit the formula)

| Measure | Replace | With |
|---|---|---|
| `Last Refresh Display` (refresh label, every page) | `"MMM d, yyyy h:mm AM/PM"` | `"yyyy-MM-dd HH:mm"` |
| `Lookahead Window Label` (2 places) | `"MMM d, yyyy"` | `"yyyy-MM-dd"` |
| `PPC Delay Comments Derived` (2 places) | `"MMM d, yyyy"` | `"yyyy-MM-dd"` |

**Not affected:** the labels under the line charts (`Sep 27`, `Jan 2027`). Power BI chooses those itself on a continuous date axis.
**Check after publishing:** the Gantt custom visual on Explorer / Lookahead may format dates itself. If it still shows `10/23/2026`, look for a date-format option in that visual's format pane.

---

## 3. Overview: Total Tasks and Open Tasks count different things

**Cause.** `Overview Total Tasks` reads `sdh_totalrows`, which is every row of the MS Project export, including summary (WBS) rows.
The header (`3,422`) and *Open Tasks* (`3,366`) count real tasks only.
So *Open Tasks* shows `3,366 of 3,836 (87.7%)`, which divides open tasks by a total that includes 414 summary rows.

**Fix.** Replace `Overview Total Tasks` (`Overview Open Tasks %` and the display measures follow automatically):

```dax
Overview Total Tasks = [Reference Tasks Eligible]
```

Expected after the fix:

| Snapshot | Total Tasks | Open Tasks |
|---|---|---|
| 24087 / 2026-10-23 | 3,422 | 3,366 of 3,422 (98.4%) |
| 232408 / 2026-10-16 (checked on the export) | 1,048 | 148 of 1,048 (14.1%) |

---

## 4. Overview "Schedule Quality" table rounds to whole percents

Overview shows *Missing Logic* **0%** (green) while Quality shows **0.09%** (3 tasks), so the two pages look different.

In `Health Check Display`, replace

```dax
FORMAT(KPIValuess, "0%")
```

with

```dax
FORMAT(KPIValuess, "0.00%")
```

Expected: 0.09% / 2.02% / 93.32% / 61%, the same figures as the Quality cards.

---

## 5. Report fixes (dashboard pbix)

| Page | Visual | Change |
|---|---|---|
| PPC | Cards `Construction Misssed` / `Procurement Misssed` | Title → `Construction Missed` / `Procurement Missed` (the first one also has a leading space) |
| Project Overview, Quality | Header card `3,391 of 3,422 tasks have reference…` | Text is cut off: widen the card (or reduce its font) until `…reference dates` shows |
| Quality | Quality Trend | X-axis title shows the field name `sdh_snapshotdate` → Format → X-axis → Title → `Snapshot Date` |
| Quality | Card *Construction Activity Code Coverage %* | Add the subtitle `Target ≥ 95%` like the other KPI cards (the colour already uses 95%) |

---

## 6. Value check: Project Overview and Quality (24087 Le Highlands, 2026-10-23)

The model data can't be read outside Power BI. So each value was checked against (a) the same figure on another page or in the Data Quality table, and (b) the DAX behind it.

### Project Overview

| Card | Shown | Check | Result |
|---|---|---|---|
| Construction 4-Week PPC | 46.7% red | PPC page: 7 / 15 met = 46.7%; < 70% → red | ✓ |
| Current Quality Score | 61% red | Quality page: 61/100, grade D | ✓ |
| Contractual / Substantial / Full Schedule Finish | 2029-04-19 / 4/18/2029 / 4/19/2029 | Same as the Portfolio row | ✓ (format: Part 2) |
| Construction Progress + activity table | 1% / Excavation 22%, others 0% | Consistent (Part 1) | ✓ (format: Part 1) |
| Schedule Quality table | 0% / 2% / 93% / 61% | Quality: 0.09% / 2.02% / 93.32% / 61 | ✓ values, rounding (Part 4) |
| Total Tasks / Open Tasks | 3,836 / 3,366 of 3,836 (87.7%) | Different populations | ✗ **Part 3** |
| Reference header | ✓ Recorded, 3,391 of 3,422 | 99% ≥ 90% → green | ✓ (text cut off: Part 5) |
| PPC Trend, Quality Trend | | Same series as PPC and Quality pages | ✓ |

### Quality: each % card = numerator / denominator from the Data Quality table

| KPI | Calculation | Shown | Target | Colour |
|---|---|---|---|---|
| Missing Logic | 3 / 3,366 | 0.09% | ≤ 5% | green ✓ |
| FS Links | 4,604 / 4,748 | 96.97% | ≥ 80% | green ✓ |
| Leads | 1,124 / 4,748 | 23.67% | ≤ 10% | red ✓ |
| Lags | 101 / 4,748 | 2.13% | ≤ 10% | green ✓ |
| Avg. Predecessors | 4,748 / 3,366 | 1.41 | ≥ 1.5 | red ✓ |
| Construction Activity Code Coverage | 3,044 / 3,262 | 93.32% | ≥ 95% | red ✓ |
| Critical | 260 / 3,366 | 7.72% | 10–30% | red ✓ |
| High Float | 2,454 / 3,366 | 72.91% | ≤ 5% | red ✓ |
| Long Duration | 114 / 3,366 | 3.39% | ≤ 10% | green ✓ |
| Hard Constraints | 0 / 3,366 | 0.00% | ≤ 2% | green ✓ |
| Negative Float | 2 / 3,366 | 0.06% | 0% | red ✓ |
| Invalid Dates | 68 / 3,366 | 2.02% | 0% | red ✓ |

**Global score:** the KPIs that pass are Missing Logic (17) + Hard Constraints (17) + FS Links (11) + Lags (8) + Long Duration (8) = **61** → grade **D**, red. ✓

**Correct, but the client may ask:**

- **Leads 23.67%.** 1,124 links have a negative lag (for example `FD-2j`). The import counts any negative lag as a lead, which is the DCMA rule. That is a lot of overlap in this schedule, but it isn't a calculation error.
- **High Float 72.91%.** It uses MS Project's own total float (*Marge totale*) > 44 days on open tasks.
- **Data Quality table.** *Numerator / Denominator / Target / Status* are blank on the count rows by design. They are filled on the `%` rows further down the table.
- **Construction Task Count 3,262 vs Active Tasks 3,366.** Coverage counts all construction tasks, finished ones too, because every construction task should carry a code. The other KPIs use open tasks only.
- **Finished tasks in High Float / Critical / Negative Float.** These counts don't exclude finished tasks, but MS Project gives finished tasks 0 float and no critical flag. On the 232408 export, 0 of 900 finished tasks were counted. No effect on the values.

### Also noticed on the Portfolio

- **Active Projects 10 vs 13 rows.** The card leaves out projects whose MS Project % complete is 100%; the table lists every project's latest snapshot. So 3 of the 13 rows are finished schedules.
- **Contractual End Date "N/A".** A date appears only when the schedule has a task named exactly **`Fin contractuelle`**. The 232408 export has none (its milestones are *Achèvement substantiel* and *Fin des travaux (45jrs après subsantiel)*), so N/A is correct there. The other N/A projects most likely have the same gap; ask the planners to add that milestone.
- **Full Schedule Progress / Procurement Progress** use MS Project's own % complete (duration-weighted). Construction progress is calculated at the status date. If the client asks the "same method?" question for these two cards, the answer is no.
