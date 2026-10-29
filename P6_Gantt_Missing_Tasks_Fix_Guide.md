# P6 Gantt doesn't show all tasks: cause and fix

- **Missing tasks** (Fix 1–2, fallback): **SDH Project Scheduling Dashboard (4).pbix**, pages **Explorer** and **Lookahead**. No model change.
- **Leading zeros in WBS numbers** (last section): **SDH Scheduling Model (4).pbix**. No report change.

---

## Cause (confirmed)

The Gantt is the AppSource visual **P6-Gantt Chart Visual** by Abdalla Dabes (ID `p6GanttChartVisual23D4F5A6B7C8D9E0F1A2B3C4D5E6F7A8`, version 1.0.1.3). Power BI loads it from AppSource; it isn't stored in the pbix.

Its package (`capabilities.json` inside the .pbiviz) declares **no row limit**. Power BI then applies its default: a custom visual receives **only the first 1,000 rows**.
The visual also has no "load more" code. So no setting in the Format pane, the report, or the model can change this. Only the visual's package can.

Explorer sends the Gantt one row per WBS node, in WBS order. A schedule with more than 1,000 rows is cut after row 1,000:

- **Beaubassin:** 8.6 TOITURE arrives, but none of its children. So it shows without an expand arrow, and 8.7–8.12 are missing.
- **Every schedule over 1,000 rows** is affected the same way. Le Highlands has 3,836 rows.
- **Lookahead** shows only a few weeks of tasks, so it normally stays under 1,000.

---

## Fix 1: use the 30,000-row copy of the visual (works today)

File: **`P6GanttChart_SDH_30000rows.pbiviz`** (in this folder).

It's the vendor's visual, version 1.0.1.3, with only two changes:

| Change | Value |
|---|---|
| Row limit | 30,000, the maximum Power BI allows |
| ID and name | Its own ID, and the name **P6-Gantt Chart Visual (SDH 30k rows)**. A copy loaded from a file can't reuse the AppSource ID. |

The drawing code, settings and field wells are unchanged.
Built by `_tools/p6gantt/build_p6gantt_rows.py`, which checks that nothing else differs.

### 1a. Import the visual (Power BI Desktop)

1. Open **SDH Project Scheduling Dashboard (4).pbix**.
2. **Visualizations** pane → **`…`** (More options, at the end of the visual icons) → **Import a visual from a file**.
3. Select `P6GanttChart_SDH_30000rows.pbiviz` → **Import** → **OK**.

A new icon appears at the end of the Visualizations pane. It looks the same as the current Gantt icon; hovering shows **P6-Gantt Chart Visual (SDH 30k rows)**.

### 1b. Switch the Explorer Gantt to the new visual

1. Go to the **Explorer** page. Click the Gantt **once** to select it.
2. In the Visualizations pane, click the **new** icon.

   Power BI switches the visual in place. All fields stay in their wells because both visuals have the same ones: Task Names = WBS Display L1–L6, Start Date, Finish Date, Progress, Data Date, Task ID, Predecessor IDs, Total Float.
3. **Filters** pane → *Filters on this visual*: check that **Show Explorer Task is 1** is still there.
4. **Format** pane: check the settings below. They normally carry over because both visuals use the same setting names. Set any that reset.
5. Set **Format → Timeline → Date Format = YYYY-MM-DD**. This fixes the `10/23/2026` dates in the Gantt, the open item from the date-format guide.

| Format pane card | Setting | Value |
|---|---|---|
| (button inside the visual) | Layout | **P6 Layout**. If the Classic layout shows, use the visual's own *Switch Layout* button. |
| P6 Layout Settings | Top Header Background Color | `#2A5080` |
| P6 Layout Settings | Show Activity ID Column / Show Total Float Column / Show Orig Duration Column | Off / Off / On |
| Timeline | Date Format | **YYYY-MM-DD** (new) |
| Timeline | Auto-size Timeline / Fit to Size | Off / Off |
| Timeline | Show Days / Show Weeks | On / Off |
| Timeline | Enable Horizontal Scroll | On |
| Timeline | Show Data Date / Data Date Line Width | On / 2 |
| Professional Features | P6 Format / Compact Mode | On / On |
| Professional Features | Show Dependency Lines / Show Summary Bars | On / On |
| Professional Features | Show Today Line / Today Line Width | On / 3 |
| Professional Features | Show Switch Layout Button | On |
| Professional Features | Grid Line Color | `#355473` |
| Pro-Gantt Settings | Planned Bar Color, Level 3 Color | Theme colour 8, darker 50% |
| Weekend / Non-working Days | Saturday is Off / Sunday is Off | Off / Off |
| Text Formatting | Column Width | 250 |
| Time Frame | Enable Custom Time Frame | Off |

Which WBS nodes are expanded, and the table column widths, are saved by the visual itself and may reset. Expand or resize again if needed.

### 1c. Lookahead page

Do the same steps 1–5 on the Lookahead Gantt. There the visual filter is **Show Lookahead Task is 1**.
It is under 1,000 rows today, but switching it too means a large lookahead can't get cut.

### 1d. Publish

Save → **Publish** → same workspace → **Replace**.

**If the Gantt shows an error in the Power BI service** (for example *custom visuals are disabled* or *not certified*): the tenant blocks visuals loaded from a file.

1. Ask a Fabric admin to add the file: **Admin portal → Organizational visuals → Add visual → From a file**.
   Organizational visuals are allowed even when file visuals are blocked.
2. Then, in Desktop, repeat 1b–1c using **Visualizations → `…` → Get more visuals → My organization → P6-Gantt Chart Visual (SDH 30k rows)** instead of the file.

### 1e. Check

| Project / snapshot | WBS slicer | Expected |
|---|---|---|
| 25029 Beaubassin / 2026-10-23 | All Levels | 8.6 TOITURE has an expand arrow and its tasks; 8.7 to 8.12 follow; the last row matches the end of the MS Project file |
| 24087 Le Highlands / 2026-10-23 | All Levels | The last WBS of the MS Project file appears (3,836 rows) |
| The other 2 projects the client checked | All Levels | Complete to the end |

At *All Levels*, large schedules take a little longer to draw (up to ~3,800 rows). The WBS level slicer still reduces this.

### What to know about this copy

- **Not certified.** Power BI treats a visual loaded from a file as uncertified. It works in the report, but it is **not included in Export to PowerPoint or in email subscriptions**. The AppSource version is.
- **No automatic updates.** The AppSource version updates itself; this copy doesn't.
  - When the author publishes a version with the limit raised (Fix 2), switch back: select the Gantt → click the original icon.
  - Or rebuild from the newer package: `python _tools/p6gantt/build_p6gantt_rows.py <new.pbiviz>`. The copy keeps the same ID, so importing it again replaces it in the report.
- **The visual is the author's work.** The package contains no license text. Get the author's OK before using the modified copy in the client tenant; the email below asks for it.

---

## Fix 2: have the author raise the limit in the published visual (permanent)

For the author it's a one-line change. Once AppSource publishes it (up to ~2 weeks after submission), every report gets it automatically, and Fix 1 can be removed.

Send to **AbdallaDabes@AbdallaAIsolutions.onmicrosoft.com** (from the [support page](https://sites.google.com/view/abdallai-p6-gantt/support)):

> **Subject:** P6-Gantt Chart Visual: schedules over 1,000 activities are cut off
>
> Hello,
>
> We use your P6-Gantt Chart Visual (v1.0.1.3) for MS Project schedules with 1,500 to 4,000 rows. The visual shows only the first 1,000 rows. The rest of the schedule is missing, and the last WBS shown appears without its children.
>
> The cause is that capabilities.json sets no `dataReductionAlgorithm`, so Power BI applies its default of 1,000 categories. Could you add a limit to the categorical mapping and publish an update? For example:
>
> ```json
> "categories": {
>   "for": { "in": "data" },
>   "dataReductionAlgorithm": { "top": { "count": 30000 } }
> }
> ```
>
> (Or `"window"` with `fetchMoreData` if you prefer paging.)
>
> Until the update reaches AppSource, may we use a copy of your package with only this change (and its own GUID) inside our organization?
>
> Thank you.

---

## Fallback: one WBS branch at a time (report only)

Use this only if neither fix can be used yet. Each view stays under 1,000 rows, but users have to pick a branch.

1. **Explorer** page → click an empty area of the canvas.
2. **Visualizations** pane → **Slicer**.
3. **Data** pane → `sdh_scheduletaskversion`:
   - Drag **WBS Display L1** into **Field**.
   - Then drag **WBS Display L2** just below it.

   The slicer becomes a tree, e.g. *8 CONSTRUCTION* → *8.6 TOITURE*.
4. **Format** pane → **Slicer settings**:
   - **Options → Style** = **Dropdown**.
   - **Selection → Single select** = **On**.
5. Select the existing **WBS Level** slicer → **Home → Format painter** → click the new slicer. Then place it in the header, left of the Project slicer, at the same size.
6. **Format → Slicer header → Title text** = `WBS Branch`.

Users pick a level-2 branch (for example *8 CONSTRUCTION → 8.6 TOITURE*) and see it complete. A whole level-1 phase can still be over 1,000 rows; in Beaubassin, *8 CONSTRUCTION* alone is ~1,340.

---

## WBS numbers from level 3 show leading zeros (`02.02.01`)

**Cause.** The Gantt's Activity Name is built from `WBS Display L1` … `WBS Display L6` in the model.

- **L1 and L2** are sorted by the numeric columns `WBS L1 Sort` / `WBS L2 Sort`, so they can show the WBS as it is (`2.2`).
- **L3 to L6** have **no Sort by column**. To still sort in WBS order as text, their formulas pad each part to 2 digits (`02.02.01`). Without the padding, `2.2.10` would sort before `2.2.2`.

The numeric keys `WBS L3 Sort` … `WBS L6 Sort` already exist in the model; `WBS L3`–`WBS L5` already use them. So the fix is to show the WBS as it is and sort by those keys.

### Steps (SDH Scheduling Model (4).pbix)

Do this for each of the 4 columns:

| Column (table `sdh_scheduletaskversion`) | In the formula's `RETURN`, replace | With | Then **Sort by column** |
|---|---|---|---|
| `WBS Display L3` | `SortableWBS` | `NodeWBS` | `WBS L3 Sort` |
| `WBS Display L4` | `SortableWBS` | `NodeWBS` | `WBS L4 Sort` |
| `WBS Display L5` | `SortableWBS` | `NodeWBS` | `WBS L5 Sort` |
| `WBS Display L6` | `SortableWBS` | `NodeWBS` | `WBS L6 Sort` |

1. **Data** pane → `sdh_scheduletaskversion` → click **WBS Display L3**. The formula opens in the formula bar.
2. At the end of the formula, change

   ```dax
   RETURN
   IF(
       ISBLANK(NodeWBS),
       BLANK(),
       SortableWBS
           & " "
           & COALESCE(NodeName, "")
   )
   ```

   to

   ```dax
   RETURN
   IF(
       ISBLANK(NodeWBS),
       BLANK(),
       NodeWBS
           & " "
           & COALESCE(NodeName, "")
   )
   ```

   → press **Enter**.

   The `VAR P`, `VAR L1` … and `VAR SortableWBS` lines are no longer used. You can delete them, or leave them.
3. Keep the column selected → **Column tools** ribbon → **Sort by column** → **WBS L3 Sort**.
4. Repeat steps 1–3 for `WBS Display L4`, `L5` and `L6` with the matching sort column (table above).
5. Save → **Publish** → **Replace**. The dashboard needs no change.

### Expected

- `02.02.01 OC-Coffrages et accessoires` → **`2.2.1 OC-Coffrages et accessoires`**. Level 1–2 rows are unchanged (`2.2 Octroi des contrats critiques`).
- **The order stays the same:** `2.2.9` → `2.2.10` → `2.2.11`. This was checked on the 232408 export (1,173 rows sent to the Gantt): the order is identical to MS Project's, and no WBS value maps to two sort keys. So **Sort by column** is accepted without an error.
- The Gantt remembers which WBS nodes are expanded by their label. So the expand/collapse state of level 3+ nodes resets once. Expand them as you want, then save the dashboard again.

### Optional: make `WBS L6 Sort` exact for large phase numbers

`WBS L6 Sort` multiplies the first WBS part by 10^15 using decimal numbers. From WBS `9.8` upward (and for phases 10+), the value is too large to be stored exactly. Two level-6 siblings could then get the same key and swap places.

Integer maths stays exact. Replace the `WBS L6 Sort` formula with:

```dax
WBS L6 Sort =
VAR WBS =
    'sdh_scheduletaskversion'[WBS L6]

VAR P =
    SUBSTITUTE(
        WBS,
        ".",
        "|"
    )

RETURN
IF(
    ISBLANK(WBS),
    BLANK(),
    PATHITEM(P, 1, INTEGER) * 1000000000000000 +
    PATHITEM(P, 2, INTEGER) * 1000000000000 +
    PATHITEM(P, 3, INTEGER) * 1000000000 +
    PATHITEM(P, 4, INTEGER) * 1000000 +
    PATHITEM(P, 5, INTEGER) * 1000 +
    PATHITEM(P, 6, INTEGER)
)
```
