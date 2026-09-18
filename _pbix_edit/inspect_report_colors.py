import zipfile
import re
import json
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

dash = r"d:\Work\20260706_LIntendant\Code\SDH Project Scheduling Dashboard.pbix"
with zipfile.ZipFile(dash) as z:
    hits = []
    for n in z.namelist():
        if not n.endswith("visual.json"):
            continue
        raw = z.read(n).decode("utf-8", errors="replace")
        if not any(
            k in raw
            for k in (
                "Quality Global Score",
                "Construction PPC",
                "Procurement PPC",
                "PPC 4W",
                "Current PPC",
                "Global Grade",
                "Score Color",
                "PPC Color",
            )
        ):
            continue
        # conditional formatting / color measures
        colorish = re.findall(
            r'"Property":"([^"]*(?:Color|Grade|PPC|Quality Global)[^"]*)"', raw
        )
        if any(
            "Color" in p or "Grade" in p or "PPC" in p or "Quality Global" in p
            for p in colorish
        ):
            page = n.split("/")[3] if "pages/" in n else "?"
            print(page, n.split("/")[-2])
            print(" ", sorted(set(colorish))[:40])
