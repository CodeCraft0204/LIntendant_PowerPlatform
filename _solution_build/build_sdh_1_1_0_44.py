"""Build SchedulingDataHubPOC 1.1.0.44 (managed) from the 1.1.0.43 managed export.

SDH-03 refreshes the "SDH Scheduling Model" semantic model once its variance / PPC writes are done,
so Power BI picks up each import without waiting for the scheduled refresh.

SDH-03 is the last writer of the import chain (SDH-01 -> SDH-02 -> SDH-03) and answers SDH-01 early
(RESP_Variance_Accepted_Early), so the refresh must live at the end of SDH-03, not in SDH-01.
"""
import json
import re
import uuid
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_ZIP = ROOT / "SchedulingDataHubPOC_1_1_0_43_managed.zip"
OLD_VERSION = "1.1.0.43"
VERSION = "1.1.0.44"
OUT_ZIP = ROOT / f"SchedulingDataHubPOC_{VERSION.replace('.', '_')}_managed.zip"

PBI_WORKSPACE_ID = "878dc682-8c44-42a1-9e57-870cef47c952"
PBI_SEMANTIC_MODEL_ID = "9a88558d-627b-4892-92fc-66e9d416893d"  # SDH Scheduling Model

PBI_API = "shared_powerbi"
PBI_CONNREF = "sdh_sharedpowerbi_7a3d1"
PBI_CONNREF_XML = f"""    <connectionreference connectionreferencelogicalname="{PBI_CONNREF}">
      <connectionreferencedisplayname>Power BI SchedulingDataHubPOC-7a3d1</connectionreferencedisplayname>
      <connectorid>/providers/Microsoft.PowerApps/apis/{PBI_API}</connectorid>
      <iscustomizable>1</iscustomizable>
      <promptingbehavior>0</promptingbehavior>
      <statecode>0</statecode>
      <statuscode>1</statuscode>
    </connectionreference>
"""

# "Import data from Excel" upload logs that got pulled into the solution since 1.1.0.42. Only the
# internal Dataverse upload service may create them, so importing them fails with
# "is not a valid application to create msdyn_dmsrequest".
EXCLUDED_PREFIXES = ("msdyn_dmsrequests/", "msdyn_dmsrequeststatuses/")

REFRESH_ATTEMPTS = 6
REFRESH_RETRY_MINUTES = 5
LAST_EXISTING_ACTION = "COND_Previous_Snapshot_Found"
ANY_OUTCOME = ["Succeeded", "Failed", "Skipped", "TimedOut"]


def op_id(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"sdh/{VERSION}/SDH-03/{name}"))


def refresh_actions() -> dict:
    status = f"actions('{LAST_EXISTING_ACTION}')?['status']"
    return {
        # Runs whatever happened to variance / PPC: SDH-01 data is already in Dataverse.
        "INIT_PBI_Refresh_Accepted": {
            "runAfter": {LAST_EXISTING_ACTION: ANY_OUTCOME},
            "metadata": {"operationMetadataId": op_id("INIT_PBI_Refresh_Accepted")},
            "type": "InitializeVariable",
            "inputs": {"variables": [{"name": "VAR_PBI_Refresh_Accepted", "type": "Boolean", "value": False}]},
        },
        # Power BI rejects a refresh while another one is running (e.g. two imports in parallel);
        # that running refresh may predate this import's writes, so retry until ours is accepted.
        "UNTIL_PBI_Refresh_Accepted": {
            "runAfter": {"INIT_PBI_Refresh_Accepted": ["Succeeded"]},
            "metadata": {"operationMetadataId": op_id("UNTIL_PBI_Refresh_Accepted")},
            "type": "Until",
            "expression": "@equals(variables('VAR_PBI_Refresh_Accepted'), true)",
            "limit": {"count": REFRESH_ATTEMPTS, "timeout": "PT1H"},
            "actions": {
                "PBI_Refresh_Semantic_Model": {
                    "runAfter": {},
                    "metadata": {"operationMetadataId": op_id("PBI_Refresh_Semantic_Model")},
                    "type": "OpenApiConnection",
                    "inputs": {
                        "host": {
                            "connectionName": PBI_API,
                            "operationId": "RefreshDataset",
                            "apiId": f"/providers/Microsoft.PowerApps/apis/{PBI_API}",
                        },
                        "parameters": {"groupid": PBI_WORKSPACE_ID, "datasetid": PBI_SEMANTIC_MODEL_ID},
                        "authentication": "@parameters('$authentication')",
                        "retryPolicy": {"type": "fixed", "count": 2, "interval": "PT30S"},
                    },
                    "limit": {"timeout": "PT5M"},
                },
                "SET_PBI_Refresh_Accepted": {
                    "runAfter": {"PBI_Refresh_Semantic_Model": ["Succeeded"]},
                    "metadata": {"operationMetadataId": op_id("SET_PBI_Refresh_Accepted")},
                    "type": "SetVariable",
                    "inputs": {"name": "VAR_PBI_Refresh_Accepted", "value": True},
                },
                "Delay_Before_PBI_Refresh_Retry": {
                    "runAfter": {"PBI_Refresh_Semantic_Model": ["Failed", "TimedOut"]},
                    "metadata": {"operationMetadataId": op_id("Delay_Before_PBI_Refresh_Retry")},
                    "type": "Wait",
                    "inputs": {"interval": {"count": REFRESH_RETRY_MINUTES, "unit": "Minute"}},
                },
            },
        },
        # The refresh steps run after failures, which would otherwise mark a failed run as Succeeded.
        "COND_Variance_And_Refresh_Succeeded": {
            "runAfter": {"UNTIL_PBI_Refresh_Accepted": ANY_OUTCOME},
            "metadata": {"operationMetadataId": op_id("COND_Variance_And_Refresh_Succeeded")},
            "type": "If",
            "expression": {
                "and": [
                    {"equals": [f"@{status}", "Succeeded"]},
                    {"equals": ["@variables('VAR_PBI_Refresh_Accepted')", True]},
                ]
            },
            "actions": {},
            "else": {
                "actions": {
                    "Terminate_Variance_Or_Refresh_Failed": {
                        "runAfter": {},
                        "metadata": {"operationMetadataId": op_id("Terminate_Variance_Or_Refresh_Failed")},
                        "type": "Terminate",
                        "inputs": {
                            "runStatus": "Failed",
                            "runError": {
                                "code": "SDH03_VARIANCE_OR_PBI_REFRESH_FAILED",
                                "message": (
                                    f"@concat('Variance/PPC status: ', coalesce({status}, 'Unknown'), "
                                    "'. Power BI refresh accepted: ', "
                                    "string(variables('VAR_PBI_Refresh_Accepted')), '.')"
                                ),
                            },
                        },
                    }
                }
            },
        },
    }


def patch_sdh03(text: str) -> str:
    flow = json.loads(text)
    props = flow["properties"]
    definition = props["definition"]
    actions = definition["actions"]
    if LAST_EXISTING_ACTION not in actions:
        raise SystemExit(f"SDH-03: {LAST_EXISTING_ACTION} not found")
    tail =[n for n in actions if not any(n in (v.get("runAfter") or {}) for v in actions.values())]
    if tail != [LAST_EXISTING_ACTION]:
        raise SystemExit(f"SDH-03: expected {LAST_EXISTING_ACTION} as the only last action, found {tail}")
    new = refresh_actions()
    clash = set(new) & set(actions)
    if clash:
        raise SystemExit(f"SDH-03 already has {clash}")
    actions.update(new)

    props["connectionReferences"][PBI_API] = {
        "runtimeSource": "embedded",
        "connection": {"connectionReferenceLogicalName": PBI_CONNREF},
        "api": {"name": PBI_API},
    }
    definition["metadata"]["sdhPatchVersion"] = (
        f"{VERSION} - SDH03 refreshes the SDH Scheduling Model semantic model after variance/PPC "
        "(retries while another refresh is running)"
    )
    return json.dumps(flow, indent=2, ensure_ascii=False).replace("\n", "\r\n")


def patch_customizations(text: str) -> str:
    if PBI_CONNREF in text:
        raise SystemExit("customizations.xml already has the Power BI connection reference")
    marker = "  </connectionreferences>"
    if text.count(marker) != 1:
        raise SystemExit("customizations.xml: connectionreferences block not found exactly once")
    return text.replace(marker, PBI_CONNREF_XML.replace("\n", "\r\n") + marker)


def patch_solution(text: str) -> str:
    old = f"<Version>{OLD_VERSION}</Version>"
    if text.count(old) != 1:
        raise SystemExit(f"solution.xml: {old} not found exactly once")
    return text.replace(old, f"<Version>{VERSION}</Version>")


def decode(raw: bytes):
    return raw.decode("utf-8-sig"), raw.startswith(b"\xef\xbb\xbf")


def encode(text: str, bom: bool) -> bytes:
    return (b"\xef\xbb\xbf" if bom else b"") + text.encode("utf-8")


def build() -> Path:
    patchers = {"customizations.xml": patch_customizations, "solution.xml": patch_solution}
    with zipfile.ZipFile(SRC_ZIP) as src, zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as out:
        sdh03 = [i.filename for i in src.infolist() if re.match(r"Workflows/SDH-03.*\.json$", i.filename)]
        if len(sdh03) != 1:
            raise SystemExit(f"expected one SDH-03 workflow, found {sdh03}")
        patchers[sdh03[0]] = patch_sdh03
        for info in src.infolist():
            if info.filename.startswith(EXCLUDED_PREFIXES):
                continue
            raw = src.read(info.filename)
            patch = patchers.pop(info.filename, None)
            if patch:
                text, bom = decode(raw)
                raw = encode(patch(text), bom)
            out.writestr(info, raw, compress_type=zipfile.ZIP_DEFLATED)
        if patchers:
            raise SystemExit(f"files not found in source zip: {list(patchers)}")
    return OUT_ZIP


def verify(zip_path: Path):
    with zipfile.ZipFile(SRC_ZIP) as a, zipfile.ZipFile(zip_path) as b:
        names_a = [i.filename for i in a.infolist() if not i.filename.startswith(EXCLUDED_PREFIXES)]
        names_b = [i.filename for i in b.infolist()]
        if names_a != names_b:
            raise SystemExit("zip entry list changed")
        removed = [i.filename for i in a.infolist() if i.filename.startswith(EXCLUDED_PREFIXES)]
        changed = [n for n in names_a if a.read(n) != b.read(n)]
        sol = b.read("solution.xml").decode("utf-8-sig")
        cust = b.read("customizations.xml").decode("utf-8-sig")
        sdh03_name = next(n for n in names_b if n.startswith("Workflows/SDH-03"))
        flow = json.loads(b.read(sdh03_name).decode("utf-8-sig"))
        for n in names_b:
            if n.endswith(".json") and n.startswith("Workflows/"):
                json.loads(b.read(n).decode("utf-8-sig"))

    props = flow["properties"]
    acts = props["definition"]["actions"]
    refresh = acts["UNTIL_PBI_Refresh_Accepted"]["actions"]["PBI_Refresh_Semantic_Model"]["inputs"]
    print(f"{zip_path.name}: {re.search(r'<Version>[^<]+', sol).group()} {re.search(r'<Managed>[^<]+', sol).group()}")
    print("  changed entries:", changed)
    print("  removed entries:", removed)
    if any("dmsrequest" in n.lower() for n in names_b) or "dmsrequest" in (sol + cust).lower():
        raise SystemExit("msdyn_dmsrequest content still present")
    print("  connection refs:", {k: v["connection"]["connectionReferenceLogicalName"]
                                 for k, v in props["connectionReferences"].items()})
    print("  PBI connref in customizations.xml:", PBI_CONNREF in cust)
    print("  refresh:", refresh["host"]["operationId"], refresh["parameters"])
    print("  new tail:", [(n, list(acts[n]["runAfter"])) for n in
                          ("INIT_PBI_Refresh_Accepted", "UNTIL_PBI_Refresh_Accepted",
                           "COND_Variance_And_Refresh_Succeeded")])


if __name__ == "__main__":
    verify(build())
