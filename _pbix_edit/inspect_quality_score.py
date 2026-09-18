from pbixray import PBIXRay
import zipfile
import json
import re

m = PBIXRay(r"d:\Work\20260706_LIntendant\Code\SDH Scheduling Model.pbix")
qm = m.dax_measures[
    m.dax_measures["Name"].str.contains(
        "Quality|Global Score|Grade|DCMA|Portfolio Quality", case=False, na=False
    )
]
print("=== Quality-related measures ===")
for _, r in qm.iterrows():
    print("---", r["Name"], "---")
    print(r["Expression"])
    print()

dash = r"d:\Work\20260706_LIntendant\Code\SDH Project Scheduling Dashboard.pbix"
base = "Report/definition/pages"
pages = {
    "Portfolio": "564e5cc47bdc097e1bcc",
    "ScheduleQuality": "386f709a849de0187002",
}
with zipfile.ZipFile(dash) as z:
    for label, pid in pages.items():
        print("========", label, "========")
        page = json.loads(z.read(f"{base}/{pid}/page.json"))
        print("page", page.get("displayName"))
        vis = [
            n
            for n in z.namelist()
            if f"{pid}/visuals/" in n and n.endswith("visual.json")
        ]
        for vpath in vis:
            raw = z.read(vpath).decode("utf-8")
            if not any(
                k in raw
                for k in ("Quality", "Grade", "Global Score", "DCMA", "Quality Global")
            ):
                continue
            j = json.loads(raw)
            vt = j.get("visual", {}).get("visualType")
            props = re.findall(
                r'"Property":"([^"]*(?:Quality|Grade|Global|Score|DCMA)[^"]*)"', raw
            )
            print(f"  visual {vpath.split('/')[-2]} type={vt}")
            print("   props:", sorted(set(props)))
            # titles
            titles = re.findall(r'"Value":"\'([^\']{1,80})\'"', raw)
            interesting = [
                t
                for t in titles
                if any(
                    k in t
                    for k in ("Quality", "Grade", "Global", "Score", "DCMA", "Active")
                )
            ]
            if interesting:
                print("   titles:", interesting[:10])
            for f in j.get("filterConfig", {}).get("filters", []) or []:
                field = f.get("field", {})
                col = field.get("Column") or field.get("Measure") or {}
                print("   filter:", col.get("Property"))
            # page-level later
        # page filters
        pf = page.get("filterConfig")
        if pf:
            print(" PAGE FILTERS:", json.dumps(pf)[:500])
