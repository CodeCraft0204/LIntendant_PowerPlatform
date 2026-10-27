# SDH dashboard — remaining tasks: implementation guide

Based on `SDH Scheduling Model (3).pbix`, `SDH Project Scheduling Dashboard (3).pbix` and solution `1.1.0.42`.

Each task lists: what is wrong today (with the cause found in the current model), the DAX to replace or add, what to change on the report pages, and how to test.

| # | Task | Type of change |
| --- | --- | --- |
| 0 | Before you start | Setup |
| 1 | Calendar validation + Actual position columns | 2 calculated columns replaced, 1–2 optional |
| 2 | Schedule Progress Trend — final Actual measure | 1 measure replaced |
| 3 | Construction Progress KPI | 1 measure added, 2 visuals rebound |
| 4 | Missing Logic edge case | 2 measures replaced |
| 5 | PPC delay-cause chart vs coverage card | 2 measures added, 3 replaced |
| 6 | Weekly Variance: Changed Tasks > Active Tasks | 1 column added, 5 measures replaced, 1 added, 1 card |
| 7 | PPC / 4-Week PPC regression + N/O rule | 2 measures added, 1 replaced, 2 cards rebound |
| 8 | Business-day logic on remaining pages | 2 columns added, 2 columns + 1 measure replaced |
| 9 | Final cross-page validation | Test matrix |

---

## 0. Before you start

1. **Pick one file for model changes.** `SDH Scheduling Model (3).pbix` and `SDH Project Scheduling Dashboard (3).pbix` both publish to the same dataset (`9a88558d-627b-4892-92fc-66e9d416893d`), and their DAX is currently identical. Whichever file is published last overwrites the dataset. Make every DAX change below in **one** file, publish it, and do not publish the other until you have re-downloaded it.
2. Save a copy of that file as a backup.
3. All new measures go in the **`_Measures`** table. To replace a measure, select it and overwrite the whole formula, keeping the same name. Visuals bound to it keep working.
4. The DAX queries in this guide run in **DAX query view** (left rail in Power BI Desktop). Replace the project number and dates with the case you are testing.

---

## 1. Calendar validation and Actual position columns

### 1.1 Why the Actual line is wrong today

`Actual Start Work Minute Position` and `Actual Finish Work Minute Position` look up `sdh_workcalendarday[sdh_calendardate]` with `LOOKUPVALUE`. That column is **User Local** in Dataverse, so it arrives as UTC (`04:00` or `05:00`). The task dates are **time-zone independent** (midnight). The lookup never matches, `BLANK() + 0 = 0`, and every actual start and finish lands at position 0. The other four position columns already use `[Calendar Date Only]` and are not affected.

### 1.2 Replace `sdh_scheduletaskversion[Actual Start Work Minute Position]`

```dax
VAR SourceDateTime =
    'sdh_scheduletaskversion'[sdh_actualstart]

VAR TaskDate =
    IF(
        ISBLANK(SourceDateTime),
        BLANK(),
        DATE(
            YEAR(SourceDateTime),
            MONTH(SourceDateTime),
            DAY(SourceDateTime)
        )
    )

VAR CalendarRows =
    FILTER(
        ALL('sdh_workcalendarday'),
        'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
            &&
        'sdh_workcalendarday'[Calendar Date Only] = TaskDate
    )

VAR CumulativeBefore =
    MAXX(
        CalendarRows,
        'sdh_workcalendarday'[sdh_cumulativeworkingminutesbeforedate]
    )

VAR IsWorkingDay =
    COUNTROWS(
        FILTER(
            CalendarRows,
            'sdh_workcalendarday'[sdh_isworkingday] = TRUE()
        )
    ) > 0

-- Actual Start is exported without a time (midnight):
-- 0 elapsed minutes = start of that working day.
VAR MinuteOfDay =
    HOUR(SourceDateTime) * 60
        + MINUTE(SourceDateTime)

VAR Shift1Start =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_shift1startminute])

VAR Shift1End =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_shift1endminute])

VAR Shift2Start =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_shift2startminute])

VAR Shift2End =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_shift2endminute])

VAR ElapsedMinutesToday =
    IF(
        IsWorkingDay,
        MAX(0, MIN(MinuteOfDay, Shift1End) - Shift1Start)
            + MAX(0, MIN(MinuteOfDay, Shift2End) - Shift2Start),
        0
    )

RETURN
    IF(
        ISBLANK(SourceDateTime)
            || COUNTROWS(CalendarRows) = 0
            || ISBLANK(CumulativeBefore),
        BLANK(),
        CumulativeBefore + ElapsedMinutesToday
    )
```

### 1.3 Replace `sdh_scheduletaskversion[Actual Finish Work Minute Position]`

```dax
VAR SourceDateTime =
    'sdh_scheduletaskversion'[sdh_actualfinish]

VAR TaskDate =
    IF(
        ISBLANK(SourceDateTime),
        BLANK(),
        DATE(
            YEAR(SourceDateTime),
            MONTH(SourceDateTime),
            DAY(SourceDateTime)
        )
    )

VAR CalendarRows =
    FILTER(
        ALL('sdh_workcalendarday'),
        'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
            &&
        'sdh_workcalendarday'[Calendar Date Only] = TaskDate
    )

VAR CumulativeBefore =
    MAXX(
        CalendarRows,
        'sdh_workcalendarday'[sdh_cumulativeworkingminutesbeforedate]
    )

VAR CumulativeThrough =
    MAXX(
        CalendarRows,
        'sdh_workcalendarday'[sdh_cumulativeworkingminutesthroughdate]
    )

VAR IsWorkingDay =
    COUNTROWS(
        FILTER(
            CalendarRows,
            'sdh_workcalendarday'[sdh_isworkingday] = TRUE()
        )
    ) > 0

VAR MinuteOfDay =
    HOUR(SourceDateTime) * 60
        + MINUTE(SourceDateTime)

VAR Shift1Start =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_shift1startminute])

VAR Shift1End =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_shift1endminute])

VAR Shift2Start =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_shift2startminute])

VAR Shift2End =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_shift2endminute])

VAR ElapsedMinutesToday =
    IF(
        IsWorkingDay,
        MAX(0, MIN(MinuteOfDay, Shift1End) - Shift1Start)
            + MAX(0, MIN(MinuteOfDay, Shift2End) - Shift2Start),
        0
    )

RETURN
    IF(
        ISBLANK(SourceDateTime)
            || COUNTROWS(CalendarRows) = 0
            || ISBLANK(CumulativeBefore),
        BLANK(),
        -- Actual Finish is exported without a time (midnight):
        -- treat it as the end of that working day.
        IF(
            MinuteOfDay = 0,
            CumulativeThrough,
            CumulativeBefore + ElapsedMinutesToday
        )
    )
```

### 1.4 Validate the calendar table

Run in DAX query view:

```dax
EVALUATE
VAR Cal =
    FILTER(
        'sdh_workcalendarday',
        'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
    )
VAR FirstDate = MINX(Cal, 'sdh_workcalendarday'[Calendar Date Only])
VAR LastDate = MAXX(Cal, 'sdh_workcalendarday'[Calendar Date Only])
RETURN
ROW(
    "Rows", COUNTROWS(Cal),
    "Distinct dates",
        COUNTROWS(DISTINCT(SELECTCOLUMNS(Cal, "d", 'sdh_workcalendarday'[Calendar Date Only]))),
    "Expected rows", INT(LastDate - FirstDate) + 1,
    "First date", FirstDate,
    "Last date", LastDate,
    "Working days", COUNTROWS(FILTER(Cal, 'sdh_workcalendarday'[sdh_isworkingday] = TRUE())),
    "Exception days", COUNTROWS(FILTER(Cal, 'sdh_workcalendarday'[sdh_isexceptionday] = TRUE())),
    "Raw date carries a time",
        COUNTROWS(FILTER(Cal, 'sdh_workcalendarday'[sdh_calendardate] <> 'sdh_workcalendarday'[Calendar Date Only])),
    "Day minutes mismatch",
        COUNTROWS(
            FILTER(
                Cal,
                'sdh_workcalendarday'[sdh_cumulativeworkingminutesthroughdate]
                    - 'sdh_workcalendarday'[sdh_cumulativeworkingminutesbeforedate]
                    <> IF('sdh_workcalendarday'[sdh_isworkingday], 'sdh_workcalendarday'[sdh_workingminutes], 0)
            )
        ),
    "Broken cumulative chain",
        COUNTROWS(
            FILTER(
                Cal,
                VAR d = 'sdh_workcalendarday'[Calendar Date Only]
                VAR PreviousThrough =
                    MAXX(
                        FILTER(Cal, 'sdh_workcalendarday'[Calendar Date Only] = d - 1),
                        'sdh_workcalendarday'[sdh_cumulativeworkingminutesthroughdate]
                    )
                RETURN
                    NOT ISBLANK(PreviousThrough)
                        && PreviousThrough <> 'sdh_workcalendarday'[sdh_cumulativeworkingminutesbeforedate]
            )
        )
)
```

Pass criteria:

- `Rows` = `Distinct dates` = `Expected rows` (no gaps, no duplicates).
- `Last date` ≥ 2032-12-31.
- `Day minutes mismatch` = 0 and `Broken cumulative chain` = 0.
- `Raw date carries a time` > 0 is expected. It confirms why `[Calendar Date Only]` must always be used instead of `sdh_calendardate`.

Then list the holidays and compare them with the calendar in the MPP file (Project → Change Working Time). Include the Quebec construction holiday weeks in July:

```dax
EVALUATE
SELECTCOLUMNS(
    FILTER(
        'sdh_workcalendarday',
        'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
            && 'sdh_workcalendarday'[sdh_isexceptionday] = TRUE()
    ),
    "Date", 'sdh_workcalendarday'[Calendar Date Only],
    "Exception", 'sdh_workcalendarday'[sdh_exceptionname],
    "Working", 'sdh_workcalendarday'[sdh_isworkingday]
)
ORDER BY [Date]
```

### 1.5 Validate the task position columns against MPP durations

A working day is 480 minutes (07:30–12:00 + 12:30–16:00). So `(Finish position − Start position) / 480` must equal the MS Project duration in days.

```dax
EVALUATE
VAR T =
    FILTER(
        ALL('sdh_scheduletaskversion'),
        'sdh_scheduletaskversion'[sdh_issummary] = FALSE()
            && 'sdh_scheduletaskversion'[sdh_durationdays] > 0
    )
RETURN
ROW(
    "Tasks with duration", COUNTROWS(T),
    "Finish stored at midnight",
        COUNTROWS(
            FILTER(
                T,
                NOT ISBLANK('sdh_scheduletaskversion'[sdh_finishdate])
                    && HOUR('sdh_scheduletaskversion'[sdh_finishdate]) = 0
                    && MINUTE('sdh_scheduletaskversion'[sdh_finishdate]) = 0
            )
        ),
    "Current span <> MPP duration",
        COUNTROWS(
            FILTER(
                T,
                ABS(
                    DIVIDE(
                        'sdh_scheduletaskversion'[Current Finish Work Minute Position]
                            - 'sdh_scheduletaskversion'[Current Start Work Minute Position],
                        480
                    ) - 'sdh_scheduletaskversion'[sdh_durationdays]
                ) > 0.01
            )
        ),
    "Current span = 0 (task dropped from curves)",
        COUNTROWS(
            FILTER(
                T,
                'sdh_scheduletaskversion'[Current Finish Work Minute Position]
                    <= 'sdh_scheduletaskversion'[Current Start Work Minute Position]
            )
        ),
    "Actual start at position 0 (bug)",
        COUNTROWS(
            FILTER(
                T,
                NOT ISBLANK('sdh_scheduletaskversion'[sdh_actualstart])
                    && 'sdh_scheduletaskversion'[Actual Start Work Minute Position] = 0
            )
        )
)
```

Read the result:

- `Actual start at position 0` must be **0** after steps 1.2–1.3.
- If `Finish stored at midnight` is most of the tasks **and** `Current span <> MPP duration` is high, the Current and Reference **finish** columns lose the last day of every task. One-day tasks then have span 0 and are silently dropped from Planned and Forecast. Apply 1.6.
- If finish dates carry a time (for example 16:00), skip 1.6.

### 1.6 Conditional — date-only finish dates

Apply only if 1.5 shows midnight finish dates. In **`Current Finish Work Minute Position`** and **`Reference Finish Work Minute Position`**:

1. Add this variable after `CumulativeBefore`:

```dax
VAR CumulativeThrough =
    MAXX(CalendarRows, 'sdh_workcalendarday'[sdh_cumulativeworkingminutesthroughdate])
```

2. Replace the `RETURN` block with:

```dax
RETURN
    IF(
        ISBLANK(SourceDateTime)
            || COUNTROWS(CalendarRows) = 0
            || ISBLANK(CumulativeBefore),
        BLANK(),
        IF(
            MinuteOfDay = 0,
            CumulativeThrough,
            CumulativeBefore + ElapsedMinutesToday
        )
    )
```

Re-run 1.5. `Current span <> MPP duration` should drop to near 0. The remaining rows are tasks on a different MPP calendar, or with an elapsed duration.

### 1.7 Spot-check 2–3 projects against the MPP

```dax
EVALUATE
VAR P = "232408"
VAR D = DATE(2026, 10, 16)
RETURN
TOPN(
    20,
    SELECTCOLUMNS(
        FILTER(
            ALL('sdh_scheduletaskversion'),
            'sdh_scheduletaskversion'[sdh_projectnumber] = P
                && 'sdh_scheduletaskversion'[sdh_snapshotdate] = D
                && 'sdh_scheduletaskversion'[Is Construction Task] = TRUE()
        ),
        "WBS", 'sdh_scheduletaskversion'[sdh_wbs],
        "Task", 'sdh_scheduletaskversion'[sdh_tasknameraw],
        "Start", 'sdh_scheduletaskversion'[sdh_startdate],
        "Finish", 'sdh_scheduletaskversion'[sdh_finishdate],
        "MPP days", 'sdh_scheduletaskversion'[sdh_durationdays],
        "Calendar days",
            DIVIDE(
                'sdh_scheduletaskversion'[Current Finish Work Minute Position]
                    - 'sdh_scheduletaskversion'[Current Start Work Minute Position],
                480
            ),
        "Actual start", 'sdh_scheduletaskversion'[sdh_actualstart],
        "Actual start pos", 'sdh_scheduletaskversion'[Actual Start Work Minute Position],
        "% complete", 'sdh_scheduletaskversion'[sdh_percentcomplete]
    ),
    [Start], ASC
)
```

Choose tasks that cross a weekend and a holiday. `MPP days` must equal `Calendar days`.

### 1.8 Check the 232408 / 10/16 import

The Actual line for that snapshot is flat 0%, which means no construction task in it has an actual start:

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'sdh_scheduletaskversion'[sdh_snapshotdate],
    'sdh_scheduletaskversion'[sdh_snapshotrevision],
    TREATAS({"232408"}, 'sdh_scheduletaskversion'[sdh_projectnumber]),
    "Construction tasks",
        CALCULATE(COUNTROWS('sdh_scheduletaskversion'), 'sdh_scheduletaskversion'[Is Construction Task] = TRUE()),
    "With actual start",
        CALCULATE(
            COUNTROWS('sdh_scheduletaskversion'),
            'sdh_scheduletaskversion'[Is Construction Task] = TRUE(),
            NOT ISBLANK('sdh_scheduletaskversion'[sdh_actualstart])
        ),
    "With % complete > 0",
        CALCULATE(
            COUNTROWS('sdh_scheduletaskversion'),
            'sdh_scheduletaskversion'[Is Construction Task] = TRUE(),
            'sdh_scheduletaskversion'[sdh_percentcomplete] > 0
        )
)
```

If `With actual start` = 0 while `With % complete > 0` is high, the actual dates were lost on import. For 232408 / 10/16, the export has them, but in a weekday format (`Jeu 23-11-23`) that the parser did not accept. The fix and re-import steps are in [Date_Format_Fix_Guide.md](Date_Format_Fix_Guide.md).

- **Chart:** the Actual measure in 2.1 rebuilds missing dates from the MS Project rule: once a task has progress, its Start is its Actual Start, and at 100% its Finish is its Actual Finish. For 232408 / 10/16, this matches the real actual dates exactly.
- **Data:** re-import the snapshot after the parser fix. Other consumers of `sdh_actualstart` (for example SDH-03) do not use the fallback.

**Output of task 1:** calendar complete through 2032, positions match MPP durations, and actual positions are no longer 0.

---

## 2. Schedule Progress Trend — final Actual measure

Planned and Forecast (`… - Calendar Test`) are already correct. Replace the Actual one.

What changes:

- **Task population.** It now uses `ALL` + explicit project, snapshot and revision, the same as Planned and Forecast, instead of relying on page filters.
- **Line no longer stops at the forecast finish.** It no longer goes blank after the forecast construction finish, so a nearly complete project still shows Actual up to the status date.
- **Missing actual dates** are rebuilt from the current dates. A task with % complete > 0 (or an actual finish) but no actual start uses its current start. A task at 100% with no actual finish uses its current finish. A snapshot imported without actuals (see 1.8) therefore no longer shows a flat 0% line.
- **Unfinished-task rule as a switch.** It is controlled by one variable, `UseStatusAnchor`. **Simon needs to choose:**
  - `TRUE()` (recommended): an unfinished task reaches its MS Project **% complete exactly at the status date**. The Actual curve then ends at the same value as MS Project's construction % complete, which task 3 needs.
  - `FALSE()`: an unfinished task progresses linearly from its actual start to its forecast finish. This is the current behavior.

### 2.1 Replace `[Executive Actual Progress % - Calendar Test]`

```dax
-- Unfinished-task rule (Simon to confirm):
--   TRUE()  = an unfinished task reaches its MS Project % Complete exactly at the status date
--   FALSE() = an unfinished task progresses linearly from Actual Start to its forecast Finish
VAR UseStatusAnchor = TRUE()

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

VAR AxisDate =
    MAX('Progress Trend Axis'[Date])

VAR AxisPosition =
    [Progress Trend Axis Work Minute Position]

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

VAR ConstructionTasks =
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
    )

VAR ProjectStartDate =
    MINX(
        ConstructionTasks,
        INT('sdh_scheduletaskversion'[sdh_startdate])
    )

VAR TotalWeight =
    SUMX(
        ConstructionTasks,
        'sdh_scheduletaskversion'[Current Finish Work Minute Position]
            - 'sdh_scheduletaskversion'[Current Start Work Minute Position]
    )

VAR WeightedProgress =
    SUMX(
        ConstructionTasks,

        VAR TaskWeight =
            'sdh_scheduletaskversion'[Current Finish Work Minute Position]
                - 'sdh_scheduletaskversion'[Current Start Work Minute Position]

        VAR CurrentStart =
            'sdh_scheduletaskversion'[Current Start Work Minute Position]

        VAR CurrentFinish =
            'sdh_scheduletaskversion'[Current Finish Work Minute Position]

        VAR PercentComplete =
            DIVIDE(
                COALESCE('sdh_scheduletaskversion'[sdh_percentcomplete], 0),
                100
            )

        -- MS Project sets Start = Actual Start once a task has progress, and Finish = Actual Finish at 100%,
        -- so the current dates stand in when an export arrives without actual dates
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
            NOT ISBLANK(ActualFinish)
                && ActualFinish > ActualStart

        VAR TaskProgress =
            SWITCH(
                TRUE(),
                ISBLANK(ActualStart), 0,
                AxisPosition <= ActualStart, 0,

                -- Finished: linear from actual start to actual finish
                IsFinished,
                    MIN(
                        1,
                        DIVIDE(AxisPosition - ActualStart, ActualFinish - ActualStart, 0)
                    ),

                -- Unfinished, status-date anchor
                UseStatusAnchor,
                    IF(
                        ISBLANK(StatusPosition) || StatusPosition <= ActualStart,
                        PercentComplete,
                        PercentComplete
                            * MIN(
                                1,
                                DIVIDE(AxisPosition - ActualStart, StatusPosition - ActualStart, 0)
                            )
                    ),

                -- Unfinished, linear to forecast finish
                CurrentFinish <= ActualStart, 0,
                MIN(
                    1,
                    DIVIDE(AxisPosition - ActualStart, CurrentFinish - ActualStart, 0)
                )
            )

        RETURN
            TaskWeight * TaskProgress
    )

RETURN
    IF(
        ISBLANK(ProjectNumber)
            || ISBLANK(SnapshotDate)
            || ISBLANK(AxisDate)
            || ISBLANK(AxisPosition)
            || ISBLANK(StatusDate)
            || ISBLANK(ProjectStartDate)
            || TotalWeight <= 0
            || INT(AxisDate) < ProjectStartDate
            || INT(AxisDate) > INT(StatusDate),
        BLANK(),
        MIN(1, MAX(0, DIVIDE(WeightedProgress, TotalWeight)))
    )
```

### 2.2 Report page — Project Overview → "Schedule Progress Trend"

No rebinding is needed: the visual already uses the three `… - Calendar Test` measures. Check these settings:

1. **Filters pane:** the visual has filters on all three measures (type *Advanced*). Make sure none of them is set to a value condition such as "is greater than 0". Each should be empty or "is not blank". A value condition would hide the 0% start of the Actual line.
2. **Format → X-axis:** type *Continuous*, no fixed start or end.
3. **Format → Lines:** for *Executive Actual Progress %*, switch **Show markers** on for 1 px. Then a project with only a few days of actuals still shows a visible line.

### 2.3 Re-test against the MPP

```dax
EVALUATE
CALCULATETABLE(
    ADDCOLUMNS(
        FILTER(
            VALUES('Progress Trend Axis'[Date]),
            'Progress Trend Axis'[Date]
                IN { DATE(2025, 4, 1), DATE(2025, 12, 1), DATE(2026, 6, 1), DATE(2026, 10, 9), DATE(2026, 11, 30) }
        ),
        "Planned", [Executive Planned Progress % - Calendar Test],
        "Forecast", [Executive Forecast Progress % - Calendar Test],
        "Actual", [Executive Actual Progress % - Calendar Test]
    ),
    TREATAS({"232408"}, 'sdh_schedulesnapshot'[sdh_projectnumber]),
    TREATAS({DATE(2026, 10, 9)}, 'sdh_schedulesnapshot'[sdh_snapshotdate]),
    'sdh_schedulesnapshot'[sdh_islatestrevisionname] = "Yes",
    'sdh_schedulesnapshot'[sdh_importstatusname] = "Completed"
)
```

Expected:

| Axis date | Planned | Forecast | Actual |
| --- | --- | --- | --- |
| Project start | ≈ 0% | ≈ 0% | ≈ 0% (was 73%) |
| Mid-project | between 0 and 100% | ≤ Planned if late | rises from 0 |
| Status date | — | — | = MS Project *Construction* summary % Complete, if `UseStatusAnchor = TRUE()` |
| After status date | continues | continues | blank |

Repeat for 25010 (10/9) and 25015 (10/16).

**Output of task 2:** a trend chart that uses Construction tasks only and working-minute logic, with an Actual line starting at 0%.

---

## 3. Construction Progress KPI

Today the **Construction Progress** card (Project Overview) shows `Sum(sdh_schedulesnapshot.sdh_constructionprogresspercent)`, a value computed by the import flow. It is independent of the chart.

### 3.1 Add measure `[Construction Actual Progress %]`

It evaluates the chart's Actual measure at the status date, so the card always equals the last point of the Actual line.

```dax
Construction Actual Progress % =
VAR StatusDate =
    [Executive Trend Status Date]

VAR StatusDay =
    DATE(YEAR(StatusDate), MONTH(StatusDate), DAY(StatusDate))

RETURN
    IF(
        ISBLANK(StatusDate),
        BLANK(),
        CALCULATE(
            [Executive Actual Progress % - Calendar Test],
            TREATAS({ StatusDay }, 'Progress Trend Axis'[Date])
        )
    )
```

Format: **Percentage, 0 decimals**.

### 3.2 Report pages

1. **Project Overview → Construction Progress card:** remove `Sum of sdh_constructionprogresspercent` and add `[Construction Actual Progress %]`.
2. **Project Portfolio → "Active Project Information" table:** the *Const. Progress* column uses the same flow value. Add `[Construction Actual Progress %]` and rename it *Const. Progress*. Check it against the old column for every row, then remove the old column. If it shows blank for some rows, the table holds more than one snapshot per project; check the visual filter there first.
3. Leave **Full Schedule Progress** unchanged. It is the whole-schedule value, not construction.

### 3.3 Test

For 3 projects, the card = the last point of the orange line (hover it) = MS Project's construction summary % Complete (with `UseStatusAnchor = TRUE()`).

**Output of task 3:** the card and the chart tell the same number.

---

## 4. Missing Logic edge case (Kinatex Apex Montcalm)

**Cause.** `[Missing Logic Tasks]` is `COUNTROWS(FILTER(...))`, which returns **BLANK** (not 0) when no task matches. `DIVIDE(BLANK, 1)` is BLANK, and `[Health Check Display]` shows BLANK as "N/A".

### 4.1 Replace `[Missing Logic Tasks]`

```dax
VAR Result =
    COUNTROWS(
        FILTER(
            'sdh_scheduletaskversion',
            'sdh_scheduletaskversion'[sdh_isopentask] = TRUE()
                &&
            'sdh_scheduletaskversion'[sdh_issummary] = FALSE()
                &&
            (
                ISBLANK('sdh_scheduletaskversion'[sdh_predecessorsraw])
                    ||
                ISBLANK('sdh_scheduletaskversion'[sdh_successorsraw])
            )
        )
    )

RETURN
    COALESCE(Result, 0)
```

### 4.2 Replace `[Quality Missing Logic %]`

```dax
VAR ActiveTasks =
    [Quality Active Tasks]

RETURN
    IF(
        COALESCE(ActiveTasks, 0) = 0,
        BLANK(),
        DIVIDE(
            COALESCE([Missing Logic Tasks], 0),
            ActiveTasks
        )
    )
```

BLANK ("N/A") now only appears when there are no active tasks, which is the case where the metric genuinely doesn't apply.

### 4.3 Report pages

Nothing to rebind. **Project Overview → Schedule Quality** and **Quality → Missing Logic %** both read this measure.

### 4.4 Test

1. Kinatex Apex Montcalm, the snapshot with 1 active task: both visuals show **0%**, in green.
2. A project with 0 active tasks: **N/A**.
3. Any other project: the value is unchanged from before.

---

## 5. PPC delay-cause chart vs coverage card (the 241 vs 192 case)

Causes found in the current DAX:

| | Chart *Delay Causes for Missed Commitments* | Card *Construction Delay Cause Coverage* |
| --- | --- | --- |
| Workstreams | **Construction + Procurement** | Construction only |
| Snapshot eligibility | max revision of the date, **any import status**; previous date = any snapshot | completed + latest revision only (Derived logic) |
| "Cumulative" range | **all** snapshots of the project, including dates after the selected one | same (all dates) |

The fix below makes **one base measure** that counts missed commitments with the exact Derived PPC rules. The chart, the card's numerator and the card's denominator are all built from it. The chart total then always equals the card denominator, and both reconcile with the *Construction Missed* card week by week.

> **Decision for Simon:** should the chart show **Construction only** (matches the card title; used below) or **Construction + Procurement**? For both, replace `= "Construction"` with `IN { "Construction", "Procurement" }` in 5.3, 5.4 and 5.5, and rename the card.

### 5.1 Add measure `[PPC Missed Cause Count - Period]`

```dax
PPC Missed Cause Count - Period =
VAR CurrentDate =
    SELECTEDVALUE('sdh_schedulesnapshot'[sdh_snapshotdate])

VAR ProjectNumber =
    SELECTEDVALUE('sdh_schedulesnapshot'[sdh_projectnumber])

VAR HasWorkstreamFilter =
    ISFILTERED('sdh_scheduletaskversion'[PPC Workstream])

VAR SelectedWorkstreams =
    VALUES('sdh_scheduletaskversion'[PPC Workstream])

VAR HasCauseFilter =
    ISFILTERED('PPC Delay Cause List'[Delay Cause])

VAR SelectedCauses =
    VALUES('PPC Delay Cause List'[Delay Cause])

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

    RETURN
        SUMX(
            PlannedTaskIDs,

            VAR ThisTask =
                'sdh_scheduletaskversion'[sdh_taskuniqueid]

            VAR CurrentRows =
                FILTER(
                    ALL('sdh_scheduletaskversion'),
                    'sdh_scheduletaskversion'[sdh_projectnumber] = ProjectNumber
                        && 'sdh_scheduletaskversion'[sdh_snapshotdate] = CurrentDate
                        && 'sdh_scheduletaskversion'[sdh_snapshotrevision] = CurrentRevision
                        && 'sdh_scheduletaskversion'[sdh_taskuniqueid] = ThisTask
                )

            -- Same completion rule as [PPC Completed Commitments Derived]
            VAR IsCompleted =
                COUNTROWS(
                    FILTER(
                        CurrentRows,
                        'sdh_scheduletaskversion'[sdh_iscompleted] = TRUE()
                            || (
                                NOT ISBLANK('sdh_scheduletaskversion'[sdh_actualfinish])
                                    && 'sdh_scheduletaskversion'[sdh_actualfinish] <= CurrentStatusDate
                            )
                    )
                ) > 0

            VAR RawCause =
                MAXX(CurrentRows, 'sdh_scheduletaskversion'[sdh_delaycauseraw])

            VAR Cause =
                IF(
                    TRIM(COALESCE(RawCause, "")) = "",
                    "Not provided",
                    TRIM(RawCause)
                )

            RETURN
                IF(
                    NOT IsCompleted
                        && (NOT HasCauseFilter || CONTAINSROW(SelectedCauses, Cause)),
                    1,
                    0
                )
        )
)
```

### 5.2 Add measure `[PPC Missed Cause Count Cumulative]`

"Cumulative" now means **from the first snapshot up to the selected snapshot**. Before, it included later snapshots.

```dax
PPC Missed Cause Count Cumulative =
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
                    [PPC Missed Cause Count - Period],
                    REMOVEFILTERS('sdh_schedulesnapshot'),
                    TREATAS({ ProjectNumber }, 'sdh_schedulesnapshot'[sdh_projectnumber]),
                    TREATAS({ PeriodDate }, 'sdh_schedulesnapshot'[sdh_snapshotdate])
                ),
                0
            )
    )
)
```

### 5.3 Replace `[PPC Missed by Delay Cause Cumulative]` (used by the chart)

```dax
CALCULATE(
    [PPC Missed Cause Count Cumulative],
    KEEPFILTERS('sdh_scheduletaskversion'[PPC Workstream] = "Construction")
)
```

### 5.4 Replace `[Construction Missed Cumulative]` (card denominator)

```dax
CALCULATE(
    [PPC Missed Cause Count Cumulative],
    KEEPFILTERS('sdh_scheduletaskversion'[PPC Workstream] = "Construction"),
    REMOVEFILTERS('PPC Delay Cause List')
)
```

### 5.5 Replace `[Construction Missed With Cause Cumulative]` (card numerator)

```dax
VAR NotProvided =
    CALCULATE(
        [PPC Missed Cause Count Cumulative],
        KEEPFILTERS('sdh_scheduletaskversion'[PPC Workstream] = "Construction"),
        TREATAS({ "Not provided" }, 'PPC Delay Cause List'[Delay Cause])
    )

RETURN
    [Construction Missed Cumulative] - COALESCE(NotProvided, 0)
```

`[Construction Delay Cause Coverage %]`, `[… Coverage Summary]` and `[Construction Missed Without Cause Cumulative]` stay as they are; they now read consistent inputs. `[Construction Missed With Cause - Period]` and `[PPC Missed by Delay Cause - Period]` are no longer used and can be deleted after testing.

### 5.6 Report page — PPC

1. Rename the chart title to **"Construction Delay Causes — Cumulative"**, or keep it if Simon chose both workstreams.
2. Add `[Construction Delay Cause Coverage Summary]` to the coverage card (second data field) so it shows "*N / M documented*".
3. Fix the typos in two card titles: *Procurement Misssed* → **Procurement Missed**, *␠Construction Misssed* → **Construction Missed**.

### 5.7 Test (the 241 vs 192 case)

Select the same project and snapshot as the client's case:

- Sum of the bars in the chart (including *Not provided*) = `[Construction Missed Cumulative]`.
- Card % = (sum of bars − *Not provided* bar) / sum of bars.
- Pick the first snapshot that has a previous snapshot: chart total = the *Construction Missed* card on that snapshot.

---

## 6. Weekly Variance — Changed Tasks > Active Tasks

Causes found:

1. **Summary tasks are counted.** The *Change Type* chart and the four *Change Breakdown* measures filter `sdh_weeklyvariance[sdh_issummary] = FALSE()`, but **no flow writes `sdh_issummary` on variance rows**. SDH-03 writes `sdh_issummarytask` (added in 1.1.0.35). The filter therefore lets summary tasks through, and a summary changes whenever any of its children does.
2. **Different populations.** *Active Tasks* is "non-summary, not completed in the **selected** snapshot". A task completed during the week is a *Changed* task but is no longer *active*, so Changed can exceed Active on nearly complete projects even without cause 1.

**Comparison population (recommended, confirm with Simon):** *non-summary tasks that were open at the start of the week*, meaning not completed in the **from** snapshot. *Added* tasks are counted separately. With that rule, Changed + Removed + unchanged = Active at week start. Changed can never exceed it.

The **Variance Detail** table is not changed; it keeps showing summary and individual tasks.

### 6.1 Diagnose the current case (optional, before changing anything)

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'sdh_weeklyvariance'[sdh_primarychangetypename],
    TREATAS({"232408"}, 'sdh_schedulesnapshot'[sdh_projectnumber]),
    TREATAS({DATE(2026, 10, 16)}, 'sdh_schedulesnapshot'[sdh_snapshotdate]),
    TREATAS({"Yes"}, 'sdh_schedulesnapshot'[sdh_islatestrevisionname]),
    "Variance rows", COUNTROWS('sdh_weeklyvariance'),
    "Chart today", [Variance Non Summary Distinct Tasks],
    "Summary (flow flag)",
        CALCULATE(COUNTROWS('sdh_weeklyvariance'), 'sdh_weeklyvariance'[sdh_issummarytask] = TRUE()),
    "Summary (model check)",
        CALCULATE(COUNTROWS('sdh_weeklyvariance'), 'sdh_weeklyvariance'[Variance Is Summary] = TRUE()),
    "From snapshots", DISTINCTCOUNT('sdh_weeklyvariance'[sdh_fromsnapshot])
)
```

`Summary (…)` > 0 on the *Changed* row confirms cause 1. `From snapshots` > 1 means the week was compared against two revisions of the previous snapshot.

### 6.2 Add column `sdh_weeklyvariance[Variance In Comparison Population]`

```dax
VAR TaskKey =
    'sdh_weeklyvariance'[sdh_scheduletask]

VAR FromSnapshot =
    'sdh_weeklyvariance'[sdh_fromsnapshot]

VAR ToSnapshot =
    'sdh_weeklyvariance'[sdh_tosnapshot]

VAR ChangeType =
    'sdh_weeklyvariance'[sdh_primarychangetypename]

-- Non-summary and still open in the previous (from) snapshot
VAR OpenAtWeekStart =
    COUNTROWS(
        FILTER(
            ALL('sdh_scheduletaskversion'),
            'sdh_scheduletaskversion'[sdh_snapshot] = FromSnapshot
                && 'sdh_scheduletaskversion'[sdh_scheduletask] = TaskKey
                && 'sdh_scheduletaskversion'[sdh_issummary] = FALSE()
                && 'sdh_scheduletaskversion'[sdh_iscompleted] = FALSE()
        )
    ) > 0

-- Added tasks: non-summary in the current (to) snapshot
VAR AddedLeafTask =
    COUNTROWS(
        FILTER(
            ALL('sdh_scheduletaskversion'),
            'sdh_scheduletaskversion'[sdh_snapshot] = ToSnapshot
                && 'sdh_scheduletaskversion'[sdh_scheduletask] = TaskKey
                && 'sdh_scheduletaskversion'[sdh_issummary] = FALSE()
        )
    ) > 0

RETURN
    NOT ISBLANK(TaskKey)
        && IF(ChangeType = "Added", AddedLeafTask, OpenAtWeekStart)
```

### 6.3 Replace `[Variance Non Summary Distinct Tasks]` (Change Type chart)

```dax
CALCULATE(
    DISTINCTCOUNT('sdh_weeklyvariance'[sdh_scheduletask]),
    KEEPFILTERS('sdh_weeklyvariance'[Variance In Comparison Population] = TRUE())
)
```

### 6.4 Replace the four breakdown measures (Change Breakdown chart)

`[Variance Delayed Start Non Summary]`:

```dax
CALCULATE(
    DISTINCTCOUNT('sdh_weeklyvariance'[sdh_scheduletask]),
    KEEPFILTERS('sdh_weeklyvariance'[Variance In Comparison Population] = TRUE()),
    KEEPFILTERS('sdh_weeklyvariance'[Variance Start Classification] = "Delayed Start")
)
```

`[Variance Accelerated Start Non Summary]`: same as above, with `"Accelerated Start"`.

`[Variance Delayed Finish Non Summary]`:

```dax
CALCULATE(
    DISTINCTCOUNT('sdh_weeklyvariance'[sdh_scheduletask]),
    KEEPFILTERS('sdh_weeklyvariance'[Variance In Comparison Population] = TRUE()),
    KEEPFILTERS('sdh_weeklyvariance'[Variance Finish Classification] = "Delayed Finish")
)
```

`[Variance Accelerated Finish Non Summary]`: same as above, with `"Accelerated Finish"`.

### 6.5 Add measure `[Variance Active Tasks At Week Start]`

```dax
Variance Active Tasks At Week Start =
VAR FromSnapshots =
    CALCULATETABLE(
        VALUES('sdh_weeklyvariance'[sdh_fromsnapshot]),
        REMOVEFILTERS('sdh_weeklyvariance'[sdh_primarychangetypename])
    )

RETURN
    CALCULATE(
        DISTINCTCOUNT('sdh_scheduletaskversion'[sdh_scheduletask]),
        REMOVEFILTERS('sdh_schedulesnapshot'),
        TREATAS(FromSnapshots, 'sdh_scheduletaskversion'[sdh_snapshot]),
        'sdh_scheduletaskversion'[sdh_issummary] = FALSE(),
        'sdh_scheduletaskversion'[sdh_iscompleted] = FALSE()
    )
```

### 6.6 Report page — Weekly Variance

1. Add a **card**: `[Variance Active Tasks At Week Start]`, title **"Active Tasks (start of week)"**. Place it above the *Change Type* chart.
2. *Change Type* chart: subtitle **"Non-summary tasks open at the start of the week; Added shown separately"**.
3. Leave *Variance Detail* unchanged.

### 6.7 Test

- *Changed* bar ≤ *Active Tasks (start of week)* for every project and snapshot.
- *Changed* + *Removed* ≤ *Active Tasks (start of week)*.
- *Variance Detail* row count is unchanged from before.

---

## 7. PPC / 4-Week PPC regression and the N/O rule

Findings:

- The **Project Overview → 4-Week PPC** card uses `[PPC Cumulative 4W %]`, which reads the old flow table `sdh_ppcresult`. The PPC page and Portfolio use the Derived task-version logic, so the Overview card can disagree with them, and it does not show N/O.
- **PPC → Construction Current PPC** uses `DIVIDE(…, 0)`, so a week with nothing planned shows **0%** instead of **N/O**. Procurement already has a Display measure; Construction does not.
- **Portfolio → Const. 4-Week PPC** shows blank, not N/O, when nothing was planned.

Target rule everywhere: **planned = 0 → "N/O"**, **planned > 0 and completed = 0 → "0%"**, **no context → "N/A"**.

### 7.1 Add `[Construction Current PPC Display]`

```dax
Construction Current PPC Display =
VAR Planned = [Construction PPC Planned]
VAR PPC = [Construction Current PPC]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(Planned), "N/A",
    Planned = 0, "N/O",
    FORMAT(PPC, "0.0%")
)
```

### 7.2 Add `[Construction Current PPC Display Color]`

```dax
Construction Current PPC Display Color =
VAR Planned = [Construction PPC Planned]
RETURN
IF(
    ISBLANK(Planned) || Planned = 0,
    "#6B7280",
    [Construction Current PPC Color]
)
```

### 7.3 Replace `[Portfolio Construction 4W PPC Display]`

```dax
VAR Planned =
    [Portfolio Construction 4W Planned]

VAR Completed =
    [Portfolio Construction 4W Completed]

RETURN
SWITCH(
    TRUE(),
    ISBLANK(Planned), "N/A",
    Planned = 0, "N/O",
    FORMAT(DIVIDE(COALESCE(Completed, 0), Planned), "0%")
)
```

### 7.4 Report pages

1. **Project Overview → 4-Week PPC card:** replace `[PPC Cumulative 4W %]` with `[Construction PPC 4W Display]`. Then set the value's font color with conditional formatting: *Field value* = `[Construction PPC 4W Display Color]`. Rename the title to **"Construction 4-Week PPC"**. This matches the PPC page and the Portfolio column. If Simon wants this card to cover all workstreams instead, it needs a separate all-workstream Display measure built on `[PPC 4W Planned Derived]` / `[PPC 4W Completed Derived]` without the workstream filter.
2. **PPC → Construction Current PPC card:** replace `[Construction Current PPC]` with `[Construction Current PPC Display]`, with font color from `[Construction Current PPC Display Color]`.
3. **Project Portfolio → Active Project Information:** replace the *Const. 4-Week PPC* field `[Portfolio Construction 4W PPC %]` with `[Portfolio Construction 4W PPC Display]`. Keep the background or font color rule on `[Portfolio Construction 4W PPC % Color]`; it still returns grey when the value is blank.

### 7.5 Test

For each of 232408, 25010 and 25015, on 3 historical snapshots each:

| Check | Expected |
| --- | --- |
| Overview 4-Week PPC = PPC page Construction 4-Week PPC | identical text |
| Portfolio Const. 4-Week PPC (latest snapshot) = PPC page on the latest snapshot | identical |
| Snapshot with nothing finishing in the 4 weeks | **N/O**, grey |
| Snapshot with planned > 0, completed 0 | **0.0%**, red |
| First snapshot of a project (no previous) | **N/A** or **N/O**, never an error |
| PPC Trend chart point = Construction Current PPC card for the same snapshot | identical |

---

## 8. Business-day logic on the remaining pages

Remaining calendar-day logic shown to users:

| Where | Today | Change |
| --- | --- | --- |
| Weekly Variance → *Variance Detail* → Start Δ Days, Finish Δ Days | SDH-03 writes calendar days (`ticks / 864000000000`) | New work-day columns (8.1) |
| Weekly Variance → *Change Breakdown* (Delayed / Accelerated) | based on the calendar-day delta | Classify on work days (8.2) |
| PPC → *Missed Commitments* → Delay Days | `DATEDIFF(…, DAY)` | Work days (8.3) |
| Weekly Variance → Duration Δ | MS Project duration, already in work days | no change |
| Lookahead window (Current / 1 / 3 weeks) | calendar weeks | no change (a week is a week) |
| `PPC Days Overdue`, `PPC Finish Shift Days`, `PPC Forecast Slip Days` | calendar days, **not on any visual** | no change; delete during clean-up |

The rule used: *work days between d1 and d2* = cumulative working days through d2 − cumulative working days through d1. For example, Friday → Monday = 1, and a move across a holiday does not count the holiday.

### 8.1 Add columns on `sdh_weeklyvariance`

`Start Delta Work Days`:

```dax
VAR BeforeDate = 'sdh_weeklyvariance'[sdh_startdatebefore]
VAR AfterDate = 'sdh_weeklyvariance'[sdh_startdateafter]

VAR BeforeDay =
    IF(ISBLANK(BeforeDate), BLANK(), DATE(YEAR(BeforeDate), MONTH(BeforeDate), DAY(BeforeDate)))

VAR AfterDay =
    IF(ISBLANK(AfterDate), BLANK(), DATE(YEAR(AfterDate), MONTH(AfterDate), DAY(AfterDate)))

VAR BeforeCount =
    MAXX(
        FILTER(
            ALL('sdh_workcalendarday'),
            'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
                && 'sdh_workcalendarday'[Calendar Date Only] = BeforeDay
        ),
        'sdh_workcalendarday'[sdh_cumulativeworkingdaysthroughdate]
    )

VAR AfterCount =
    MAXX(
        FILTER(
            ALL('sdh_workcalendarday'),
            'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
                && 'sdh_workcalendarday'[Calendar Date Only] = AfterDay
        ),
        'sdh_workcalendarday'[sdh_cumulativeworkingdaysthroughdate]
    )

RETURN
    IF(
        ISBLANK(BeforeCount) || ISBLANK(AfterCount),
        BLANK(),
        AfterCount - BeforeCount
    )
```

`Finish Delta Work Days`: the same formula with `sdh_finishdatebefore` and `sdh_finishdateafter`.

Set both columns to **Whole number**.

### 8.2 Replace the two classification columns

`Variance Start Classification`:

```dax
SWITCH(
    TRUE(),
    'sdh_weeklyvariance'[Start Delta Work Days] > 0, "Delayed Start",
    'sdh_weeklyvariance'[Start Delta Work Days] < 0, "Accelerated Start",
    BLANK()
)
```

`Variance Finish Classification`:

```dax
SWITCH(
    TRUE(),
    'sdh_weeklyvariance'[Finish Delta Work Days] > 0, "Delayed Finish",
    'sdh_weeklyvariance'[Finish Delta Work Days] < 0, "Accelerated Finish",
    BLANK()
)
```

### 8.3 Replace `[PPC Delay Days]`

```dax
VAR PlannedFinish =
    [PPC Planned Finish Derived]

VAR ActualFinish =
    [PPC Actual Finish Derived]

VAR StatusDate =
    [PPC Current Status Date]

VAR EffectiveFinish =
    COALESCE(ActualFinish, StatusDate)

VAR PlannedDay =
    IF(
        ISBLANK(PlannedFinish),
        BLANK(),
        DATE(YEAR(PlannedFinish), MONTH(PlannedFinish), DAY(PlannedFinish))
    )

VAR EffectiveDay =
    IF(
        ISBLANK(EffectiveFinish),
        BLANK(),
        DATE(YEAR(EffectiveFinish), MONTH(EffectiveFinish), DAY(EffectiveFinish))
    )

VAR PlannedWorkDay =
    MAXX(
        FILTER(
            ALL('sdh_workcalendarday'),
            'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
                && 'sdh_workcalendarday'[Calendar Date Only] = PlannedDay
        ),
        'sdh_workcalendarday'[sdh_cumulativeworkingdaysthroughdate]
    )

VAR EffectiveWorkDay =
    MAXX(
        FILTER(
            ALL('sdh_workcalendarday'),
            'sdh_workcalendarday'[sdh_calendarcode] = "LINTENDANT_2032"
                && 'sdh_workcalendarday'[Calendar Date Only] = EffectiveDay
        ),
        'sdh_workcalendarday'[sdh_cumulativeworkingdaysthroughdate]
    )

RETURN
    IF(
        ISBLANK(PlannedWorkDay) || ISBLANK(EffectiveWorkDay),
        BLANK(),
        MAX(0, EffectiveWorkDay - PlannedWorkDay)
    )
```

### 8.4 Report pages

1. **Weekly Variance → Variance Detail:** replace *Sum of sdh_startdeltadays* with **`Start Delta Work Days`** (header *"Start Δ (work days)"*). Replace *Sum of sdh_finishdeltadays* with **`Finish Delta Work Days`** (header *"Finish Δ (work days)"*). Keep *Duration Δ*.
2. **PPC → Missed Commitments:** rename the *Delay Days* header to **"Delay (work days)"**.

### 8.5 Test

Pick tasks whose finish moved from a **Friday to the next Monday** (expected +1), **across the July construction holiday** (holiday days not counted), and **Saturday → Sunday** (0 = no classification).

---

## 9. Final cross-page validation

### 9.1 Test matrix

Run every row on **two snapshots** per project (latest and one older):

| Project type | Example | Watch for |
| --- | --- | --- |
| Partial reference dates | 232408, 25010 | Planned line still drawn; *⚠ Partial* label |
| Recorded reference dates | 25015 | *✓ Recorded* label |
| Not recorded | (pick one) | Planned line blank, no error |
| Nearly complete | 232408 | Actual line reaches status date; Missing Logic not N/A |
| Construction-heavy | 25010 | Procurement shows "--" / N/O |
| Procurement-heavy | 25015 | Procurement PPC trend has points |
| 1 active task | Kinatex Apex Montcalm | Missing Logic = 0% |

### 9.2 Per-page checklist

**Project Overview**
- [ ] Construction Progress card = last point of the Actual line (task 3)
- [ ] Actual line starts at ~0% and stops at the status date
- [ ] Planned / Forecast lines span the full timeline; axis not truncated by the snapshot
- [ ] 4-Week PPC = PPC page Construction 4-Week PPC, with N/O when appropriate
- [ ] Schedule Quality: no unexpected N/A
- [ ] Open Tasks shows the full number ("168 of 1,170 (14.4%)")

**PPC**
- [ ] Delay-cause chart total = coverage card denominator
- [ ] Construction Current PPC shows N/O when Planned = 0
- [ ] Card titles spelled correctly
- [ ] PPC Trend point = Current PPC card

**Weekly Variance**
- [ ] Changed ≤ Active Tasks (start of week)
- [ ] Δ columns in work days
- [ ] Detail table unchanged

**Quality**
- [ ] Missing Logic % = Overview value
- [ ] Global Score unchanged except where Missing Logic was blank before

**Project Portfolio**
- [ ] Const. Progress = Overview card for the same project on its latest snapshot
- [ ] Const. 4-Week PPC = PPC page on the latest snapshot; N/O shown as text

**Lookahead / Explorer / Data Health**
- [ ] Unchanged; slicers and Gantt render; Data Health shows the latest import run

### 9.3 Formatting

- [ ] Every percentage measure: format *Percentage*, 0 decimals (PPC Display measures 1 decimal)
- [ ] Every count: *Whole number* with thousands separator
- [ ] No axis starting above 0 on % charts (Y-axis min = 0, max = 1)
- [ ] All pages the same canvas size (*Format → Canvas settings*), *Fit to page*

### 9.4 Clean-up (after Simon approves)

Delete measures no visual uses. Check each with *right-click → Find usage* (or search the report) before deleting: `Measure`, `Measure 2` … `Measure 6`, `DEBUG …`, `Debug …`, `Executive Actual Progress %`, `Executive Actual Progress Derived %`, `Executive Actual Root Comparison %`, `Executive Forecast Progress %`, `Executive Planned Progress %`, `Executive Actual vs Forecast Pts`, `Executive Actual vs Planned Pts`, `Construction Missed With Cause - Period`, `PPC Missed by Delay Cause - Period`, `PPC Days Overdue`, `PPC Finish Shift Days`, `PPC Forecast Slip Days`.

Then publish (see step 0) and run the 9.1 matrix once more in the Service.

---

## Decisions to confirm with Simon

1. **Unfinished-task rule** for Actual progress (task 2): status-date anchor (recommended) or linear to forecast finish.
2. **Delay-cause chart scope** (task 5): Construction only (recommended, matches the card) or Construction + Procurement.
3. **Cumulative** in task 5 now means "up to the selected snapshot", not "all snapshots".
4. **Weekly Variance comparison population** (task 6): non-summary tasks open at the start of the week.
5. **Overview 4-Week PPC** (task 7) shows Construction 4-Week PPC.
