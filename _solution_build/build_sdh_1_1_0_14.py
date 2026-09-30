"""Build SchedulingDataHubPOC 1.1.0.14 (managed + unmanaged).

SDH-01 on the PMO site with Processed / Failed / SDH-Working nested inside the upload folder,
and a trigger condition so only files uploaded directly into the upload folder start a run.
"""
import json
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "SchedulingDataHubPOC_1_1_0_12_managed"
VERSION = "1.1.0.14"
TAG = VERSION.replace(".", "_")

OLD_SITE = "https://lintendant1.sharepoint.com/sites/232408-UtileArdoise2.0"
NEW_SITE = "https://lintendant1.sharepoint.com/sites/PMO"
OLD_SOURCE = "sites/lintendant1.sharepoint.com,d4f00261-5435-4f71-99f1-61d3682baad7,73c560e0-8f87-45c6-a50d-7eb488589c9c"
NEW_SOURCE = "sites/lintendant1.sharepoint.com,b7f56104-82e8-4905-89ac-717956035dc6,34c32c09-c21f-4358-a73e-999859853644"
OLD_DRIVE = "b!YQLw1DVUcU-Z8WHTaCuq1-BgxXOHj8ZFpQ1-tIhYnJyaBeWsgRVSSZehKsIuQHzw"
NEW_DRIVE = "b!BGH1t-iCBUmJrHF5VgNdxgkswzQfwlhDpz6ZmFmFNkQnY0PiHRzySKTayjx3PUNG"
OLD_LIST = "ace5059a-1581-4952-97a1-2ac22e407cf0"
NEW_LIST = "e2436327-1c1d-48f2-a4da-ca3c773d4346"  # decoded from NEW_DRIVE

LIB = "/chanciers de projet"
INCOMING_IN_LIB = "/Exports hebdomadaires"
INCOMING = f"{LIB}{INCOMING_IN_LIB}"
PROCESSED = f"{INCOMING}/Exports hebdomadaires - Processed"
FAILED = f"{INCOMING}/Exports hebdomadaires - Failed"
WORKING = f"{INCOMING}/SDH-Working"

# Subfolders of the upload folder must not start runs (the flow writes its own copies there).
TRIGGER_CONDITION = (
    "@and("
    "equals(toLower(replace(concat('/', triggerOutputs()?['body/{Path}'], '/'), '//', '/')), "
    f"'{INCOMING.lower()}/'), "
    "not(equals(triggerOutputs()?['body/{IsFolder}'], true)), "
    "not(startsWith(triggerOutputs()?['body/{FilenameWithExtension}'], '__SDHWORK_')))"
)

# (old, new, expected occurrence count)
SDH01_REPLACEMENTS = [
    (OLD_SITE, NEW_SITE, 18),
    (f'"table": "{OLD_LIST}"', f'"table": "{NEW_LIST}"', 1),
    ('"folderPath": "/POC-SchedulingDataHub/Incoming"', f'"folderPath": "{INCOMING_IN_LIB}"', 1),
    ('"item/sdh_sourcefolder": "/POC-SchedulingDataHub/Incoming"', f'"item/sdh_sourcefolder": "{INCOMING}"', 1),
    ('"/Documents partages/POC-SchedulingDataHub/Failed"', f'"{FAILED}"', 5),
    ('"/Documents partages/POC-SchedulingDataHub/Processed"', f'"{PROCESSED}"', 2),
    ('"folderPath": "/Documents partages/POC-SchedulingDataHub"', f'"folderPath": "{WORKING}"', 1),
    (OLD_SOURCE, NEW_SOURCE, 2),
    (OLD_DRIVE, NEW_DRIVE, 2),
]

ENV_DEFAULTS = {
    "sdh_SDHSharePointSiteURL": NEW_SITE,
    "sdh_SDHScheduleLibraryName": "chanciers de projet",
    "sdh_SDHIncomingFolder": INCOMING,
    "sdh_SDHProcessedFolder": PROCESSED,
    "sdh_SDHFailedFolder": FAILED,
}


def read_text(path: Path):
    raw = path.read_bytes()
    return raw.decode("utf-8-sig"), raw.startswith(b"\xef\xbb\xbf")


def write_text(path: Path, text: str, bom: bool):
    path.write_bytes((b"\xef\xbb\xbf" if bom else b"") + text.encode("utf-8"))


def replace_counted(text: str, old: str, new: str, expected: int, label: str) -> str:
    found = text.count(old)
    if found != expected:
        raise SystemExit(f"{label}: expected {expected} x {old!r}, found {found}")
    return text.replace(old, new)


def patch_sdh01(out_dir: Path):
    path = next((out_dir / "Workflows").glob("SDH-01ImportWeeklySchedule-*.json"))
    text, bom = read_text(path)
    for old, new, n in SDH01_REPLACEMENTS:
        text = replace_counted(text, old, new, n, path.name)

    flow = json.loads(text)
    trigger = flow["properties"]["definition"]["triggers"]["TRG_SP_File_Created"]
    trigger["conditions"] = [{"expression": TRIGGER_CONDITION}]
    text = json.dumps(flow, indent=2, ensure_ascii=False)

    leftovers = [s for s in ("232408-UtileArdoise2.0", "POC-SchedulingDataHub", "Documents partages",
                             "d4f00261-5435") if s in text]
    if leftovers:
        raise SystemExit(f"SDH-01 still references old location: {leftovers}")
    for needle in ("@coalesce(body('CREATE_Working_File')?['Id'], body('CREATE_Working_File')?['Identifier'])",
                   "@variables('VAR_Working_File_ID')"):
        if needle not in text:
            raise SystemExit(f"SDH-01 missing expected expression: {needle}")
    write_text(path, text, bom)


def patch_env_defaults(out_dir: Path):
    for name, value in ENV_DEFAULTS.items():
        path = out_dir / "environmentvariabledefinitions" / name / "environmentvariabledefinition.xml"
        text, bom = read_text(path)
        start = text.index("<defaultvalue>") + len("<defaultvalue>")
        end = text.index("</defaultvalue>")
        write_text(path, text[:start] + value + text[end:], bom)


def patch_solution_xml(out_dir: Path, managed: bool):
    path = out_dir / "solution.xml"
    text, bom = read_text(path)
    text = replace_counted(text, "<Version>1.1.0.12</Version>", f"<Version>{VERSION}</Version>", 1, "solution.xml")
    if not managed:
        text = replace_counted(text, "<Managed>1</Managed>", "<Managed>0</Managed>", 1, "solution.xml")
    write_text(path, text, bom)


def build(managed: bool) -> Path:
    mode = "managed" if managed else "unmanaged"
    out_dir = ROOT / f"SchedulingDataHubPOC_{TAG}_{mode}"
    out_zip = ROOT / f"SchedulingDataHubPOC_{TAG}_{mode}.zip"
    if out_dir.exists():
        shutil.rmtree(out_dir)
    shutil.copytree(SRC, out_dir)
    patch_sdh01(out_dir)
    patch_env_defaults(out_dir)
    patch_solution_xml(out_dir, managed)
    for p in (out_dir / "Workflows").glob("*.json"):
        json.loads(read_text(p)[0])

    if out_zip.exists():
        out_zip.unlink()
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(out_dir.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(out_dir).as_posix())
    return out_zip


def verify(zip_path: Path):
    with zipfile.ZipFile(zip_path) as z:
        sol = z.read("solution.xml").decode("utf-8-sig")
        text = z.read(next(n for n in z.namelist() if "SDH-01" in n)).decode("utf-8-sig")
    trigger = json.loads(text)["properties"]["definition"]["triggers"]["TRG_SP_File_Created"]
    print(f"\n{zip_path.name}: {re.search(r'<Managed>[^<]+', sol).group()} {re.search(r'<Version>[^<]+', sol).group()}")
    print("  trigger params:", json.dumps(trigger["inputs"]["parameters"], ensure_ascii=False))
    print("  trigger condition:", trigger["conditions"][0]["expression"])
    for key in ["dataset", "folderPath", "parameters/destinationFolderPath", "source", "drive", "file",
                "item/sdh_sourcefolder"]:
        print(f"  {key}:", sorted(set(re.findall(r'"' + re.escape(key) + r'": "([^"]*)"', text))))


def main():
    for managed in (False, True):
        verify(build(managed))


if __name__ == "__main__":
    main()
