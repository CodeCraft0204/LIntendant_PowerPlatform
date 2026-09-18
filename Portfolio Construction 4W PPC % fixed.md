**Why it’s wrong:** `Portfolio Construction 4W PPC %` uses `FILTER(ALL(sdh_schedulesnapshot), …)`, which locks the **whole snapshot row**. Inside the 4W logic, older weeks can’t calculate, so you only get **one week** = same as **Current PPC** (`Completed / Planned`), not **4W** (`4W Completed / 4W Planned`).

**Fix:** Rewrite the two Portfolio measures with **column filters** + `REMOVEFILTERS`, then put them on the table.

---

### Step 1 — Open the model
1. Open **`SDH Scheduling Model.pbix`** (or the dataset in Desktop).
2. Go to **Data / Model** → table **`_Measures`**.

---

### Step 2 — Replace `Portfolio Construction 4W PPC %`

Select the measure → replace **entire** formula with:

```dax
Portfolio Construction 4W PPC % =
VAR CurrentProject =
    SELECTEDVALUE ( 'sdh_schedulesnapshot'[sdh_projectnumber] )

VAR LatestDate =
    CALCULATE (
        MAX ( 'sdh_schedulesnapshot'[sdh_snapshotdate] ),
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
    )

VAR LatestRevision =
    CALCULATE (
        MAX ( 'sdh_schedulesnapshot'[sdh_snapshotrevision] ),
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate
    )

VAR Planned =
    CALCULATE (
        [Construction PPC 4W Planned],
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate,
        'sdh_schedulesnapshot'[sdh_snapshotrevision] = LatestRevision
    )

VAR Completed =
    CALCULATE (
        [Construction PPC 4W Completed],
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate,
        'sdh_schedulesnapshot'[sdh_snapshotrevision] = LatestRevision
    )

RETURN
IF (
    Planned = 0,
    BLANK (),
    DIVIDE ( Completed, Planned )
)
```

This is explicitly **`Construction PPC 4W Completed / Construction PPC 4W Planned`** on the project’s latest snapshot + revision.

---

### Step 3 — Replace `Portfolio Construction 4W Commitments Summary`

```dax
Portfolio Construction 4W Commitments Summary =
VAR CurrentProject =
    SELECTEDVALUE ( 'sdh_schedulesnapshot'[sdh_projectnumber] )

VAR LatestDate =
    CALCULATE (
        MAX ( 'sdh_schedulesnapshot'[sdh_snapshotdate] ),
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
    )

VAR LatestRevision =
    CALCULATE (
        MAX ( 'sdh_schedulesnapshot'[sdh_snapshotrevision] ),
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate
    )

VAR Planned =
    CALCULATE (
        [Construction PPC 4W Planned],
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate,
        'sdh_schedulesnapshot'[sdh_snapshotrevision] = LatestRevision
    )

VAR Completed =
    CALCULATE (
        [Construction PPC 4W Completed],
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate,
        'sdh_schedulesnapshot'[sdh_snapshotrevision] = LatestRevision
    )

RETURN
FORMAT ( Completed, "#,0" )
    & " / "
    & FORMAT ( Planned, "#,0" )
    & " met"
```

---

### Step 4 — Confirm the Portfolio table fields
**Project Portfolio** → **Active Project Information**:

| Column | Must be this measure (not Current PPC) |
|---|---|
| Construction PPC 4W % | **`Portfolio Construction 4W PPC %`** |
| Construction PPC 4W Commitments Summary | **`Portfolio Construction 4W Commitments Summary`** |

Remove if present: `Construction Current PPC`, `Construction PPC Completed`, `Construction PPC Planned`, or bare `Construction PPC 4W %`.

---

### Step 5 — Verify
1. **PPC / Reliability** → project X → latest snapshot + revision → note **Construction 4-Week PPC** (not “Current PPC”).
2. **Project Portfolio** → same project row → **same %** and same `Completed / Planned met`.
3. Quick check: Current PPC card ≠ 4W card when you have 2+ prior weeks; Portfolio % must match the **4W** card, not Current.

---

### Step 6 — Save & publish
Save model → publish dataset → refresh report (or republish dashboard bound to that dataset).

---

**Do not use** `FILTER ( ALL ( 'sdh_schedulesnapshot' ), … )` in these Portfolio wrappers — that was collapsing 4W to Current.