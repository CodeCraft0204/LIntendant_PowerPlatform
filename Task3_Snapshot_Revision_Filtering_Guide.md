# Task 3 — Standard project / snapshot / revision filtering — apply guide

Based on `SDH Scheduling Model (3).pbix` (model) and `SDH Project Scheduling Dashboard (1).pbix` (thin report, live-connected).

## What this changes

| Requirement | How it is met |
| --- | --- |
| No revision selector on any page | Revision slicers deleted (6 pages) |
| Only the latest fully processed revision per project and snapshot date | New column **Is Reporting Snapshot**, applied as a page filter on the 7 reporting pages |
| Incomplete imports never reach reporting; previous valid snapshot stays available while a new one is processing | Snapshot table filtered to completed imports at load |
| Historical snapshot selection is kept | Snapshot slicer still lists every completed snapshot date |
| Switching project lands on that project's latest snapshot | Slicer moves to a new column **Snapshot Label**, where each project's newest snapshot is the value `Latest` |
| Weekly Variance filters like the other pages | Its custom slicer is replaced by the shared one |

Do the parts in order. The report is live-connected, so the model must be published (Part A–C) before the report can see the new columns (Part D).

> **Known limit.** Power BI cannot make one slicer reset another. `Latest` is the default and survives a project switch. If a user has picked a historical date and then switches to a project that has no snapshot on that date, the page shows blank until they pick a snapshot or press **Reset Filters**.

---

## Part A — Load only completed snapshots (Power Query)

Snapshot import status values: `232400001` = processing, `232400002` = completed. A snapshot is created as *processing* and only set to *completed* at the end of SDH-01, so failed and in-flight imports stay at `232400001`.

1. Open `SDH Scheduling Model (3).pbix` → **Transform data**.
2. Select query **sdh_schedulesnapshot** → **Advanced Editor** → replace with:

```m
let
  Source = CommonDataService.Database("org0c30843a.crm3.dynamics.com"),
  #"Navigation 1" = Source{[Schema = "dbo", Item = "sdh_schedulesnapshot"]}[Data],
  #"Completed Only" = Table.SelectRows(#"Navigation 1", each [sdh_importstatus] = 232400002)
in
  #"Completed Only"
```

3. **Close & Apply** (this refreshes from Dataverse).

Why here and not only in DAX: 34 measures and columns look up "latest date / latest revision" with `ALL('sdh_schedulesnapshot')`, which ignores report filters. Removing incomplete rows at load fixes all of them at once, including `Is Latest Snapshot` and every `Portfolio …` measure.

Check before moving on: in Data view, `sdh_schedulesnapshot[sdh_importstatusname]` shows a single value. If the row count drops to zero, the completed value in your environment is different — stop and check the choice values in Dataverse.

---

## Part B — Three calculated columns on `sdh_schedulesnapshot`

Use `MAXX( FILTER( ALL(…) ) )` exactly as written. Do **not** rewrite these with `CALCULATE`, and do not reference `[Is Latest Snapshot]` inside them: that column already uses `CALCULATE`, and a second one on the same table gives a circular dependency error.

### B1. `Is Reporting Snapshot`

```dax
Is Reporting Snapshot =
VAR CurrentProject = 'sdh_schedulesnapshot'[sdh_projectnumber]
VAR CurrentDate = 'sdh_schedulesnapshot'[sdh_snapshotdate]
VAR LatestCompletedRevision =
    MAXX(
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                && 'sdh_schedulesnapshot'[sdh_snapshotdate] = CurrentDate
                && 'sdh_schedulesnapshot'[sdh_importstatus] = 232400002
        ),
        'sdh_schedulesnapshot'[sdh_snapshotrevision]
    )
RETURN
IF(
    'sdh_schedulesnapshot'[sdh_importstatus] = 232400002
        && 'sdh_schedulesnapshot'[sdh_snapshotrevision] = LatestCompletedRevision,
    1,
    0
)
```

Data type **Whole number**, summarization **Don't summarize**.

### B2. `Snapshot Label`

```dax
Snapshot Label =
VAR CurrentProject = 'sdh_schedulesnapshot'[sdh_projectnumber]
VAR CurrentDate = 'sdh_schedulesnapshot'[sdh_snapshotdate]
VAR LatestCompletedDate =
    MAXX(
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                && 'sdh_schedulesnapshot'[sdh_importstatus] = 232400002
        ),
        'sdh_schedulesnapshot'[sdh_snapshotdate]
    )
RETURN
IF(
    CurrentDate = LatestCompletedDate,
    "Latest",
    FORMAT(CurrentDate, "yyyy-MM-dd")
)
```

### B3. `Snapshot Label Sort`

```dax
Snapshot Label Sort =
VAR CurrentProject = 'sdh_schedulesnapshot'[sdh_projectnumber]
VAR CurrentDate = 'sdh_schedulesnapshot'[sdh_snapshotdate]
VAR LatestCompletedDate =
    MAXX(
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                && 'sdh_schedulesnapshot'[sdh_importstatus] = 232400002
        ),
        'sdh_schedulesnapshot'[sdh_snapshotdate]
    )
RETURN
IF(
    CurrentDate = LatestCompletedDate,
    99991231,
    YEAR(CurrentDate) * 10000 + MONTH(CurrentDate) * 100 + DAY(CurrentDate)
)
```

Data type **Whole number**, **Don't summarize**, then hide it in report view.

### B4. Sort the label

Select column **Snapshot Label** → **Column tools → Sort by column → Snapshot Label Sort**.

Check: in Data view filter one project. Exactly one date carries `Latest`; the others show their date; superseded revisions have `Is Reporting Snapshot = 0`.

---

## Part C — Measures: clear the label wherever the date is cleared

The slicer will now filter `Snapshot Label` instead of `sdh_snapshotdate`. Twelve measures remove the date filter to look at other snapshots (4-week PPC, cumulative misses, fallbacks). If they do not also remove the label filter, selecting `Latest` would pin them to a single snapshot and the 4-week and cumulative figures would collapse to one week.

The rule applied in every measure below:

| Before | After |
| --- | --- |
| `REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate])` | `REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label])` |
| `REMOVEFILTERS([sdh_snapshotdate], [sdh_snapshotrevision])` | same, with `[Snapshot Label]` added as a third column |

Measures that use `ALL('sdh_schedulesnapshot')` or `REMOVEFILTERS('sdh_schedulesnapshot')` on the whole table need no change.

Replace the full expression of each of these 12 measures with the version in **Appendix — measure definitions** at the end of this file:

1. `Construction Missed Cumulative`
2. `Construction Missed With Cause Cumulative`
3. `Effective Snapshot Date`
4. `Effective Snapshot Revision`
5. `PPC 4W Completed`
6. `PPC 4W Completed Derived`
7. `PPC 4W Planned`
8. `PPC 4W Planned Derived` — **also contains the Task 4 denominator fix** (`CurrentDate` now follows the selected snapshot, same as the Completed measure). If you already applied that fix, this version keeps it.
9. `PPC Missed by Activity Code Cumulative`
10. `PPC Missed by Delay Cause Cumulative`
11. `PPC Rolling 4 Week %`
12. `Selected Snapshot Date`

`Effective Snapshot Date OLD` is unused; leave it or delete it.

Then **save and publish the model** to the workspace *Scheduling Data Hub POC*, replacing `SDH Scheduling Model`.

---

## Part D — Report (`SDH Project Scheduling Dashboard`)

Open the report after the model is published so the new columns appear in the Data pane.

### D1. Delete the revision slicers

Delete the slicer bound to `sdh_snapshotrevision` on these 6 pages (it is the third dropdown in the header, left of **Reset Filters**):

- Project Overview
- Quality
- PPC
- Lookahead
- Explorer
- Data Health

Weekly Variance and Project Portfolio have none. Afterwards open **View → Sync slicers** and confirm no hidden slicer in the group `sdh_snapshotrevision` remains on any page.

### D2. Point the snapshot slicer at `Snapshot Label`

The snapshot slicers on Overview, Quality, PPC, Lookahead, Explorer and Data Health are one sync group (`sdh_snapshotdate`) with *sync field changes* on, so one swap updates all six.

1. On **Project Overview**, select the snapshot date slicer.
2. In the **Field** well, drag `Snapshot Label` onto `sdh_snapshotdate` to replace it. Replace in place — do not delete the slicer and add a new one, because the existing slicer carries the "do not filter the trend charts" interactions.
3. Slicer **…** menu → **Sort axis → Snapshot Label → Sort descending**. `Latest` is now the first item.
4. Format → Slicer settings → Selection: keep **Single select** and **Force selection** on.
5. Set the header text to `Snapshot`.
6. Select `Latest`.
7. Visit the other five pages and confirm the slicer now shows `Snapshot Label` with `Latest` selected. If a page still shows the date field, repeat steps 2–4 there.
8. The visual-level filter `Snapshot Date Has Selected Project = 1` stays on each slicer; it is what limits the list to the selected project's snapshots.

Widen the slicer into the space freed by the revision slicer.

### D3. Weekly Variance — use the shared slicer

1. Select the slicer bound to `sdh_weeklyvariance[sdh_tosnapshotname]`.
2. Replace its field with `sdh_schedulesnapshot[Snapshot Label]`; sort descending; single select + force selection.
3. Add visual-level filter `Snapshot Date Has Selected Project` **is 1**.
4. **View → Sync slicers → Advanced options**: set the group name to `sdh_snapshotdate` and tick both sync options, so it follows the other pages.
5. Keep the **Compared With** card as is. The variance table filters through the existing relationship `sdh_weeklyvariance[sdh_tosnapshot] → sdh_schedulesnapshot`.

### D4. Page filter on the 7 reporting pages

On each of **Project Portfolio, Project Overview, Quality, PPC, Weekly Variance, Lookahead, Explorer**:

1. Drag `sdh_schedulesnapshot[Is Reporting Snapshot]` to **Filters on this page**.
2. Basic filtering → tick **1**.
3. Lock it and hide it (the lock and eye icons on the filter card).

Do **not** add it to *Filters on all pages*, and do not add it to **Data Health**: that page must keep showing warnings from failed and in-progress imports, which have no reporting snapshot.

### D5. Project Portfolio table

In **Active Project Information**, remove the visual filter `sdh_islatestrevision is true`. Keep `Is Latest Snapshot is 1` and `sdh_projectprogresspercent is not 100`. The Dataverse flag is no longer needed and is one of the reasons projects were dropping out of the table.

### D6. Reset Filters button

No change to the button. With force selection on and `Latest` sorted first, clearing slicers should return the snapshot to `Latest`. Confirm this in D7; if it lands elsewhere, replace the button action with a bookmark that stores only the snapshot slicer at `Latest`.

Save and publish the report.

---

## Part E — Validate

| # | Test | Expected |
| --- | --- | --- |
| 1 | Any reporting page | No revision dropdown |
| 2 | Pick project A, snapshot `Latest`; switch to project B | Slicer still `Latest`; Status Date on Overview is B's newest completed snapshot |
| 3 | Open the snapshot dropdown for a project | `Latest` first, then older dates descending; only that project's dates |
| 4 | Pick an older date | All cards and tables follow it; trend charts still show the full history |
| 5 | PPC page, project 232408, older snapshot | 4-week "X / Y met": both X and Y change with the selected date |
| 6 | PPC page, 232408, 2026-09-04 | Planned / Completed counts no longer doubled |
| 7 | Navigate between pages | Project and snapshot selection carry over, including Weekly Variance |
| 8 | Weekly Variance, `Latest` | Table shows changes into the latest snapshot; **Compared With** shows the previous one |
| 9 | Project Portfolio | One row per active project; none missing because of a failed or in-progress newer import |
| 10 | Upload a new file and open the report while SDH-01 is still running (after a model refresh) | The project still shows its previous snapshot as `Latest` |
| 11 | Press **Reset Filters** | Snapshot returns to `Latest` |
| 12 | Data Health | Warnings table still lists failed-import issues |

If test 5 or 6 fails, a measure in Part C was missed. If test 2 shows blank, check that `Snapshot Label Sort` is set as the sort column and that the page filter value is `1`, not `0`.

---

## Appendix — measure definitions (Part C)

Paste everything after the first `=` if you edit in the formula bar, or the whole block in DAX query / TMDL view.

#### `Construction Missed Cumulative`

```dax
Construction Missed Cumulative =
VAR ProjectNumber =
    SELECTEDVALUE(
        'sdh_schedulesnapshot'[sdh_projectnumber]
    )

VAR SnapshotDates =
    CALCULATETABLE(
        VALUES(
            'sdh_schedulesnapshot'[sdh_snapshotdate]
        ),
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber]
                = ProjectNumber
        )
    )

RETURN
SUMX(
    SnapshotDates,

    VAR PeriodDate =
        'sdh_schedulesnapshot'[sdh_snapshotdate]

    RETURN
        COALESCE(
            CALCULATE(
                [Construction PPC Missed],

                REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),

                REMOVEFILTERS(
                    'sdh_schedulesnapshot'[sdh_snapshotrevision]
                ),

                TREATAS(
                    { PeriodDate },
                    'sdh_schedulesnapshot'[sdh_snapshotdate]
                )
            ),
            0
        )
)
```

#### `Construction Missed With Cause Cumulative`

```dax
Construction Missed With Cause Cumulative =
VAR SelectedProjectNumber =
    SELECTEDVALUE(
        'sdh_schedulesnapshot'[sdh_projectnumber]
    )

VAR SnapshotDates =
    CALCULATETABLE(
        VALUES(
            'sdh_schedulesnapshot'[sdh_snapshotdate]
        ),
        FILTER(
            ALL(
                'sdh_schedulesnapshot'
            ),
            'sdh_schedulesnapshot'[sdh_projectnumber]
                = SelectedProjectNumber
        )
    )

RETURN
SUMX(
    SnapshotDates,

    VAR PeriodDate =
        'sdh_schedulesnapshot'[sdh_snapshotdate]

    RETURN
        COALESCE(
            CALCULATE(
                [Construction Missed With Cause - Period],

                REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),

                REMOVEFILTERS(
                    'sdh_schedulesnapshot'[sdh_snapshotrevision]
                ),

                TREATAS(
                    { PeriodDate },
                    'sdh_schedulesnapshot'[sdh_snapshotdate]
                )
            ),
            0
        )
)
```

#### `Effective Snapshot Date`

```dax
Effective Snapshot Date =
VAR ProjectNumber =
    SELECTEDVALUE (
        'sdh_project'[sdh_projectnumber]
    )

VAR SelectedSnapshot =
    SELECTEDVALUE (
        'sdh_schedulesnapshot'[sdh_snapshotdate]
    )

VAR SelectedSnapshotIsValid =
    CALCULATE (
        COUNTROWS ( 'sdh_schedulesnapshot' ),
        REMOVEFILTERS(
            'sdh_schedulesnapshot'[sdh_snapshotdate],
            'sdh_schedulesnapshot'[sdh_snapshotrevision],
            'sdh_schedulesnapshot'[Snapshot Label]
        ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = ProjectNumber,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = SelectedSnapshot
    ) > 0

VAR LatestSnapshot =
    CALCULATE (
        MAX (
            'sdh_schedulesnapshot'[sdh_snapshotdate]
        ),
        REMOVEFILTERS(
            'sdh_schedulesnapshot'[sdh_snapshotdate],
            'sdh_schedulesnapshot'[sdh_snapshotrevision],
            'sdh_schedulesnapshot'[Snapshot Label]
        ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = ProjectNumber
    )

RETURN
    IF (
        SelectedSnapshotIsValid,
        SelectedSnapshot,
        LatestSnapshot
    )
```

#### `Effective Snapshot Revision`

```dax
Effective Snapshot Revision =
VAR ProjectNumber =
    SELECTEDVALUE (
        'sdh_project'[sdh_projectnumber]
    )

VAR SnapshotDate =
    [Effective Snapshot Date]

VAR SelectedRevision =
    SELECTEDVALUE (
        'sdh_schedulesnapshot'[sdh_snapshotrevision]
    )

VAR SelectedRevisionIsValid =
    CALCULATE (
        COUNTROWS (
            'sdh_schedulesnapshot'
        ),
        REMOVEFILTERS(
            'sdh_schedulesnapshot'[sdh_snapshotdate],
            'sdh_schedulesnapshot'[sdh_snapshotrevision],
            'sdh_schedulesnapshot'[Snapshot Label]
        ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = ProjectNumber,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = SnapshotDate,
        'sdh_schedulesnapshot'[sdh_snapshotrevision] = SelectedRevision
    ) > 0

VAR LatestRevision =
    CALCULATE (
        MAX (
            'sdh_schedulesnapshot'[sdh_snapshotrevision]
        ),
        REMOVEFILTERS(
            'sdh_schedulesnapshot'[sdh_snapshotdate],
            'sdh_schedulesnapshot'[sdh_snapshotrevision],
            'sdh_schedulesnapshot'[Snapshot Label]
        ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = ProjectNumber,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = SnapshotDate
    )

RETURN
    IF (
        SelectedRevisionIsValid,
        SelectedRevision,
        LatestRevision
    )
```

#### `PPC 4W Completed`

```dax
PPC 4W Completed =
VAR CurrentDate =
    [Selected PPC Snapshot Date]

VAR CandidateDates =
    CALCULATETABLE(
        VALUES(
            'sdh_ppcresult'[PPC To Snapshot Date]
        ),
        REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),
        REMOVEFILTERS(
            'sdh_schedulesnapshot'[sdh_snapshotrevision]
        )
    )

VAR Last4Periods =
    TOPN(
        4,
        FILTER(
            CandidateDates,
            'sdh_ppcresult'[PPC To Snapshot Date]
                <= CurrentDate
        ),
        'sdh_ppcresult'[PPC To Snapshot Date],
        DESC
    )

RETURN
CALCULATE(
    [PPC Completed Commitments],
    REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),
    REMOVEFILTERS(
        'sdh_schedulesnapshot'[sdh_snapshotrevision]
    ),
    TREATAS(
        Last4Periods,
        'sdh_ppcresult'[PPC To Snapshot Date]
    )
)
```

#### `PPC 4W Completed Derived`

```dax
PPC 4W Completed Derived =
SUMX(
    VALUES('sdh_schedulesnapshot'[sdh_projectnumber]),
    VAR CurrentProject = 'sdh_schedulesnapshot'[sdh_projectnumber]
    
    -- Uses MAX if SELECTEDVALUE is BLANK (e.g., total rows or unselected dates)
    VAR CurrentDate = 
        COALESCE(
            SELECTEDVALUE('sdh_schedulesnapshot'[sdh_snapshotdate]),
            CALCULATE(
                MAX('sdh_schedulesnapshot'[sdh_snapshotdate]),
                ALL('sdh_schedulesnapshot'),
                'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
            )
        )
    
    VAR CandidateDates =
        CALCULATETABLE(
            VALUES('sdh_schedulesnapshot'[sdh_snapshotdate]),
            FILTER(
                ALL('sdh_schedulesnapshot'),
                'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                    && 'sdh_schedulesnapshot'[sdh_snapshotdate] <= CurrentDate
            )
        )

    VAR ValidPeriods =
        FILTER(
            CandidateDates,
            VAR PeriodDate = 'sdh_schedulesnapshot'[sdh_snapshotdate]
            VAR PeriodPlanned =
                CALCULATE(
                    [PPC Planned Commitments Derived],
                    REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),
                    REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotrevision]),
                    TREATAS({ PeriodDate }, 'sdh_schedulesnapshot'[sdh_snapshotdate])
                )
            RETURN NOT ISBLANK(PeriodPlanned)
        )

    VAR Last4Periods =
        TOPN(
            4,
            ValidPeriods,
            'sdh_schedulesnapshot'[sdh_snapshotdate],
            DESC
        )

    RETURN
        SUMX(
            Last4Periods,
            VAR PeriodDate = 'sdh_schedulesnapshot'[sdh_snapshotdate]
            RETURN
                COALESCE(
                    CALCULATE(
                        [PPC Completed Commitments Derived],
                        REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),
                        REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotrevision]),
                        TREATAS({ PeriodDate }, 'sdh_schedulesnapshot'[sdh_snapshotdate])
                    ),
                    0
                )
        )
)
```

#### `PPC 4W Planned`

```dax
PPC 4W Planned =
VAR CurrentDate =
    [Selected PPC Snapshot Date]

VAR CandidateDates =
    CALCULATETABLE(
        VALUES(
            'sdh_ppcresult'[PPC To Snapshot Date]
        ),
        REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),
        REMOVEFILTERS(
            'sdh_schedulesnapshot'[sdh_snapshotrevision]
        )
    )

VAR Last4Periods =
    TOPN(
        4,
        FILTER(
            CandidateDates,
            'sdh_ppcresult'[PPC To Snapshot Date]
                <= CurrentDate
        ),
        'sdh_ppcresult'[PPC To Snapshot Date],
        DESC
    )

RETURN
CALCULATE(
    [PPC Planned Commitments],
    REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),
    REMOVEFILTERS(
        'sdh_schedulesnapshot'[sdh_snapshotrevision]
    ),
    TREATAS(
        Last4Periods,
        'sdh_ppcresult'[PPC To Snapshot Date]
    )
)
```

#### `PPC 4W Planned Derived`

```dax
PPC 4W Planned Derived =
SUMX(
    VALUES('sdh_schedulesnapshot'[sdh_projectnumber]),
    VAR CurrentProject = 'sdh_schedulesnapshot'[sdh_projectnumber]
    
    VAR CurrentDate =
        COALESCE(
            SELECTEDVALUE('sdh_schedulesnapshot'[sdh_snapshotdate]),
            CALCULATE(
                MAX('sdh_schedulesnapshot'[sdh_snapshotdate]),
                ALL('sdh_schedulesnapshot'),
                'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
            )
        )

    VAR CandidateDates =
        CALCULATETABLE(
            VALUES('sdh_schedulesnapshot'[sdh_snapshotdate]),
            FILTER(
                ALL('sdh_schedulesnapshot'),
                'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                    && 'sdh_schedulesnapshot'[sdh_snapshotdate] <= CurrentDate
            )
        )

    VAR ValidPeriods =
        FILTER(
            CandidateDates,
            VAR PeriodDate = 'sdh_schedulesnapshot'[sdh_snapshotdate]
            VAR PeriodPlanned =
                CALCULATE(
                    [PPC Planned Commitments Derived],
                    REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),
                    REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotrevision]),
                    TREATAS({ PeriodDate }, 'sdh_schedulesnapshot'[sdh_snapshotdate])
                )
            RETURN NOT ISBLANK(PeriodPlanned)
        )

    VAR Last4Periods =
        TOPN(
            4,
            ValidPeriods,
            'sdh_schedulesnapshot'[sdh_snapshotdate],
            DESC
        )

    RETURN
        SUMX(
            Last4Periods,
            VAR PeriodDate = 'sdh_schedulesnapshot'[sdh_snapshotdate]
            RETURN
                COALESCE(
                    CALCULATE(
                        [PPC Planned Commitments Derived],
                        REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),
                        REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotrevision]),
                        TREATAS({ PeriodDate }, 'sdh_schedulesnapshot'[sdh_snapshotdate])
                    ),
                    0
                )
        )
)
```

#### `PPC Missed by Activity Code Cumulative`

```dax
PPC Missed by Activity Code Cumulative =
VAR ProjectNumber =
    SELECTEDVALUE(
        'sdh_schedulesnapshot'[sdh_projectnumber]
    )

VAR SnapshotDates =
    CALCULATETABLE(
        VALUES(
            'sdh_schedulesnapshot'[sdh_snapshotdate]
        ),

        FILTER(
            ALL('sdh_schedulesnapshot'),

            'sdh_schedulesnapshot'[sdh_projectnumber]
                = ProjectNumber
        )
    )

RETURN
SUMX(
    SnapshotDates,

    VAR PeriodDate =
        'sdh_schedulesnapshot'[sdh_snapshotdate]

    RETURN
        COALESCE(
            CALCULATE(
                [PPC Missed by Activity Code - Period],

                REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),

                REMOVEFILTERS(
                    'sdh_schedulesnapshot'[sdh_snapshotrevision]
                ),

                TREATAS(
                    { PeriodDate },
                    'sdh_schedulesnapshot'[sdh_snapshotdate]
                )
            ),
            0
        )
)
```

#### `PPC Missed by Delay Cause Cumulative`

```dax
PPC Missed by Delay Cause Cumulative =
VAR ProjectNumber =
    SELECTEDVALUE(
        'sdh_schedulesnapshot'[sdh_projectnumber]
    )

VAR SnapshotDates =
    CALCULATETABLE(
        VALUES(
            'sdh_schedulesnapshot'[sdh_snapshotdate]
        ),

        FILTER(
            ALL('sdh_schedulesnapshot'),

            'sdh_schedulesnapshot'[sdh_projectnumber]
                = ProjectNumber
        )
    )

RETURN
SUMX(
    SnapshotDates,

    VAR PeriodDate =
        'sdh_schedulesnapshot'[sdh_snapshotdate]

    RETURN
        COALESCE(
            CALCULATE(
                [PPC Missed by Delay Cause - Period],

                REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label]),

                REMOVEFILTERS(
                    'sdh_schedulesnapshot'[sdh_snapshotrevision]
                ),

                TREATAS(
                    { PeriodDate },
                    'sdh_schedulesnapshot'[sdh_snapshotdate]
                )
            ),
            0
        )
)
```

#### `PPC Rolling 4 Week %`

```dax
PPC Rolling 4 Week % =
VAR CurrentDate =
    SELECTEDVALUE(
        'sdh_schedulesnapshot'[sdh_snapshotdate]
    )

VAR ProjectNumber =
    [PPC Selected Project]

VAR Last4Dates =
    TOPN(
        4,

        CALCULATETABLE(
            VALUES(
                'sdh_schedulesnapshot'[sdh_snapshotdate]
            ),

            FILTER(
    ALL('sdh_schedulesnapshot'),
    'sdh_schedulesnapshot'[sdh_projectnumber]
        = ProjectNumber
        &&
    'sdh_schedulesnapshot'[sdh_snapshotdate]
        <= CurrentDate
)
        ),

        'sdh_schedulesnapshot'[sdh_snapshotdate],
        DESC
    )

VAR Planned4 =
    SUMX(
        Last4Dates,

        VAR D =
            'sdh_schedulesnapshot'[sdh_snapshotdate]

        RETURN
            CALCULATE(
                [PPC Planned Commitments Derived],

                REMOVEFILTERS(
            'sdh_schedulesnapshot'[sdh_snapshotdate],
            'sdh_schedulesnapshot'[sdh_snapshotrevision],
            'sdh_schedulesnapshot'[Snapshot Label]
        ),

                TREATAS(
                    { D },
                    'sdh_schedulesnapshot'[sdh_snapshotdate]
                )
            )
    )

VAR Completed4 =
    SUMX(
        Last4Dates,

        VAR D =
            'sdh_schedulesnapshot'[sdh_snapshotdate]

        RETURN
            CALCULATE(
                [PPC Completed Commitments Derived],

                REMOVEFILTERS(
            'sdh_schedulesnapshot'[sdh_snapshotdate],
            'sdh_schedulesnapshot'[sdh_snapshotrevision],
            'sdh_schedulesnapshot'[Snapshot Label]
        ),

                TREATAS(
                    { D },
                    'sdh_schedulesnapshot'[sdh_snapshotdate]
                )
            )
    )

RETURN
DIVIDE(
    Completed4,
    Planned4
)
```

#### `Selected Snapshot Date`

```dax
Selected Snapshot Date =
VAR D =
    SELECTEDVALUE(
        'sdh_schedulesnapshot'[sdh_snapshotdate]
    )
RETURN
    COALESCE(
        D,
        CALCULATE(
            MAX('sdh_schedulesnapshot'[sdh_snapshotdate]),
            REMOVEFILTERS('sdh_schedulesnapshot'[sdh_snapshotdate], 'sdh_schedulesnapshot'[Snapshot Label])
        )
    )
```

