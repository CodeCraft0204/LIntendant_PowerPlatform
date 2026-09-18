# Scheduling Data Hub — Solution Roadmap

Guide for updating the **Power BI semantic model**, **report pages**, and **Dataverse** directly in the Microsoft platform (Power BI Desktop / Service + Power Apps / make.powerapps.com).

Use this after opening the latest local files (or the published workspace copies):

| Artifact | File / solution |
|---|---|
| Semantic model | `SDH Scheduling Model.pbix` (source of truth for DAX) |
| Report | `SDH Project Scheduling Dashboard.pbix` |
| Dataverse | Managed solution `SchedulingDataHubPOC` v1.1.0.12 (`sdh_*`) |
| SharePoint drop zone | Site `232408-UtileArdoise2.0` → `POC-SchedulingDataHub` folders |

---

## 0. Before you change anything

1. Publish / save a backup of the current dataset + report in the Power BI workspace.
2. Confirm environment variables in Dataverse (make.powerapps.com → Solutions → Scheduling Data Hub POC → Environment variables):
   - `sdh_SDHEnableDataverseWrites` — set to **yes** only when you intend live writes
   - SharePoint URL, Incoming / Processed / Failed folders, notification email
3. Refresh the semantic model against Dataverse so latest snapshots are in the model.
4. Pick a validation project (e.g. **232408**) and note current PPC page values before edits.

---

## Phase 1 — Immediate fix: Construction 4W PPC on Project Portfolio

**Goal:** Each row in **Active Project Information** shows the same Construction 4-Week PPC as the PPC page for that project’s **latest snapshot date + latest revision**.

### 1.1 Semantic model (`SDH Scheduling Model.pbix`)

Open **Model view** → table `_Measures`.

| # | Action | Where |
|---|---|---|
| 1 | Confirm measure **`Portfolio Construction 4W PPC %`** exists and forces per-project `MAX(sdh_snapshotdate)` then `MAX(sdh_snapshotrevision)`, then calls Construction 4W Planned/Completed | `_Measures` |
| 2 | Confirm measure **`Portfolio Construction 4W Commitments Summary`** uses the same latest date/revision pattern | `_Measures` |
| 3 | Edit **`PPC 4W Planned Derived`**: set `CurrentDate` to the same pattern as **`PPC 4W Completed Derived`**: `COALESCE(SELECTEDVALUE(sdh_snapshotdate), MAX date for project)` | `_Measures` |
| 4 | Do **not** put slicer-dependent measures (`Construction PPC 4W %`) in multi-project tables without a Portfolio wrapper | Rule of thumb |
| 5 | Save + **Publish** the dataset (or replace the published dataset) | Power BI Service |

**Reference DAX pattern (Portfolio wrapper):**

```dax
Portfolio Construction 4W PPC % =
VAR CurrentProject = SELECTEDVALUE('sdh_schedulesnapshot'[sdh_projectnumber])
VAR LatestDate =
    CALCULATE(
        MAX('sdh_schedulesnapshot'[sdh_snapshotdate]),
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
        )
    )
VAR LatestRevision =
    CALCULATE(
        MAX('sdh_schedulesnapshot'[sdh_snapshotrevision]),
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                && 'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate
        )
    )
VAR Planned =
    CALCULATE(
        [Construction PPC 4W Planned],
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                && 'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate
                && 'sdh_schedulesnapshot'[sdh_snapshotrevision] = LatestRevision
        )
    )
VAR Completed =
    CALCULATE(
        [Construction PPC 4W Completed],
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                && 'sdh_schedulesnapshot'[sdh_snapshotdate] = LatestDate
                && 'sdh_schedulesnapshot'[sdh_snapshotrevision] = LatestRevision
        )
    )
RETURN
IF(Planned = 0, BLANK(), DIVIDE(Completed, Planned))
```

**Optional cleanup (later, not blocking):**

- Prefer **`Portfolio Latest Snapshot Revision`** (reads `sdh_schedulesnapshot`) over **`Portfolio Latest Revision`** (reads `sdh_project` — fragile).
- Ignore unused experiments: `Portfolio Construction PPC 4W %` (TREATAS variant), empty `Construction PPC 4W Commitments Summary Column`.

### 1.2 Report page — Project Portfolio

Open **SDH Project Scheduling Dashboard** → page **Project Portfolio** → visual **Active Project Information**.

| # | Action |
|---|---|
| 1 | Replace field **`Construction PPC 4W %`** with **`Portfolio Construction 4W PPC %`** (keep display name if you want: “Construction PPC 4W %”) |
| 2 | Replace field **`Construction PPC 4W Commitments Summary`** with **`Portfolio Construction 4W Commitments Summary`** |
| 3 | Keep visual filter **`Is Latest Snapshot` = 1** (this calculated column already means latest date **and** latest revision) |
| 4 | Add visual filter **`sdh_islatestrevision` = true** (Dataverse “Is Latest Revision”) — optional belt-and-suspenders; remove if the table goes empty due to flag gaps |
| 5 | Keep filter **project progress ≠ 100** for “active” projects |
| 6 | Point the report at the **updated dataset**, save, publish |

### 1.3 Report page — PPC / Reliability (no field swap required)

Leave cards on **`Construction PPC 4W %`** / **`Construction PPC 4W Commitments Summary`**.

Verify slicers are set to:

1. Project  
2. Latest **Snapshot Date**  
3. Latest **Snapshot Revision**

### 1.4 Validate (must do in Desktop or Service)

| Step | Expected |
|---|---|
| PPC page → project 232408 → latest date + revision → note Construction 4-Week PPC % and “X / Y met” | Baseline |
| Portfolio → same project row | **Same** % and commitments summary |
| Other active projects with ≥2 prior snapshots | Non-blank 4W PPC |
| Projects with insufficient history | Blank or `0 / 0 met` only when Planned = 0 |

---

## Phase 2 — Semantic model hygiene (Power BI)

Do these in **Model view** after Phase 1 is confirmed.

### 2.1 Measure organization

| Folder / area | Keep / use for |
|---|---|
| PPC page KPIs | `Construction Current PPC`, `Construction PPC 4W %`, Procurement equivalents |
| Portfolio / multi-project visuals | Only `Portfolio *` wrappers that pin latest snapshot+revision |
| Quality | `Quality Global Score` and DCMA-style KPI measures |
| Data Health | Health Check Value / Color |

### 2.2 Calculated columns on `sdh_schedulesnapshot` (already present — verify)

| Column | Meaning | Use on |
|---|---|---|
| **Is Latest Snapshot** | 1 = max date **and** max revision for the project | Portfolio filters, “current schedule” visuals |
| **Is Latest Chronological Snapshot** | Same idea (alternate formula) | Prefer one; don’t mix both in filters |

If you need an explicit **Is Latest Revision** (revision only, any date):

```dax
Is Latest Revision =
VAR CurrentProject = 'sdh_schedulesnapshot'[sdh_projectnumber]
VAR CurrentDate = 'sdh_schedulesnapshot'[sdh_snapshotdate]
VAR CurrentRevision = 'sdh_schedulesnapshot'[sdh_snapshotrevision]
VAR LatestRevision =
    CALCULATE(
        MAX('sdh_schedulesnapshot'[sdh_snapshotrevision]),
        FILTER(
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
                && 'sdh_schedulesnapshot'[sdh_snapshotdate] = CurrentDate
        )
    )
RETURN IF(CurrentRevision = LatestRevision, 1, 0)
```

### 2.3 Relationships to double-check

Ensure filters flow correctly for PPC:

- `sdh_project` → `sdh_schedulesnapshot` → `sdh_scheduletaskversion`
- Task versions carry `sdh_projectnumber`, `sdh_snapshotdate`, `sdh_snapshotrevision`
- Activity / dependency bridges used by quality & missed-commitment visuals

### 2.4 Refresh & gateway

1. Dataset credentials → Dataverse (and SharePoint if used).  
2. Scheduled refresh after weekly import flows finish (SDH-01 → 02 → 03 → 04).  
3. Optional: refresh trigger after SDH-04 notify.

---

## Phase 3 — Report pages checklist (what to update where)

Update pages in this order so UX stays consistent.

| Order | Page | What to update | Notes |
|---|---|---|---|
| 1 | **Project Portfolio** | Active Project Information PPC columns (Phase 1) | Multi-project → Portfolio measures only |
| 2 | **PPC / Reliability** | Keep Construction/Procurement 4W cards; verify slicers | Single-project context |
| 3 | **Overview** | Any portfolio-style KPI cards | Same rule: Portfolio wrappers for multi-project |
| 4 | **Weekly Variance** | Ensure visuals filter to latest (or selected) snapshot | Variance is snapshot-to-snapshot |
| 5 | **Schedule Quality** | KPI results tied to latest snapshot | Use `Is Latest Snapshot` or selected snapshot |
| 6 | **Lookahead / Schedule Explorer** | Task version grain; Gantt custom visuals | Filter summary tasks if needed |
| 7 | **Data Health** | Import run / validation issue measures | Driven by `sdh_importrun`, `sdh_validationissue` |

**Rule:**  

- **One project + snapshot slicers** → page measures like `Construction PPC 4W %`.  
- **Many projects in one visual** → `Portfolio …` measures that pin latest snapshot/revision inside DAX.

---

## Phase 4 — Dataverse updates (make.powerapps.com)

Only change Dataverse when the model/report need new fields or when import flags are wrong.

### 4.1 Tables you usually touch

| Table | When to update |
|---|---|
| `sdh_project` | New projects; sync via **SDH-05** or SharePoint Project List |
| `sdh_activitycodes` | Trade/NMS master; sync via **SDH-06** |
| `sdh_schedulesnapshot` | Flags `sdh_islatestsnapshot`, `sdh_islatestrevision`, dates, progress % |
| `sdh_scheduletask` / `sdh_scheduletaskversion` | Rarely manual — produced by **SDH-01** |
| `sdh_ppcresult` / `sdh_weeklyvariance` / `sdh_schedulekpiresult` | Produced by **SDH-02 / SDH-03** — prefer fixing flows, not hand edits |
| `sdh_importrun` / `sdh_validationissue` | Ops / Data Health |
| `sdh_sdhchangeevent` / `sdh_sdhtaskdelay` | **Stubs today** — extend when change/delay tracking is in scope |

### 4.2 Step-by-step: keep “latest” flags trustworthy

Bad Portfolio rows often mean flags or progress fields are wrong—not only DAX.

| # | Check | Where |
|---|---|---|
| 1 | After each successful import, exactly **one** snapshot per project has `sdh_islatestsnapshot` = Yes | Snapshot list / Advanced Find |
| 2 | On that snapshot date, exactly **one** revision has `sdh_islatestrevision` = Yes | Same |
| 3 | Confirm flow **SDH-01** step “finalize snapshot” still clears previous latest flags | Power Automate |
| 4 | Confirm **SDH-03** wrote PPC/variance for the new snapshot before refreshing Power BI | Flow run history |
| 5 | If flags are wrong: fix in flow, re-import, or carefully correct rows then refresh dataset | Prefer flow fix |

### 4.3 Step-by-step: add a new attribute for reporting

Example: expose a new schedule field on Portfolio.

1. **Dataverse** → table `sdh_scheduletaskversion` (or snapshot) → add column.  
2. Update **Office Script / parser** + **SDH-01** mapping to populate it.  
3. Export/import solution version bump.  
4. **Power BI** → Transform data / refresh schema → add column to model.  
5. Add to report visual.  
6. Publish dataset + report.

### 4.4 Step-by-step: multi-project beyond 232408

1. Load projects into `sdh_project` (**SDH-05** / Project List).  
2. Drop weekly Excel exports into SharePoint **Incoming** with resolvable project number/name.  
3. Ensure **SDH-01** project resolution finds exactly one project.  
4. Refresh Power BI → Portfolio should list each active project with its own latest-snapshot PPC.

### 4.5 Environment & safety

| Variable | Guidance |
|---|---|
| `sdh_SDHEnableDataverseWrites` | `no` for dry runs; `yes` in the POC env when ingesting |
| `sdh_SDHImportSchemaVersion` | Keep aligned with parser (`SDH_v1.1`) |
| `sdh_SDHParserVersion` | Keep aligned with Office Script (`OfficeScript_v1`) |

---

## Phase 5 — Power Automate (only if numbers still disagree)

If Desktop DAX is correct but values still don’t match PPC:

| Flow | Check |
|---|---|
| **SDH-01** | Tasks, versions, dependencies, activity maps loaded; latest flags set; file moved to Processed |
| **SDH-02** | Snapshot KPIs written |
| **SDH-03** | Weekly variance + PPC result rows for current vs previous snapshot |
| **SDH-04** | Notify after success |
| **SDH-05 / 06** | Masters not blank / stale |

Do not hand-calculate PPC in Dataverse if Power BI already derives it from task versions — keep one source of truth (currently **DAX on task versions**).

---

## Phase 6 — Publish & operate

1. Publish **semantic model** first.  
2. Publish **report** bound to that dataset.  
3. Re-bind if Desktop used a local model copy (Dataset settings → take over / remap).  
4. Set refresh schedule after weekly schedule drop.  
5. Smoke-test: Overview → Portfolio → PPC page for one project.  
6. Archive old PBIX backups (`.pbix.bak`) once Service copy is confirmed good.

---

## Quick decision tree

```text
Wrong Construction 4W PPC on Portfolio?
├─ Visual still using Construction PPC 4W % ?
│  └─ YES → Swap to Portfolio Construction 4W PPC % (+ Commitments Summary)
├─ Planned vs Completed use different CurrentDate logic?
│  └─ YES → Align PPC 4W Planned Derived with Completed Derived
├─ Is Latest Snapshot flag wrong in Dataverse?
│  └─ YES → Fix SDH-01 finalize / correct flags → refresh dataset
└─ PPC page with latest slicers also wrong?
   └─ YES → Debug PPC 4W Planned/Completed Derived + task version data (not Portfolio)
```

---

## Suggested work sequence (summary)

| Step | Platform | Task | Done when |
|---|---|---|---|
| 1 | Power BI model | Align Planned Derived + confirm Portfolio 4W measures | Measures saved |
| 2 | Power BI report | Portfolio table uses Portfolio 4W measures + filters | Visual fields updated |
| 3 | Power BI Service | Publish dataset, then report | Workspace updated |
| 4 | Power BI UI | Compare 232408 Portfolio vs PPC | Values match |
| 5 | Dataverse / flows | Only if mismatch remains — verify latest flags & SDH-03 | Flags + PPC rows OK |
| 6 | Later | Multi-project masters, stub tables (Change Event / Task Delay), measure folder cleanup | Backlog |

---

## Out of scope for this roadmap (track separately)

- Filling stub tables `sdh_sdhchangeevent`, `sdh_sdhtaskdelay`
- Replacing Office Script parser with a new engine
- Moving from embedded PBIX model to a pure Service/Fabric semantic model workspace layout
- Unmanaged solution source control (e.g. pac CLI) for Dataverse

---

*Aligned with Scheduling Data Hub POC vision: weekly MS Project exports → Dataverse snapshots → PPC / variance / quality in Power BI, without Project Online reporting.*
