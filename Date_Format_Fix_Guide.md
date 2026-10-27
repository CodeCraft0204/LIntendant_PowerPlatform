# Actual dates lost on import: fix guide (232408, 10/16)

## Cause

The weekly export `20261016 Utile Saint-Sacrement.xlsx` contains every actual date. MS Project wrote two date formats in the same file:

| Columns | Format in this file |
| --- | --- |
| `Début`, `Fin`, `Début_de_référence`, `Fin_de_référence` | `2023 Novembre 23 07:30` |
| `Début_réel`, `Fin_réelle`, `Début_prévu`, `Fin_prévue`, `Date_contrainte` | `Jeu 23-11-23` (weekday + yy-mm-dd) |

The Office Script `parseDateOnly` accepted `23-11-23` only with nothing before it. Every `Jeu 23-11-23` value came back blank, so:

- `sdh_actualstart`, `sdh_actualfinish`, `sdh_plannedstart`, `sdh_plannedfinish` and `sdh_constraintdate` are empty for that snapshot.
- Every affected row was flagged `sdh_hasinvaliddate = Yes` with an "Invalid Date" validation issue, which inflates the **Invalid Dates** quality KPI for that snapshot.

The second format comes from the exporting user's MS Project setting (*File → Options → General → Date format*). Any PC with that setting produces the same file.

What is **not** affected:

- **Start, Finish and reference dates.** They use the first format, so the Planned and Forecast curves were correct.
- **Completed tasks / PPC.** A task counts as completed when % complete = 100 *or* it has an actual finish. All 961 finished tasks are at 100%, so completion and PPC were correct.
- **The Actual progress line.** The DAX fallback (Start for Actual Start, Finish for Actual Finish) gives exactly the same dates in this file: 0 differences on 1,024 started tasks and 961 finished tasks.

## Fix (already applied to the local copy)

[SDH_ParseSchedule_v1_optional_params.ts](../POC/03_Docs%20USS%20pour%20POC/Automate/SDH_ParseSchedule_v1_optional_params.ts) is the version the flow runs. Its `main()` parameters match the ones SDH-01 passes. In `parseDateOnly`, the pattern for `yy-mm-dd` now accepts an optional weekday before the date and an optional time after it:

```ts
  // yy-mm-dd, optionally preceded by a weekday ("Jeu 23-11-23") and followed by a time, depending on the exporter's MS Project date format
  match = source.match(/^(?:[A-Za-zÀ-ÿ]+\.?\s+)?(\d{2})-(\d{2})-(\d{2})(?:\s+\d{1,2}:\d{2})?$/);
  if (match) return `20${match[1]}-${match[2]}-${match[3]}`;
```

Tested against the 10/16 file with this pattern: all 1,051 `Début_réel` values, 961 `Fin_réelle`, 1,173 `Début_prévu` / `Fin_prévue` and 407 `Date_contrainte` now parse. 0 failures.

---

## Step 1: Update the Office Script the flow runs

The flow runs a script stored in OneDrive. The local `.ts` file is only a copy, so the change must be made in the online script.

1. In Power Automate, open **SDH-01 Import Weekly Schedule**. Expand **TRY_Import → S20_Parse_Workbook → RUN_Parse_Discovery** and note the **Script** name. **RUN_Parse_Final_Revision** (in S30) uses the same script, so one edit covers both.
2. Open any workbook in **Excel on the web** → **Automate** tab → **All scripts** → open that script.
3. **Back up first.** Select all the code (Ctrl+A), copy it, and save it in a text file named `SDH_ParseSchedule_backup_2026-10-27.ts`.
4. Press Ctrl+F and search for `function parseDateOnly`. Replace these two lines:

   ```ts
     match = source.match(/^(\d{2})-(\d{2})-(\d{2})$/);
     if (match) return `20${match[1]}-${match[2]}-${match[3]}`;
   ```

   with the three lines in *Fix* above.
5. Press **Save script**. Do **not** use *Save as* or *Make a copy*: the flow links to this script file by its ID, so a copy would never run.
6. No change is needed in the flow.

## Step 2: Re-import the 10/16 snapshot

1. Get the original `20261016 Utile Saint-Sacrement.xlsx`. It is in the archive folder that SDH-01 moved it to after the first import, or use your local copy. Keep the file name **unchanged**: the project and the snapshot date are read from it.
2. Wait until no other SDH-01 run is in progress. The flow processes one file at a time.
3. Upload the file to the weekly inbox folder, the same **Exports hebdomadaires** folder used for every weekly file.
4. What the flow does:
   - **It is not rejected as a duplicate.** The duplicate check compares the SharePoint file ID and ETag, and a new upload has a new ID.
   - **It becomes revision 2** of 232408 / 2026-10-16. When the import completes, the flow marks revision 1 as superseded and revision 2 as the latest revision.
5. In Power Automate → SDH-01 → **Run history**, wait for the run to show **Succeeded**. A full import of about 1,170 tasks took between 10 minutes and a few hours in past runs.

If the run fails, open the failed run and check which action failed. If the cause is the script, paste the backup from step 1.3 back into the script and save. Revision 1 stays the latest revision, so the dashboard keeps working.

## Step 3: Refresh the dataset

In the Power BI Service, open the SDH dataset (`9a88558d-…`) and select **Refresh now**, or wait for the scheduled refresh.

## Step 4: Verify the 10/16 snapshot

Run in DAX query view:

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'sdh_scheduletaskversion'[sdh_snapshotrevision],
    TREATAS({"232408"}, 'sdh_scheduletaskversion'[sdh_projectnumber]),
    TREATAS({DATE(2026, 10, 16)}, 'sdh_scheduletaskversion'[sdh_snapshotdate]),
    "Tasks", COUNTROWS('sdh_scheduletaskversion'),
    "With % complete > 0",
        CALCULATE(COUNTROWS('sdh_scheduletaskversion'), 'sdh_scheduletaskversion'[sdh_percentcomplete] > 0),
    "With actual start",
        CALCULATE(COUNTROWS('sdh_scheduletaskversion'), NOT ISBLANK('sdh_scheduletaskversion'[sdh_actualstart])),
    "With actual finish",
        CALCULATE(COUNTROWS('sdh_scheduletaskversion'), NOT ISBLANK('sdh_scheduletaskversion'[sdh_actualfinish])),
    "Invalid date rows",
        CALCULATE(COUNTROWS('sdh_scheduletaskversion'), 'sdh_scheduletaskversion'[sdh_hasinvaliddate] = TRUE())
)
```

Expected:

| Revision | Tasks | With % complete > 0 | With actual start | With actual finish | Invalid date rows |
| --- | --- | --- | --- | --- | --- |
| 1 (old) | 1,173 | 1,024 | 0 | 0 | about 1,170 |
| 2 (new) | 1,173 | 1,024 | **1,051** | **961** | **0** |

Then check the report on 232408 / 10/16:

- [ ] **Project Overview → Schedule Progress Trend:** the Actual line has the same shape as before, since the fallback was exact. It now comes from the real actual dates.
- [ ] **Project Overview → Schedule Quality → Invalid Dates:** drops to about 0%. The Global Score rises accordingly.
- [ ] **Construction Progress card:** unchanged.
- [ ] **PPC page and Weekly Variance:** unchanged. Completion was already correct, and Start/Finish dates did not change.

## Step 5: Find other snapshots with the same problem

Any snapshot exported with the weekday date format has the same symptom. Run:

```dax
EVALUATE
FILTER(
    SUMMARIZECOLUMNS(
        'sdh_scheduletaskversion'[sdh_projectnumber],
        'sdh_scheduletaskversion'[sdh_snapshotdate],
        'sdh_scheduletaskversion'[sdh_snapshotrevision],
        "Tasks", COUNTROWS('sdh_scheduletaskversion'),
        "With % complete > 0",
            CALCULATE(COUNTROWS('sdh_scheduletaskversion'), 'sdh_scheduletaskversion'[sdh_percentcomplete] > 0),
        "With actual start",
            CALCULATE(COUNTROWS('sdh_scheduletaskversion'), NOT ISBLANK('sdh_scheduletaskversion'[sdh_actualstart])),
        "Invalid date rows",
            CALCULATE(COUNTROWS('sdh_scheduletaskversion'), 'sdh_scheduletaskversion'[sdh_hasinvaliddate] = TRUE())
    ),
    [Invalid date rows] > 0
        || [With actual start] < [With % complete > 0]
)
ORDER BY
    'sdh_scheduletaskversion'[sdh_projectnumber],
    'sdh_scheduletaskversion'[sdh_snapshotdate],
    'sdh_scheduletaskversion'[sdh_snapshotrevision]
```

For each row that is the **latest revision** of its snapshot:

- **Invalid date rows close to Tasks:** the date-format issue. Repeat steps 2–4 with that snapshot's file.
- **Only a few invalid date rows:** genuine bad values in the MPP. To see which values, open the row's validation issues in Dataverse (`sdh_validationissue`, issue type *Invalid Date*, column `sdh_rawvalue`). If a value has a format the parser still doesn't handle, send it over and we'll extend `parseDateOnly`.

## Step 6: Close out

- [ ] Script updated online, backup saved.
- [ ] 232408 / 10/16 revision 2 imported and verified.
- [ ] Other affected snapshots (step 5) re-imported.
- [ ] Client informed. Nothing changes on their side, because the parser now accepts both date formats.
