from pbixray import PBIXRay
import zipfile
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

m = PBIXRay(r"d:\Work\20260706_LIntendant\Code\SDH Scheduling Model.pbix")

for name in [
    "Quality Global Score",
    "Quality Global Grade",
    "Portfolio Quality Score",
    "Portfolio Quality Score Display",
    "Quality Missing Logic %",
    "Quality Hard Constraints %",
    "Quality Active Tasks",
    "Quality Selected Project",
    "Quality Selected Snapshot",
]:
    row = m.dax_measures[m.dax_measures["Name"] == name]
    if len(row) == 0:
        # fuzzy
        hits = m.dax_measures[
            m.dax_measures["Name"].str.contains(name.split()[0], case=False, na=False)
            & m.dax_measures["Name"].str.contains(
                name.split()[-1], case=False, na=False
            )
        ]["Name"].tolist()
        print(f"MISSING {name} -> near {hits[:15]}")
        continue
    print("=" * 80)
    print(name)
    print(row.iloc[0]["Expression"])
    print()

# Any measure with Portfolio and Quality
print("=== Portfolio*Quality measures ===")
for _, r in m.dax_measures.iterrows():
    n = r["Name"]
    if "Portfolio" in n and "Quality" in n:
        print("---", n, "---")
        print(r["Expression"][:800])
        print()

dash = r"d:\Work\20260706_LIntendant\Code\SDH Project Scheduling Dashboard.pbix"
with zipfile.ZipFile(dash) as z:
    # Portfolio table
    vis = json.loads(
        z.read(
            "Report/definition/pages/564e5cc47bdc097e1bcc/visuals/3189eee51ce7b9b0b4c9/visual.json"
        )
    )
    print("=== Portfolio Active Project Information Quality fields ===")
    for p in vis["visual"]["query"]["queryState"]["Values"]["projections"]:
        mprop = (p.get("field") or {}).get("Measure") or {}
        if "Quality" in str(mprop.get("Property", "")):
            print(mprop.get("Property"), p.get("queryRef"), p.get("nativeQueryRef"))
    print("filters:", [f["field"].get("Column", f["field"].get("Measure", {})).get("Property") for f in vis.get("filterConfig", {}).get("filters", [])])

    # Schedule quality page visuals
    pid = "386f709a849de0187002"
    print("\n=== Schedule Quality page visuals with Global/Grade ===")
    for n in z.namelist():
        if f"{pid}/visuals/" not in n or not n.endswith("visual.json"):
            continue
        raw = z.read(n).decode("utf-8")
        if "Quality Global" not in raw and "Global Score" not in raw and "Global Grade" not in raw:
            continue
        j = json.loads(raw)
        props = re.findall(r'"Property":"([^"]+)"', raw)
        qprops = [p for p in props if "Quality" in p or "Grade" in p or "Global" in p]
        print(n.split("/")[-2], j["visual"]["visualType"], sorted(set(qprops)))
        for f in j.get("filterConfig", {}).get("filters", []) or []:
            col = f["field"].get("Column") or f["field"].get("Measure") or {}
            print("  filter", col.get("Property"))
        # slicers on page
    print("\n=== Schedule Quality slicers ===")
    for n in z.namelist():
        if f"{pid}/visuals/" not in n or not n.endswith("visual.json"):
            continue
        j = json.loads(z.read(n))
        if j.get("visual", {}).get("visualType") != "slicer":
            continue
        raw = z.read(n).decode("utf-8")
        props = re.findall(r'"Property":"([^"]+)"', raw)
        print(n.split("/")[-2], props[:6])
