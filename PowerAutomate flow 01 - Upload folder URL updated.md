Here’s the mapped location and how to switch the flow to it.

### New folder (decoded)

| Piece | Value |
|---|---|
| **Site** | `https://lintendant1.sharepoint.com/sites/PMO` |
| **Library** | `chanciers de projet` |
| **Upload folder (PM drop)** | `Exports hebdomadaires` |
| **Power Automate folder path** | `/chanciers de projet/Exports hebdomadaires` |

---

## Step 1 — Create Processed / Failed (siblings, not inside upload)

Keep the same pattern as before (siblings, so moves don’t re-trigger the upload folder):

Under library **`chanciers de projet`**, create:

- `Exports hebdomadaires` ← already exists (PM upload)
- `Exports hebdomadaires - Processed`
- `Exports hebdomadaires - Failed`

Paths:

- Incoming: `/chanciers de projet/Exports hebdomadaires`
- Processed: `/chanciers de projet/Exports hebdomadaires - Processed`
- Failed: `/chanciers de projet/Exports hebdomadaires - Failed`

---

## Step 2 — Dataverse environment variables

**make.powerapps.com** → your POC environment → **Solutions** → Scheduling Data Hub → **Environment variables** (or Default solution → Environment variables):

| Variable | New current value |
|---|---|
| `sdh_SDHSharePointSiteURL` | `https://lintendant1.sharepoint.com/sites/PMO` |
| `sdh_SDHScheduleLibraryName` | `chanciers de projet` |
| `sdh_SDHIncomingFolder` | `/chanciers de projet/Exports hebdomadaires` |
| `sdh_SDHProcessedFolder` | `/chanciers de projet/Exports hebdomadaires - Processed` |
| `sdh_SDHFailedFolder` | `/chanciers de projet/Exports hebdomadaires - Failed` |

Save each **Current value** (not only default).

---

## Step 3 — Update flow **SDH-01 Import Weekly Schedule** (required)

Env vars alone are not enough: the trigger and move actions are **hardcoded**.

1. Open **Power Automate** → **SDH-01 Import Weekly Schedule** → Edit.
2. **Trigger** “When a file is created”:
   - **Site Address:** `https://lintendant1.sharepoint.com/sites/PMO`
   - **Library Name:** `chanciers de projet`
   - **Folder:** `Exports hebdomadaires`  
     (path should resolve to `/chanciers de projet/Exports hebdomadaires`)
3. Find/replace every SharePoint action that still points at the old site:
   - Old site: `https://lintendant1.sharepoint.com/sites/232408-UtileArdoise2.0`
   - New site: `https://lintendant1.sharepoint.com/sites/PMO`
4. Update destinations:
   - All **Failed** moves → `/chanciers de projet/Exports hebdomadaires - Failed`
   - All **Processed** moves → `/chanciers de projet/Exports hebdomadaires - Processed`
5. If any action sets `sdh_sourcefolder`, set it to `/chanciers de projet/Exports hebdomadaires`.
6. **Save** → turn flow **Off/On** once so the trigger rebinds.

---

## Step 4 — Permissions

Give project managers **Contribute** (or Add) on:

`…/chanciers de projet/Exports hebdomadaires`

Flow connection account needs access to Incoming + Processed + Failed on the **PMO** site.

---

## Step 5 — Test

1. Drop one `.xlsx` into **Exports hebdomadaires**.
2. Confirm SDH-01 runs.
3. On success → file in **Exports hebdomadaires - Processed**.
4. On failure → file in **Exports hebdomadaires - Failed**.

---

## Leave unchanged (for now)

**SDH-05 / SDH-06** still read masters from the old site (`…/232408-UtileArdoise2.0/.../Master/`). Move those only if masters also move to PMO.

---

If you want different Processed/Failed names (e.g. `Processed` / `Failed` as plain siblings), say so and we can align the paths. I can also draft the exact find/replace list for every hardcoded path in SDH-01.














============================================================================================







Exact **SDH-01** nodes to edit (names as in the flow designer):

### Trigger
| Node | Change |
|---|---|
| **`TRG_SP_File_Created`** | Site → `https://lintendant1.sharepoint.com/sites/PMO`<br>Folder → `/chanciers de projet/Exports hebdomadaires` |

---

### Read / working copy (site + working folder)
| Node | Parent scope | Change |
|---|---|---|
| **`GET_File_Metadata`** | `S00_Initialize` | Site → PMO |
| **`GET_Working_File_Content`** | `S20_Parse_Workbook` | Site → PMO |
| **`CREATE_Working_File`** | `S20_Parse_Workbook` | Site → PMO<br>Folder → `/chanciers de projet` *(or a dedicated working folder under that library)* |

---

### Move → **Failed**
| Node | Parent scope | New destination folder |
|---|---|---|
| **`MOV_Unsupported_File_To_Failed`** | `COND_Is_Valid_XLSX` → ELSE | `/chanciers de projet/Exports hebdomadaires - Failed` |
| **`Move_Parser_Failed_File`** | `COND_Parser_Result_Valid` → ELSE | same Failed path |
| **`MOV_Project_Resolution_Failed_File`** | `COND_Project_Match_Exactly_One` → ELSE | same Failed path |
| **`MOV_Final_Parser_Failed_File`** | `COND_Final_Parser_Result_Valid` → ELSE | same Failed path |
| **`MOV_File_To_Failed`** | `COND_Archive_Only_Failed_Import` | same Failed path |

On each: **Site Address** + **Destination Site** → PMO.

---

### Move → **Processed**
| Node | Parent scope | New destination folder |
|---|---|---|
| **`MOV_Exact_Duplicate_To_Processed`** | `COND_Exact_Source_Duplicate` | `/chanciers de projet/Exports hebdomadaires - Processed` |
| **`MOV_File_To_Processed`** | `S110_Complete_Import` | same Processed path |

On each: **Site Address** + **Destination Site** → PMO.

---

### Dataverse field (not a SharePoint move)
| Node | Parent scope | Change |
|---|---|---|
| **`ADD_Import_Run`** | `S40_Create_Import_Records` | `sdh_sourcefolder` → `/chanciers de projet/Exports hebdomadaires` |

---

### Leave as-is (no hardcoded old SharePoint folder)
- **`RUN_Parse_Discovery`**
- **`RUN_Parse_Final_Revision`**  
(Excel Online / Office Script — they use the working file id from `CREATE_Working_File`)

---

### Quick search in the designer
Use Ctrl+F for: `232408-UtileArdoise2.0`, `POC-SchedulingDataHub`, `Documents partages` — each hit should be one of the nodes above.

After edits: **Save** → turn flow **Off** → **On**.