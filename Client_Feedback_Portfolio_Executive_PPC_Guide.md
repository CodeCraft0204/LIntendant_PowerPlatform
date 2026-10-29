# Client feedback (Portfolio / Project Overview / PPC): diagnosis and fix guide

Files:

- **Semantic model:** `SDH Scheduling Model (4).pbix` (Part A, all DAX changes)
- **Report:** `SDH Project Scheduling Dashboard (4).pbix` (Part B, visual changes)

Do Part A first, publish it, then do Part B. The report is live-connected to the model.

| # | Client point | Cause | Fix |
|---|---|---|---|
| 1 | Portfolio: contractual date format still wrong | `Portfolio Contractual End Date Display` uses `FORMAT(…, "M/d/yyyy")`. Every other date column is `yyyy-MM-dd`. | A1 |
| 2 | Executive: contractual date format still wrong | The *Contractual End Date* card uses the same measure. | A1 |
| 3 | Executive: title should match the left bar | The page is called **Project Overview** in the left bar, but the title text box says **Executive Overview**. | B1 |
| 4 | Executive: colour on Construction progress | The *Construction Progress* card has no font-colour rule. The colour measure already exists (it colours the Portfolio column). | B2 |
| 5 | Executive: is activity-code progress calculated like construction progress? | **No.** `Activity Progress %` is a plain average of `% complete` over every task with the code. Construction progress is duration-weighted (working minutes), evaluated at the status date, over construction tasks. | A2 |
| 6 | Executive: "784 of 1179 tasks"? | The count is correct, but it's ambiguous. It counts **all rows including summary rows**, while the ✓/⚠ status uses non-summary tasks only. The rows without dates are mostly tasks added after the baseline was saved. | A3 |
| 7 | PPC: missed-by-activity-code total ≠ delay-causes total | The two charts count different populations (details in A4). | A4 |

---

## Part A: Semantic model (`SDH Scheduling Model (4).pbix`)

Open the file in Power BI Desktop. All measures are in the `_Measures` table.
To edit a measure, select it in the Data pane, replace the whole text in the formula bar, and press Enter.

### A1. Contractual end date format (fixes #1 and #2)

**Step 1.** Replace `Portfolio Contractual End Date Display`:

```dax
Portfolio Contractual End Date Display =
VAR ContractualDate =
    [Portfolio Contractual Task Finish]

RETURN
IF(
    ISBLANK(ContractualDate),
    "N/A",
    FORMAT(ContractualDate, "yyyy-MM-dd")
)
```

**Step 2 (recommended, an extra bug found during the review).** `Portfolio Contractual Task Finish` only reads the **latest** snapshot. On Project Overview, picking an older snapshot date makes the *Contractual End Date* card show "N/A". Replace it so Project Overview uses the snapshot picked in the slicer, while Portfolio (no date slicer) keeps using the latest snapshot:

```dax
Portfolio Contractual Task Finish =
-- Project Overview has a snapshot-date slicer: use the snapshot picked there.
-- Project Portfolio has no date slicer: use each project's latest snapshot.
VAR UseSelectedSnapshot =
    ISFILTERED('sdh_schedulesnapshot'[sdh_snapshotdate])
        && HASONEVALUE('sdh_schedulesnapshot'[sdh_snapshotdate])

VAR EligibleSnapshots =
    CALCULATETABLE(
        VALUES('sdh_schedulesnapshot'[sdh_schedulesnapshotid]),
        KEEPFILTERS(
            FILTER(
                VALUES('sdh_schedulesnapshot'[Is Latest Snapshot]),
                UseSelectedSnapshot
                    || 'sdh_schedulesnapshot'[Is Latest Snapshot] = 1
            )
        ),
        KEEPFILTERS('sdh_schedulesnapshot'[sdh_islatestrevision] = TRUE())
    )

RETURN
CALCULATE(
    MAX('sdh_scheduletaskversion'[sdh_finishdate]),
    KEEPFILTERS('sdh_scheduletaskversion'[sdh_tasknameraw] = "Fin contractuelle"),
    TREATAS(EligibleSnapshots, 'sdh_scheduletaskversion'[sdh_snapshot])
)
```

> Data note, not a report bug: **25009 L'Horizon** shows a contractual end of 2025-02-06 (displayed today as `2/6/2025`). That is the same day as its construction start date. Ask the planner to check the *Fin contractuelle* milestone in that schedule.

### A2. Activity-code progress calculated like construction progress (fixes #5)

**Why:** the old measure was `AVERAGEX('sdh_taskactivitycode', RELATED(…[sdh_percentcomplete]))`. That's a simple average, so a 1-day task weighs as much as a 3-month task, and the result isn't tied to the status date.
The new measure uses exactly the rules of `Executive Actual Progress % - Calendar Test` at the status date, the same rules behind the *Construction Progress* card:

- construction tasks only (on 232408, 944 of the 946 tasks with an activity code are under CONSTRUCTION)
- each task weighted by its working-minute duration
- finished tasks count 100%; tasks not started by the status date count 0%; tasks in progress count their MS Project % complete

**Step 1.** Replace `Activity Progress %`:

```dax
Activity Progress % =
-- Same method and task rules as [Construction Actual Progress %] at the status date,
-- restricted to the tasks carrying the activity code(s) in the current filter context.
VAR ProjectNumber =
    SELECTEDVALUE('sdh_schedulesnapshot'[sdh_projectnumber])

VAR SnapshotDate =
    SELECTEDVALUE('sdh_schedulesnapshot'[sdh_snapshotdate])

VAR Revision =
    CALCULATE(
        MAX('sdh_schedulesnapshot'[sdh_snapshotrevision]),
        REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotrevision]),
        'sdh_schedulesnapshot'[sdh_projectnumber] = ProjectNumber,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = SnapshotDate
    )

VAR StatusDate =
    [Executive Trend Status Date]

VAR StatusPosition =
    MAXX(
        FILTER(
            ALL('sdh_workcalendarday'),
            'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
                && 'sdh_workcalendarday'[Calendar Date Only]
                    = DATE(YEAR(StatusDate), MONTH(StatusDate), DAY(StatusDate))
        ),
        'sdh_workcalendarday'[sdh_cumulativeworkingminutesthroughdate]
    )

VAR CodeTaskKeys =
    VALUES('sdh_taskactivitycode'[TV Match Key])

VAR CodeTasks =
    FILTER(
        ALL('sdh_scheduletaskversion'),
        'sdh_scheduletaskversion'[sdh_projectnumber] = ProjectNumber
            && 'sdh_scheduletaskversion'[sdh_snapshotdate] = SnapshotDate
            && 'sdh_scheduletaskversion'[sdh_snapshotrevision] = Revision
            && 'sdh_scheduletaskversion'[Is Construction Task] = TRUE()
            && NOT ISBLANK('sdh_scheduletaskversion'[Current Start Work Minute Position])
            && NOT ISBLANK('sdh_scheduletaskversion'[Current Finish Work Minute Position])
            && 'sdh_scheduletaskversion'[Current Finish Work Minute Position]
                > 'sdh_scheduletaskversion'[Current Start Work Minute Position]
            && 'sdh_scheduletaskversion'[TV Match Key] IN CodeTaskKeys
    )

VAR TotalWeight =
    SUMX(
        CodeTasks,
        'sdh_scheduletaskversion'[Current Finish Work Minute Position]
            - 'sdh_scheduletaskversion'[Current Start Work Minute Position]
    )

VAR WeightedProgress =
    SUMX(
        CodeTasks,

        VAR CurrentStart =
            'sdh_scheduletaskversion'[Current Start Work Minute Position]

        VAR CurrentFinish =
            'sdh_scheduletaskversion'[Current Finish Work Minute Position]

        VAR PercentComplete =
            DIVIDE(COALESCE('sdh_scheduletaskversion'[sdh_percentcomplete], 0), 100)

        VAR ActualFinish =
            COALESCE(
                'sdh_scheduletaskversion'[Actual Finish Work Minute Position],
                IF(PercentComplete >= 1, CurrentFinish)
            )

        VAR ActualStart =
            COALESCE(
                'sdh_scheduletaskversion'[Actual Start Work Minute Position],
                IF(PercentComplete > 0 || NOT ISBLANK(ActualFinish), CurrentStart)
            )

        VAR IsFinished =
            NOT ISBLANK(ActualFinish) && ActualFinish > ActualStart

        VAR TaskProgress =
            SWITCH(
                TRUE(),
                ISBLANK(ActualStart), 0,
                StatusPosition <= ActualStart, 0,
                IsFinished,
                    MIN(1, DIVIDE(StatusPosition - ActualStart, ActualFinish - ActualStart, 0)),
                PercentComplete
            )

        RETURN
            (CurrentFinish - CurrentStart) * TaskProgress
    )

RETURN
IF(
    ISBLANK(ProjectNumber)
        || ISBLANK(SnapshotDate)
        || ISBLANK(StatusPosition)
        || TotalWeight <= 0,
    BLANK(),
    MIN(1, MAX(0, DIVIDE(WeightedProgress, TotalWeight)))
)
```

**Step 2. Important: change the format.** The old measure returned 0–100 with the format `0"%"`. The new one returns 0–1.
With the measure selected: **Measure tools → Format → Percentage**, decimal places **0**.
If you skip this, the table shows `0%`/`1%` everywhere.

### A3. Reference-dates header: make the count unambiguous (answers #6)

**What the numbers are today**, checked on the 232408 export of 2026-10-16:

| | Rows |
|---|---|
| All rows (*Total Tasks* card) | 1,173 |
| Rows with a reference start or finish (**the "784 tasks" text**) | **784** |
| Summary rows | 125 (88 with reference dates) |
| Non-summary tasks | 1,048 |
| Non-summary tasks with reference dates (used by the ✓/⚠ status) | **696 (66% → "⚠ Partial")** |

The 2026-10-23 snapshot has 1,179 rows and still 784 with reference dates: 6 new tasks, none of them baselined.
So yes, 784 is right. About 395 rows have no reference start or finish. Most are tasks added after the baseline was saved (their *Créée* dates run from 2025 to 2026), and MS Project only gives a task baseline dates when the planner re-baselines it.
The text is misleading in two ways: it includes summary rows, and it shows no denominator. The colour is also green even when the status is "⚠ Partial".

**Step 1.** Replace `Reference Tasks Recorded`, which now excludes summary rows:

```dax
Reference Tasks Recorded =
VAR D = [Selected Snapshot Date]
VAR R = [Selected Snapshot Revision]

RETURN
CALCULATE(
    COUNTROWS('sdh_scheduletaskversion'),
    'sdh_scheduletaskversion'[sdh_issummary] = FALSE(),
    FILTER(
        'sdh_scheduletaskversion',
        NOT ISBLANK('sdh_scheduletaskversion'[sdh_referencestart])
            || NOT ISBLANK('sdh_scheduletaskversion'[sdh_referencefinish])
    ),
    TREATAS({ D }, 'sdh_scheduletaskversion'[sdh_snapshotdate]),
    TREATAS({ R }, 'sdh_scheduletaskversion'[sdh_snapshotrevision])
)
```

**Step 2.** Create a **new measure** `Reference Tasks Eligible`, the denominator:

```dax
Reference Tasks Eligible =
VAR D = [Selected Snapshot Date]
VAR R = [Selected Snapshot Revision]

RETURN
CALCULATE(
    COUNTROWS('sdh_scheduletaskversion'),
    'sdh_scheduletaskversion'[sdh_issummary] = FALSE(),
    TREATAS({ D }, 'sdh_scheduletaskversion'[sdh_snapshotdate]),
    TREATAS({ R }, 'sdh_scheduletaskversion'[sdh_snapshotrevision])
)
```

**Step 3.** Replace `Reference Planning Coverage %`, so the status uses the same two numbers that are shown:

```dax
Reference Planning Coverage % =
DIVIDE([Reference Tasks Recorded], [Reference Tasks Eligible])
```

**Step 4.** Replace `Reference Planning Detail`:

```dax
Reference Planning Detail =
VAR Recorded = [Reference Tasks Recorded]
VAR Eligible = [Reference Tasks Eligible]

RETURN
IF(
    Recorded > 0,
    FORMAT(Recorded, "#,0") & " of " & FORMAT(Eligible, "#,0")
        & " tasks have reference dates",
    "No MS Project reference dates detected"
)
```

**Step 5.** Replace `Reference Planning Color`, so the colour follows the ✓ / ⚠ / ✕ status:

```dax
Reference Planning Color =
VAR Coverage = [Reference Planning Coverage %]

RETURN
SWITCH(
    TRUE(),
    ISBLANK(Coverage) || Coverage = 0, "#C2413B",
    Coverage < 0.9, "#D97706",
    "#2E7D32"
)
```

The header appears on **Project Overview** and **Quality**. Both pick up the change automatically.

### A4. PPC: make "Missed By Activity Code" add up to "Delay Causes for Missed Commitments" (fixes #7)

**Why the totals differ today:**

| | Missed By Activity Code (old) | Delay Causes for Missed Commitments |
|---|---|---|
| Workstream | Construction **and Procurement** | Construction only |
| Missed tasks without an activity code | **dropped** (no bar for them) | counted ("Not provided" bar) |
| Periods added up | **every snapshot of the project**, even ones after the selected date | snapshots up to the selected date |
| Snapshots used | any import (including incomplete ones) | completed imports, latest revision only |

**Fix:** rebuild the activity-code chart on the same population and rules as the delay-cause chart. Each missed task is counted once, under its primary activity code (sequence 1, from the previous snapshot), or under a new **"No activity code"** bar.

**Step 1.** Calculated table `PPC Activity Code List`: select the table in the Data pane, replace its formula, and press Enter. This adds a "No activity code" row.

```dax
PPC Activity Code List =
VAR Codes =
    FILTER(
        DISTINCT(
            SELECTCOLUMNS(
                'sdh_taskactivitycode',
                "Activity Code Key", 'sdh_taskactivitycode'[sdh_activitycodekey]
            )
        ),
        NOT ISBLANK([Activity Code Key])
    )

VAR NamedCodes =
    ADDCOLUMNS(
        Codes,
        "Activity Code",
            VAR K = [Activity Code Key]
            RETURN
                CALCULATE(
                    MAX('sdh_taskactivitycode'[sdh_activitycoderaw]),
                    FILTER(
                        ALL('sdh_taskactivitycode'),
                        'sdh_taskactivitycode'[sdh_activitycodekey] = K
                    )
                )
    )

RETURN
UNION(
    NamedCodes,
    ROW("Activity Code Key", "__NONE__", "Activity Code", "No activity code")
)
```

**Step 2.** Replace `PPC Missed by Activity Code - Period`:

```dax
PPC Missed by Activity Code - Period =
-- Same population and rules as [PPC Missed Cause Count - Period] (Delay Causes chart).
-- Each missed task counts once, under its primary activity code in the previous snapshot,
-- or under "No activity code", so the bars add up to the Delay Causes total.
VAR CurrentDate =
    SELECTEDVALUE('sdh_schedulesnapshot'[sdh_snapshotdate])

VAR ProjectNumber =
    SELECTEDVALUE('sdh_schedulesnapshot'[sdh_projectnumber])

VAR HasWorkstreamFilter =
    ISFILTERED('sdh_scheduletaskversion'[PPC Workstream])

VAR SelectedWorkstreams =
    VALUES('sdh_scheduletaskversion'[PPC Workstream])

VAR HasCodeFilter =
    ISFILTERED('PPC Activity Code List')

VAR SelectedCodes =
    VALUES('PPC Activity Code List'[Activity Code Key])

VAR EligibleSnapshots =
    FILTER(
        ALL('sdh_schedulesnapshot'),
        'sdh_schedulesnapshot'[sdh_projectnumber] = ProjectNumber
            && 'sdh_schedulesnapshot'[sdh_importstatusname] = "Completed"
            && 'sdh_schedulesnapshot'[sdh_islatestrevisionname] = "Yes"
    )

VAR CurrentRevision =
    MAXX(
        FILTER(EligibleSnapshots, 'sdh_schedulesnapshot'[sdh_snapshotdate] = CurrentDate),
        'sdh_schedulesnapshot'[sdh_snapshotrevision]
    )

VAR CurrentStatusDate =
    MAXX(
        FILTER(
            EligibleSnapshots,
            'sdh_schedulesnapshot'[sdh_snapshotdate] = CurrentDate
                && 'sdh_schedulesnapshot'[sdh_snapshotrevision] = CurrentRevision
        ),
        'sdh_schedulesnapshot'[sdh_statusdate]
    )

VAR PreviousDate =
    MAXX(
        FILTER(EligibleSnapshots, 'sdh_schedulesnapshot'[sdh_snapshotdate] < CurrentDate),
        'sdh_schedulesnapshot'[sdh_snapshotdate]
    )

VAR PreviousRevision =
    MAXX(
        FILTER(EligibleSnapshots, 'sdh_schedulesnapshot'[sdh_snapshotdate] = PreviousDate),
        'sdh_schedulesnapshot'[sdh_snapshotrevision]
    )

VAR PreviousStatusDate =
    MAXX(
        FILTER(
            EligibleSnapshots,
            'sdh_schedulesnapshot'[sdh_snapshotdate] = PreviousDate
                && 'sdh_schedulesnapshot'[sdh_snapshotrevision] = PreviousRevision
        ),
        'sdh_schedulesnapshot'[sdh_statusdate]
    )

VAR ContextIsValid =
    NOT ISBLANK(ProjectNumber)
        && NOT ISBLANK(CurrentDate)
        && NOT ISBLANK(CurrentRevision)
        && NOT ISBLANK(CurrentStatusDate)
        && NOT ISBLANK(PreviousDate)
        && NOT ISBLANK(PreviousRevision)
        && NOT ISBLANK(PreviousStatusDate)

RETURN
IF(
    NOT ContextIsValid,
    BLANK(),

    -- Same planned population as [PPC Planned Commitments Derived]
    VAR PlannedTaskIDs =
        CALCULATETABLE(
            VALUES('sdh_scheduletaskversion'[sdh_taskuniqueid]),
            FILTER(
                ALL('sdh_scheduletaskversion'),
                'sdh_scheduletaskversion'[sdh_projectnumber] = ProjectNumber
                    && 'sdh_scheduletaskversion'[sdh_snapshotdate] = PreviousDate
                    && 'sdh_scheduletaskversion'[sdh_snapshotrevision] = PreviousRevision
                    && 'sdh_scheduletaskversion'[sdh_issummary] = FALSE()
                    && 'sdh_scheduletaskversion'[sdh_iscompleted] = FALSE()
                    && NOT ISBLANK('sdh_scheduletaskversion'[sdh_taskuniqueid])
                    && NOT ISBLANK('sdh_scheduletaskversion'[sdh_finishdate])
                    && 'sdh_scheduletaskversion'[sdh_finishdate] > PreviousStatusDate
                    && 'sdh_scheduletaskversion'[sdh_finishdate] <= CurrentStatusDate
                    && (
                        NOT HasWorkstreamFilter
                            || CONTAINSROW(SelectedWorkstreams, 'sdh_scheduletaskversion'[PPC Workstream])
                    )
            )
        )

    -- Same completion rule as [PPC Completed Commitments Derived]
    VAR CompletedTaskIDs =
        CALCULATETABLE(
            VALUES('sdh_scheduletaskversion'[sdh_taskuniqueid]),
            FILTER(
                ALL('sdh_scheduletaskversion'),
                'sdh_scheduletaskversion'[sdh_projectnumber] = ProjectNumber
                    && 'sdh_scheduletaskversion'[sdh_snapshotdate] = CurrentDate
                    && 'sdh_scheduletaskversion'[sdh_snapshotrevision] = CurrentRevision
                    && (
                        'sdh_scheduletaskversion'[sdh_iscompleted] = TRUE()
                            || (
                                NOT ISBLANK('sdh_scheduletaskversion'[sdh_actualfinish])
                                    && 'sdh_scheduletaskversion'[sdh_actualfinish] <= CurrentStatusDate
                            )
                    )
            )
        )

    VAR MissedTaskIDs =
        EXCEPT(PlannedTaskIDs, CompletedTaskIDs)

    -- Primary activity code of each task in the previous snapshot (when the commitment was made)
    VAR PreviousCodes =
        SELECTCOLUMNS(
            FILTER(
                ALL('sdh_taskactivitycode'),
                'sdh_taskactivitycode'[sdh_projectnumber] = ProjectNumber
                    && 'sdh_taskactivitycode'[sdh_snapshotdate] = PreviousDate
                    && VALUE('sdh_taskactivitycode'[sdh_snapshotrevision]) = VALUE(PreviousRevision)
                    && VALUE('sdh_taskactivitycode'[sdh_activitysequence]) = 1
            ),
            "TaskID", TRIM("" & 'sdh_taskactivitycode'[sdh_taskuniqueid]),
            "CodeKey", 'sdh_taskactivitycode'[sdh_activitycodekey]
        )

    RETURN
        SUMX(
            MissedTaskIDs,

            VAR ThisTask =
                TRIM('sdh_scheduletaskversion'[sdh_taskuniqueid])

            VAR TaskCode =
                MAXX(FILTER(PreviousCodes, [TaskID] = ThisTask), [CodeKey])

            VAR TaskCodeKey =
                IF(ISBLANK(TaskCode) || TaskCode = "", "__NONE__", TaskCode)

            RETURN
                IF(NOT HasCodeFilter || CONTAINSROW(SelectedCodes, TaskCodeKey), 1, 0)
        )
)
```

> `TRIM("" & …)` is needed because the task unique ID is **text** in `sdh_scheduletaskversion` but a **number** in `sdh_taskactivitycode`. It's the same conversion the `TV Match Key` columns use.

**Step 3.** Create a **new measure** `PPC Missed Activity Code Count Cumulative`. It's a copy of `PPC Missed Cause Count Cumulative` with the activity-code measure inside:

```dax
PPC Missed Activity Code Count Cumulative =
VAR ProjectNumber =
    SELECTEDVALUE('sdh_schedulesnapshot'[sdh_projectnumber])

VAR SelectedDate =
    MAX('sdh_schedulesnapshot'[sdh_snapshotdate])

VAR PeriodDates =
    DISTINCT(
        SELECTCOLUMNS(
            FILTER(
                ALL('sdh_schedulesnapshot'),
                'sdh_schedulesnapshot'[sdh_projectnumber] = ProjectNumber
                    && 'sdh_schedulesnapshot'[sdh_importstatusname] = "Completed"
                    && 'sdh_schedulesnapshot'[sdh_islatestrevisionname] = "Yes"
                    && 'sdh_schedulesnapshot'[sdh_snapshotdate] <= SelectedDate
            ),
            "PeriodDate", 'sdh_schedulesnapshot'[sdh_snapshotdate]
        )
    )

RETURN
IF(
    ISBLANK(ProjectNumber) || ISBLANK(SelectedDate),
    BLANK(),
    SUMX(
        PeriodDates,
        VAR PeriodDate = [PeriodDate]
        RETURN
            COALESCE(
                CALCULATE(
                    [PPC Missed by Activity Code - Period],
                    REMOVEFILTERS('sdh_schedulesnapshot'),
                    TREATAS({ ProjectNumber }, 'sdh_schedulesnapshot'[sdh_projectnumber]),
                    TREATAS({ PeriodDate }, 'sdh_schedulesnapshot'[sdh_snapshotdate])
                ),
                0
            )
    )
)
```

**Step 4.** Replace `PPC Missed by Activity Code Cumulative`, which the chart uses, so it is Construction-only like the Delay Causes chart:

```dax
PPC Missed by Activity Code Cumulative =
CALCULATE(
    [PPC Missed Activity Code Count Cumulative],
    KEEPFILTERS('sdh_scheduletaskversion'[PPC Workstream] = "Construction")
)
```

The chart keeps its visual filter (*value > 0*) and its descending sort, so nothing needs changing in the report. The **"No activity code"** bar appears only when such tasks were missed.

### A5. Publish the model

**File → Publish →** the same workspace → **Replace** the existing *SDH Scheduling Model*.
Replacing keeps the semantic-model ID (`9a88558d-…`). SDH-03's automatic refresh (solution v44) points to that ID, so don't publish under a new name.

---

## Part B: Report (`SDH Project Scheduling Dashboard (4).pbix`)

Open the file after Part A is published, so it picks up the new measures.

### B1. Title matches the left bar (fixes #3)

Page **Project Overview** → double-click the title text box **"Executive Overview"** → replace the text with **`Project Overview`**. Keep the same font, size and position.

### B2. Colour on the Construction Progress card (fixes #4)

Page **Project Overview** → select the **Construction Progress** card →
**Format visual → Visual → Callout value → Values → Font colour → fx** →
*Format style* **Field value** → *What field should we base this on?* **_Measures › Construction Actual Progress % Color** → **OK**.

The *Construction 4-Week PPC* card next to it already uses the same setup, with its own colour measure.
The colours are the same as in the Portfolio table's *Const. Progress* column:

| Colour | Rule |
|---|---|
| Green `#15803D` | actual ≥ planned at the status date |
| Amber `#D97706` | behind plan by ≤ 5% (relative) |
| Red `#C93636` | behind plan by > 5% |
| Dark `#252423` | no reference dates, so nothing to compare against |
| Grey `#6B7280` | no value |

### B3. Publish the report

**File → Publish →** the same workspace → **Replace**.

---

## Part C: Checks after publishing

| Page | Check | Expected |
|---|---|---|
| Project Portfolio | *Contractual End Date* column | `2029-04-19` (24087), `2025-02-06` (25009), others `N/A` |
| Project Overview | Title | **Project Overview** |
| Project Overview | 24087, snapshot 2026-10-23: *Contractual End Date* | `2029-04-19` |
| Project Overview | 24087, pick an **older** snapshot date | contractual date still shown (was `N/A`) |
| Project Overview | *Construction Progress* card | coloured; same colour as 24087's row on Portfolio |
| Project Overview | *Progress by Activity Code* | values shown as % (not 0%/1%); a code whose tasks are all finished shows 100%; the **total** row is close to the *Construction Progress* card (uncoded construction tasks are the only difference) |
| Project Overview | 232408, 2026-10-23: header | "⚠ Partial", amber, "*N* of *M* tasks have reference dates" (*M* = non-summary tasks, about 1,050) |
| PPC | Any project and snapshot: add up the bars of **Missed By Activity Code** | **=** the sum of the bars of **Delay Causes for Missed Commitments** |

Quick way to check the PPC totals: on the PPC page, temporarily add two cards, one for `PPC Missed by Activity Code Cumulative` and one for `PPC Missed by Delay Cause Cumulative`. A card has no category, so it shows the chart total. The two numbers must be equal. Delete the cards afterwards.

> Both PPC charts are **cumulative** from the first snapshot up to the selected one. The *Missed* card at the top of the page is **the current period only**, so its number is expected to be smaller.

---

## Answers for the client

1. **Contractual date format (Portfolio and Executive):** fixed. It now uses `yyyy-MM-dd` like the other dates. Project Overview also shows the contractual date for older snapshots now (it used to show N/A).
2. **Title:** renamed to *Project Overview*, as in the left bar.
3. **Construction progress colour:** added, with the same rule as the Portfolio column (green on or ahead of plan, amber up to 5% behind, red more than 5% behind).
4. **Activity-code progress:** it was **not** calculated the same way. It was a simple average of task % complete. It is now calculated exactly like Construction Progress: construction tasks, weighted by duration, at the status date.
5. **"784 of 1179":** 784 was correct, but it counted every row, including summary rows. The 395 rows without reference dates are mostly tasks added to the schedule after the baseline was saved. MS Project doesn't give those tasks baseline dates unless the planner re-baselines them. The header now shows "*N* of *M* tasks have reference dates" with summary rows excluded, the same basis as the ✓/⚠ status, and turns amber when coverage is below 90%. For 232408 that is about 66%.
6. **PPC totals:** the activity-code chart included procurement tasks, dropped missed tasks without an activity code, and added up periods after the selected snapshot. It now uses the same rules as the delay-cause chart, with a "No activity code" bar, so both charts add up to the same total.
