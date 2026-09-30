"""Build SchedulingDataHubPOC 1.1.0.13 (managed) with SDH-01 pointed at the PMO site."""
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "SchedulingDataHubPOC_1_1_0_12_managed"
OUT_DIR = ROOT / "SchedulingDataHubPOC_1_1_0_13_managed"
OUT_ZIP = ROOT / "SchedulingDataHubPOC_1_1_0_13_managed.zip"

OLD_SITE = "https://lintendant1.sharepoint.com/sites/232408-UtileArdoise2.0"
NEW_SITE = "https://lintendant1.sharepoint.com/sites/PMO"
OLD_SOURCE = "sites/lintendant1.sharepoint.com,d4f00261-5435-4f71-99f1-61d3682baad7,73c560e0-8f87-45c6-a50d-7eb488589c9c"
NEW_SOURCE = "sites/lintendant1.sharepoint.com,b7f56104-82e8-4905-89ac-717956035dc6,34c32c09-c21f-4358-a73e-999859853644"
OLD_DRIVE = "b!YQLw1DVUcU-Z8WHTaCuq1-BgxXOHj8ZFpQ1-tIhYnJyaBeWsgRVSSZehKsIuQHzw"
NEW_DRIVE = "b!BGH1t-iCBUmJrHF5VgNdxgkswzQfwlhDpz6ZmFmFNkQnY0PiHRzySKTayjx3PUNG"
OLD_LIST = "ace5059a-1581-4952-97a1-2ac22e407cf0"
NEW_LIST = "e2436327-1c1d-48f2-a4da-ca3c773d4346"  # decoded from NEW_DRIVE

LIB = "/chanciers de projet"
INCOMING = "/Exports hebdomadaires"
PROCESSED = f"{LIB}/Exports hebdomadaires - Processed"
FAILED = f"{LIB}/Exports hebdomadaires - Failed"
WORKING = f"{LIB}/SDH-Working"

# (old, new, expected occurrence count)
SDH01_REPLACEMENTS = [
    (OLD_SITE, NEW_SITE, 18),
    (f'"table": "{OLD_LIST}"', f'"table": "{NEW_LIST}"', 1),
    ('"folderPath": "/POC-SchedulingDataHub/Incoming"', f'"folderPath": "{INCOMING}"', 1),
    ('"item/sdh_sourcefolder": "/POC-SchedulingDataHub/Incoming"',
     f'"item/sdh_sourcefolder": "{LIB}{INCOMING}"', 1),
    ('"/Documents partages/POC-SchedulingDataHub/Failed"', f'"{FAILED}"', 5),
    ('"/Documents partages/POC-SchedulingDataHub/Processed"', f'"{PROCESSED}"', 2),
    ('"folderPath": "/Documents partages/POC-SchedulingDataHub"', f'"folderPath": "{WORKING}"', 1),
    (OLD_SOURCE, NEW_SOURCE, 2),
    (OLD_DRIVE, NEW_DRIVE, 2),
]

ENV_DEFAULTS = {
    "sdh_SDHSharePointSiteURL": NEW_SITE,
    "sdh_SDHScheduleLibraryName": "chanciers de projet",
    "sdh_SDHIncomingFolder": f"{LIB}{INCOMING}",
    "sdh_SDHProcessedFolder": PROCESSED,
    "sdh_SDHFailedFolder": FAILED,
}


def read_text(path: Path):
    raw = path.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    return raw.decode("utf-8-sig"), bom


def write_text(path: Path, text: str, bom: bool):
    data = text.encode("utf-8")
    path.write_bytes((b"\xef\xbb\xbf" if bom else b"") + data)


def replace_counted(text: str, old: str, new: str, expected: int, label: str) -> str:
    found = text.count(old)
    if found != expected:
        raise SystemExit(f"{label}: expected {expected} x {old!r}, found {found}")
    return text.replace(old, new)


def patch_sdh01():
    path = next((OUT_DIR / "Workflows").glob("SDH-01ImportWeeklySchedule-*.json"))
    text, bom = read_text(path)
    for old, new, n in SDH01_REPLACEMENTS:
        text = replace_counted(text, old, new, n, path.name)

    flow = json.loads(text)
    actions = flow["properties"]["definition"]
    leftovers = [s for s in ("232408-UtileArdoise2.0", "POC-SchedulingDataHub", "Documents partages",
                             "d4f00261-5435") if s in text]
    if leftovers:
        raise SystemExit(f"SDH-01 still references old location: {leftovers}")

    s = json.dumps(actions)
    required = [
        "@coalesce(body('CREATE_Working_File')?['Id'], body('CREATE_Working_File')?['Identifier'])",
        "\"file\": \"@variables('VAR_Working_File_ID')\"",
    ]
    for r in required:
        if r.replace('"', '\\"') not in s and r not in s:
            raise SystemExit(f"SDH-01 missing expected expression: {r}")
    write_text(path, text, bom)


def patch_env_defaults():
    for name, value in ENV_DEFAULTS.items():
        path = OUT_DIR / "environmentvariabledefinitions" / name / "environmentvariabledefinition.xml"
        text, bom = read_text(path)
        start = text.index("<defaultvalue>") + len("<defaultvalue>")
        end = text.index("</defaultvalue>")
        write_text(path, text[:start] + value + text[end:], bom)


def bump_version():
    path = OUT_DIR / "solution.xml"
    text, bom = read_text(path)
    text = replace_counted(text, "<Version>1.1.0.12</Version>", "<Version>1.1.0.13</Version>", 1, "solution.xml")
    write_text(path, text, bom)


def validate_all_json():
    for p in (OUT_DIR / "Workflows").glob("*.json"):
        json.loads(read_text(p)[0])


def build_zip():
    if OUT_ZIP.exists():
        OUT_ZIP.unlink()
    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(OUT_DIR.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(OUT_DIR).as_posix())


def main():
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    shutil.copytree(SRC, OUT_DIR)
    patch_sdh01()
    patch_env_defaults()
    bump_version()
    validate_all_json()
    build_zip()
    print(f"Built {OUT_ZIP} ({OUT_ZIP.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
