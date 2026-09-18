**Reason:** `Portfolio Quality Global Score` was created as a **calculated column** on `_Measures`, not as a **measure**.

That causes both symptoms:

1. **Grade error** — `[Portfolio Quality Global Score]` is read as a **column**. A measure has no row on `_Measures`, so you get: *“column doesn't exist, or there is no current row”*.
2. **Blank on Portfolio table** — a column on `_Measures` does **not** get each project’s snapshot filter context, so `SELECTEDVALUE(sdh_schedulesnapshot[…])` is blank and the formula returns blank.

---

## Perfect fix (do this exactly)

### Step 1 — Delete the calculated column
1. Model view → table **`_Measures`**
2. Find column **`Portfolio Quality Global Score`** (column icon, not measure icon)
3. Right‑click → **Delete** → confirm

### Step 2 — Create it again as a **measure**
1. Select table **`_Measures`**
2. **New measure** (not New column)
3. Paste:

```dax
Portfolio Quality Global Score =
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
RETURN
IF (
    ISBLANK ( CurrentProject ) || ISBLANK ( LatestDate ) || ISBLANK ( LatestRevision ),
    BLANK (),
    CALCULATE (
        [Quality Global Score],
        REMOVEFILTERS ( 'sdh_schedulesnapshot' ),
        REMOVEFILTERS ( 'sdh_project' ),
        'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject,
        'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate,
        'sdh_schedulesnapshot'[sdh_snapshotrevision] = LatestRevision,
        TREATAS ( { CurrentProject }, 'sdh_project'[sdh_projectnumber] )
    )
)
```

4. Commit — Fields list should show a **calculator** icon, not a column icon.

### Step 3 — Create / fix Grade as a **measure**
**New measure** (same table):

```dax
Portfolio Quality Global Grade =
VAR Score = [Portfolio Quality Global Score]
RETURN
SWITCH (
    TRUE (),
    ISBLANK ( Score ), "-",
    Score >= 90, "A",
    Score >= 80, "B",
    Score >= 70, "C",
    Score >= 60, "D",
    "F"
)
```

Red underline should disappear.

### Step 4 — Fix Active Project Information
1. Remove the old **column** field if still on the visual  
2. Add measure **`Portfolio Quality Global Score`**  
3. (Optional) add **`Portfolio Quality Global Grade`**

### Step 5 — Check
- Portfolio row for a project shows a number (not blank)  
- Schedule Quality → same project + **latest** date + revision → same score  

---

**Rule:** on `_Measures`, always use **New measure**. Never **New column** for Portfolio wrappers.