from pbixray import PBIXRay
import sys
import zipfile
import re

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

m = PBIXRay(r"d:\Work\20260706_LIntendant\Code\SDH Scheduling Model.pbix")

# Find leads 0.02, grade, color measures related to Quality/PPC
keywords = (
    "Lead",
    "Grade",
    "Color",
    "PPC",
    "Global Score",
    "0.02",
    "0.05",
    ">= 90",
    ">= 80",
)
for _, r in m.dax_measures.iterrows():
    name = str(r["Name"])
    expr = str(r["Expression"] or "")
    interesting_name = any(
        k.lower() in name.lower()
        for k in (
            "Lead",
            "Grade",
            "Color",
            "PPC",
            "Global Score",
            "Global Grade",
            "Status",
            "Target",
        )
    )
    interesting_expr = (
        "0.02" in expr
        or "LeadsPass" in expr
        or "LEADS_PCT" in expr
        or ("Score >=" in expr and "Grade" in name)
        or ("Color" in name and ("Quality" in name or "PPC" in name or "Portfolio" in name))
    )
    if interesting_name and (
        interesting_expr
        or "Grade" in name
        or "Color" in name
        or name
        in (
            "Quality Global Score",
            "Quality Global Grade",
            "Quality Leads Color",
            "Quality Leads %",
            "Quality Data Status",
            "Quality Data Target",
            "Construction PPC 4W %",
            "Construction Current PPC",
        )
    ):
        if (
            "Lead" in name
            or "Grade" in name
            or "Color" in name
            or "Global Score" in name
            or "0.02" in expr
            or "LEADS" in expr
            or "PPC" in name
            and ("Color" in name or "Grade" in name or "%" in name)
        ):
            print("=" * 80)
            print(name)
            print(expr[:2000])
            print()

print("\n\n=== ALL measures with Color in name ===")
for _, r in m.dax_measures.iterrows():
    if "Color" in str(r["Name"]):
        print(r["Name"])

print("\n=== ALL measures with Grade in name ===")
for _, r in m.dax_measures.iterrows():
    if "Grade" in str(r["Name"]):
        print(r["Name"])
