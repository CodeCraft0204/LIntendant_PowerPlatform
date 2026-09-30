# SDH solution 1.1.0.14 — import guide (SDH-01 on PMO site, nested folders)

Packages (built by `_solution_build/build_sdh_1_1_0_14.py`):

- `SchedulingDataHubPOC_1_1_0_14_unmanaged.zip` — use this in the current environment (solution is unmanaged there)
- `SchedulingDataHubPOC_1_1_0_14_managed.zip` — only for an environment that has the solution as managed

## Folder structure (PMO → `chanciers de projet`)

```text
Exports hebdomadaires/                      ← project managers upload here
├── Exports hebdomadaires - Processed/
├── Exports hebdomadaires - Failed/
└── SDH-Working/                            ← temporary __SDHWORK_ copies used by the parser
```

## What changed vs 1.1.0.12

Only **SDH-01 Import Weekly Schedule** and environment variable defaults.

| Action(s) | Value |
|---|---|
| `TRG_SP_File_Created` | Site `https://lintendant1.sharepoint.com/sites/PMO`, library `chanciers de projet` (`e2436327-1c1d-48f2-a4da-ca3c773d4346`), folder `/Exports hebdomadaires` |
| `TRG_SP_File_Created` trigger condition | Runs only for files directly in `Exports hebdomadaires` (not subfolders, not folders, not `__SDHWORK_*`) |
| `GET_File_Metadata`, `GET_Working_File_Content` | Site PMO |
| `CREATE_Working_File` | `/chanciers de projet/Exports hebdomadaires/SDH-Working` |
| `SET_Working_File_ID` | `coalesce(body('CREATE_Working_File')?['Id'], body('CREATE_Working_File')?['Identifier'])` |
| `RUN_Parse_Discovery`, `RUN_Parse_Final_Revision` | Location `sites/lintendant1.sharepoint.com,b7f56104-82e8-4905-89ac-717956035dc6,34c32c09-c21f-4358-a73e-999859853644`, Library `b!BGH1t-iCBUmJrHF5VgNdxgkswzQfwlhDpz6ZmFmFNkQnY0PiHRzySKTayjx3PUNG`, File `variables('VAR_Working_File_ID')` |
| All Failed copies (5) | `/chanciers de projet/Exports hebdomadaires/Exports hebdomadaires - Failed` |
| All Processed copies (2) | `/chanciers de projet/Exports hebdomadaires/Exports hebdomadaires - Processed` |
| `ADD_Import_Run.sdh_sourcefolder` | `/chanciers de projet/Exports hebdomadaires` |

The Processed / Failed steps copy the file (`CopyFileAsync`); the original upload stays in `Exports hebdomadaires`. The trigger condition keeps these copies from starting new runs.

Trigger concurrency stays at 1 run so parallel imports don't race on the latest-snapshot / latest-revision flags.

SDH-02 … SDH-06 are unchanged. SDH-05 / SDH-06 still read the master workbooks from the old site.

## Import

1. Power Apps → **Solutions** → **Import solution** → `SchedulingDataHubPOC_1_1_0_14_unmanaged.zip`.
2. Map each connection reference → **Import**.
3. Open SDH-01 → turn **Off → On**.

## Verify

1. Upload a new `.xlsx` to `Exports hebdomadaires` (top level).
2. Exactly **one** SDH-01 run starts (no extra runs for the `__SDHWORK_` or Processed/Failed copies).
3. In the run: `SET_Working_File_ID` ≈ `%252fchanciers%2bde%2bprojet%252fExports%2bhebdomadaires%252fSDH-Working%252f__SDHWORK_….xlsx`; `RUN_Parse_Discovery` has `source`, `drive`, `file` filled.
4. A copy lands in `Exports hebdomadaires - Processed` (or `- Failed`).
