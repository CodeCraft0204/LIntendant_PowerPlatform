import json
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

path = (
    r"d:\Work\20260706_LIntendant\Code\SchedulingDataHubPOC_1_1_0_12_managed"
    r"\Workflows\SDH-01ImportWeeklySchedule-5D7440D8-5390-F111-8077-002248D5A4D7.json"
)
with open(path, encoding="utf-8") as f:
    flow = json.load(f)


def walk_action(name, act, parent=""):
    if not isinstance(act, dict):
        return
    inp = act.get("inputs")
    blob = json.dumps(inp, ensure_ascii=False) if inp else ""
    typ = act.get("type", "")
    reasons = []
    fields = {}

    if "232408-Utile" in blob or "sites/232408" in blob:
        reasons.append("old site")
    if "POC-Scheduling" in blob:
        reasons.append("POC path")
    if "Documents partages" in blob:
        reasons.append("Documents partages")
    if "sdh_sourcefolder" in blob:
        reasons.append("sdh_sourcefolder")

    if isinstance(inp, dict):
        p = inp.get("parameters") or {}
        if isinstance(p, dict):
            for key in [
                "dataset",
                "folderPath",
                "path",
                "parameters/destinationDataset",
                "parameters/destinationFolderPath",
                "id",
                "source",
            ]:
                if key in p:
                    fields[key] = p[key]
            for k, v in p.items():
                if "sdh_sourcefolder" in str(k):
                    fields[k] = v
                    reasons.append("sdh_sourcefolder")

    host = ""
    if isinstance(inp, dict):
        host = json.dumps(inp.get("host") or {}, ensure_ascii=False)
    is_sp = "sharepoint" in host.lower() or "shared_sharepointonline" in blob

    if reasons or (is_sp and fields):
        if is_sp or reasons:
            print(f"NODE: {name}")
            if parent:
                print(f"  parent scope: {parent}")
            print(f"  type: {typ}")
            if reasons:
                print(f"  why: {', '.join(dict.fromkeys(reasons))}")
            for k, v in fields.items():
                print(f"  {k}: {v}")
            print()

    if "actions" in act and isinstance(act["actions"], dict):
        for n2, a2 in act["actions"].items():
            walk_action(n2, a2, name)
    if "else" in act and isinstance(act.get("else"), dict):
        for n2, a2 in (act["else"].get("actions") or {}).items():
            walk_action(n2, a2, f"{name} / ELSE")
    cases = act.get("cases")
    if isinstance(cases, dict):
        for cn, cv in cases.items():
            if isinstance(cv, dict):
                for n2, a2 in (cv.get("actions") or {}).items():
                    walk_action(n2, a2, f"{name} / CASE {cn}")


defn = flow["properties"]["definition"]
print("========== TRIGGER ==========")
for tname, tval in (defn.get("triggers") or {}).items():
    walk_action(tname, tval, "TRIGGER")

print("========== ACTIONS ==========")
for name, act in (defn.get("actions") or {}).items():
    walk_action(name, act, "ROOT")
