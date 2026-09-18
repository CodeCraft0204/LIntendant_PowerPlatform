"""
Patch PPC 4W Planned Derived CurrentDate logic and rebuild PBIX DataModel
as uncompressed ABF (valid for Power BI).
"""
from __future__ import annotations

import io
import shutil
import zipfile
from pathlib import Path

from pbixray.pbix_unpacker import PbixUnpacker
from pbixray.utils import get_data_slice

# Include the preceding comment so the COALESCE form fits in the same byte length.
OLD_BLOCK = """    
    -- Dynamically grab the latest snapshot date for the current project context
    VAR CurrentDate = 
        CALCULATE(
            MAX('sdh_schedulesnapshot'[sdh_snapshotdate]),
            ALL('sdh_schedulesnapshot'),
            'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject
        )"""

NEW_BLOCK = """    
    VAR CurrentDate = COALESCE(SELECTEDVALUE('sdh_schedulesnapshot'[sdh_snapshotdate]), CALCULATE(MAX('sdh_schedulesnapshot'[sdh_snapshotdate]), ALL('sdh_schedulesnapshot'), 'sdh_schedulesnapshot'[sdh_projectnumber] = CurrentProject))"""


def pad_to_len(text: str, target: int) -> str:
    if len(text) > target:
        raise ValueError(f"new block longer than old: {len(text)} > {target}")
    # Pad with spaces before the closing of the block; DAX ignores whitespace
    return text + (" " * (target - len(text)))


def patch_decompressed_datamodel(pbix_path: Path) -> bytes:
    u = PbixUnpacker(str(pbix_path))
    dm = u.data_model
    data = bytearray(dm.decompressed_data)

    sqlite_ref = next(x for x in dm.file_log if x["FileName"] == "metadata.sqlitedb")
    start = sqlite_ref["m_cbOffsetHeader"]
    size = sqlite_ref["Size"]
    sqlite_blob = bytearray(data[start : start + size])

    old_b = OLD_BLOCK.encode("utf-8")
    new_b = pad_to_len(NEW_BLOCK, len(OLD_BLOCK)).encode("utf-8")
    assert len(old_b) == len(new_b)

    count = sqlite_blob.count(old_b)
    if count == 0:
        # Already patched?
        if NEW_BLOCK.encode("utf-8")[:40] in sqlite_blob:
            print(f"{pbix_path.name}: already patched")
            return bytes(data)
        raise RuntimeError(f"{pbix_path.name}: old CurrentDate block not found in sqlite")
    if count != 1:
        raise RuntimeError(f"{pbix_path.name}: expected 1 match, found {count}")

    idx = sqlite_blob.find(old_b)
    sqlite_blob[idx : idx + len(old_b)] = new_b
    data[start : start + size] = sqlite_blob
    print(f"{pbix_path.name}: patched Planned Derived at sqlite offset {idx}")
    return bytes(data)


def rebuild_pbix(src: Path, dest: Path, new_datamodel: bytes, extra_replacements: dict[str, bytes] | None = None):
    """Copy PBIX zip, replacing DataModel with uncompressed ABF bytes."""
    extra_replacements = extra_replacements or {}
    tmp = dest.with_suffix(".tmp.zip")
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            payload = zin.read(item.filename)
            if item.filename == "DataModel":
                payload = new_datamodel
            elif item.filename in extra_replacements:
                payload = extra_replacements[item.filename]
            # Preserve zip entry metadata where possible
            info = zipfile.ZipInfo(filename=item.filename, date_time=item.date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = item.external_attr
            zout.writestr(info, payload)
    shutil.move(tmp, dest)
    print(f"wrote {dest} ({dest.stat().st_size} bytes)")


def verify_measure(pbix_path: Path):
    from pbixray import PBIXRay

    m = PBIXRay(str(pbix_path))
    expr = m.dax_measures[m.dax_measures["Name"] == "PPC 4W Planned Derived"].iloc[0]["Expression"]
    ok = "SELECTEDVALUE" in expr.split("VAR CurrentDate")[1][:350]
    print(f"verify {pbix_path.name}: SELECTEDVALUE in CurrentDate => {ok}")
    if not ok:
        raise RuntimeError("verification failed")


def main():
    root = Path(r"d:\Work\20260706_LIntendant\Code")
    model = root / "SDH Scheduling Model.pbix"
    dash = root / "SDH Project Scheduling Dashboard.pbix"

    # Backups once
    for p in (model, dash):
        bak = p.with_suffix(".pbix.bak")
        if not bak.exists():
            shutil.copy2(p, bak)
            print(f"backup {bak.name}")

    vis_rel = "Report/definition/pages/564e5cc47bdc097e1bcc/visuals/3189eee51ce7b9b0b4c9/visual.json"
    vis_bytes = (
        root
        / "_pbix_edit"
        / "dash"
        / "Report"
        / "definition"
        / "pages"
        / "564e5cc47bdc097e1bcc"
        / "visuals"
        / "3189eee51ce7b9b0b4c9"
        / "visual.json"
    ).read_bytes()

    # Fix visual filter: use sdh_islatestrevision (real column) instead of missing calculated column
    import json

    j = json.loads(vis_bytes.decode("utf-8"))
    for f in j["filterConfig"]["filters"]:
        col = f.get("field", {}).get("Column", {})
        if col.get("Property") == "Is Latest Revision":
            col["Property"] = "sdh_islatestrevision"
            # Dataverse Yes/No often lands as bool; match 1L style used elsewhere for flags
            where = f["filter"]["Where"][0]["Condition"]["Comparison"]
            where["Left"]["Column"]["Property"] = "sdh_islatestrevision"
            # Keep 1L — works for numeric Yes/No; if bool, Power BI may coerce
            where["Right"]["Literal"]["Value"] = "true"
    vis_bytes = json.dumps(j, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    (
        root
        / "_pbix_edit"
        / "dash"
        / "Report"
        / "definition"
        / "pages"
        / "564e5cc47bdc097e1bcc"
        / "visuals"
        / "3189eee51ce7b9b0b4c9"
        / "visual.json"
    ).write_bytes(vis_bytes)

    model_dm = patch_decompressed_datamodel(model)
    dash_dm = patch_decompressed_datamodel(dash)

    rebuild_pbix(model, model, model_dm)
    rebuild_pbix(dash, dash, dash_dm, extra_replacements={vis_rel: vis_bytes})

    verify_measure(model)
    verify_measure(dash)
    print("done")


if __name__ == "__main__":
    main()
