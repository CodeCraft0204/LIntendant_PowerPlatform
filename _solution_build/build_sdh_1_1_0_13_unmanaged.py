"""Flip 1.1.0.13 managed package to unmanaged for environments that already have unmanaged."""
import json
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "SchedulingDataHubPOC_1_1_0_13_managed"
OUT_DIR = ROOT / "SchedulingDataHubPOC_1_1_0_13_unmanaged"
OUT_ZIP = ROOT / "SchedulingDataHubPOC_1_1_0_13_unmanaged.zip"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source folder: {SRC}")

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    shutil.copytree(SRC, OUT_DIR)

    sol = OUT_DIR / "solution.xml"
    text = sol.read_text(encoding="utf-8-sig")
    if "<Managed>1</Managed>" not in text:
        raise SystemExit("Expected <Managed>1</Managed> in solution.xml")
    text = text.replace("<Managed>1</Managed>", "<Managed>0</Managed>", 1)
    if "<Version>1.1.0.13</Version>" not in text:
        raise SystemExit(f"Unexpected version in solution.xml: {re.search(r'<Version>[^<]+', text)}")
    sol.write_text(text, encoding="utf-8")

    wf = next((OUT_DIR / "Workflows").glob("SDH-01*.json"))
    flow_text = wf.read_text(encoding="utf-8-sig")
    for needle in (
        "sites/PMO",
        "b!BGH1t-iCBUmJrHF5VgNdxgkswzQfwlhDpz6ZmFmFNkQnY0PiHRzySKTayjx3PUNG",
        "@variables('VAR_Working_File_ID')",
        "coalesce(body('CREATE_Working_File')?['Id']",
    ):
        if needle not in flow_text:
            raise SystemExit(f"SDH-01 missing expected value: {needle}")
    json.loads(flow_text)

    if OUT_ZIP.exists():
        OUT_ZIP.unlink()
    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(OUT_DIR.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(OUT_DIR).as_posix())

    with zipfile.ZipFile(OUT_ZIP) as zf:
        sol_txt = zf.read("solution.xml").decode("utf-8-sig")
    print(re.search(r"<Managed>[^<]+", sol_txt).group())
    print(re.search(r"<Version>[^<]+", sol_txt).group())
    print(f"Built {OUT_ZIP} ({OUT_ZIP.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
