from pbixray import PBIXRay
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
m = PBIXRay(r"d:\Work\20260706_LIntendant\Code\SDH Scheduling Model.pbix")

need = [
    "Quality Leads Color",
    "Quality Global Score Color",
    "Quality Global Grade",
    "Quality Data Status",
    "Quality Data Target",
    "Construction Delay Cause Coverage Color",
]
# also any PPC*Color or *PPC*Color*
for _, r in m.dax_measures.iterrows():
    n = str(r["Name"])
    if (
        n in need
        or ("PPC" in n and "Color" in n)
        or ("Portfolio" in n and ("Grade" in n or "Color" in n or "Score" in n))
        or n.endswith("Color")
        and ("Quality" in n or "PPC" in n)
    ):
        print("=" * 80)
        print(n)
        print(r["Expression"])
        print()

# Search 0.02 in all measures
print("\n=== Measures containing 0.02 ===")
for _, r in m.dax_measures.iterrows():
    e = str(r["Expression"] or "")
    if "0.02" in e:
        print(r["Name"])
        # show lines with 0.02
        for line in e.splitlines():
            if "0.02" in line or "Lead" in line and ("<=" in line or "Target" in line):
                print(" ", line.strip())
