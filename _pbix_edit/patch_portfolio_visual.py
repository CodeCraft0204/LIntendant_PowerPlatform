from pathlib import Path
import json
import re
import zipfile

pbix = Path(r"d:\Work\20260706_LIntendant\Code\SDH Project Scheduling Dashboard.pbix")
vis_rel = "Report/definition/pages/564e5cc47bdc097e1bcc/visuals/3189eee51ce7b9b0b4c9/visual.json"

with zipfile.ZipFile(pbix, "r") as z:
    raw = z.read(vis_rel).decode("utf-8")

j = json.loads(raw)

for p in j["visual"]["query"]["queryState"]["Values"]["projections"]:
    m = p.get("field", {}).get("Measure")
    if not m:
        continue
    if m.get("Property") == "Construction PPC 4W %":
        m["Property"] = "Portfolio Construction 4W PPC %"
        p["queryRef"] = "_Measures.Portfolio Construction 4W PPC %"
        p["nativeQueryRef"] = "Construction PPC 4W %"
        p["displayName"] = "Construction PPC 4W %"
    elif m.get("Property") == "Construction PPC 4W Commitments Summary":
        m["Property"] = "Portfolio Construction 4W Commitments Summary"
        p["queryRef"] = "_Measures.Portfolio Construction 4W Commitments Summary"
        p["nativeQueryRef"] = "Construction PPC 4W Commitments Summary"
        p["displayName"] = "Construction PPC 4W Commitments Summary"

for s in j["visual"]["query"].get("sortDefinition", {}).get("sort", []):
    m = s.get("field", {}).get("Measure")
    if m and m.get("Property") == "Construction PPC 4W %":
        m["Property"] = "Portfolio Construction 4W PPC %"

for cw in j["visual"].get("objects", {}).get("columnWidth", []):
    meta = cw.get("selector", {}).get("metadata")
    if meta == "_Measures.Construction PPC 4W %":
        cw["selector"]["metadata"] = "_Measures.Portfolio Construction 4W PPC %"
    elif meta == "_Measures.Construction PPC 4W Commitments Summary":
        cw["selector"]["metadata"] = "_Measures.Portfolio Construction 4W Commitments Summary"

rev_filter = {
    "name": "a1b2c3d4e5f60718293a",
    "field": {
        "Column": {
            "Expression": {"SourceRef": {"Entity": "sdh_schedulesnapshot"}},
            "Property": "Is Latest Revision",
        }
    },
    "type": "Advanced",
    "filter": {
        "Version": 2,
        "From": [{"Name": "s", "Entity": "sdh_schedulesnapshot", "Type": 0}],
        "Where": [
            {
                "Condition": {
                    "Comparison": {
                        "ComparisonKind": 0,
                        "Left": {
                            "Column": {
                                "Expression": {"SourceRef": {"Source": "s"}},
                                "Property": "Is Latest Revision",
                            }
                        },
                        "Right": {"Literal": {"Value": "1L"}},
                    }
                }
            }
        ],
    },
    "howCreated": "User",
}
j["filterConfig"]["filters"].insert(1, rev_filter)

out = Path(
    r"d:\Work\20260706_LIntendant\Code\_pbix_edit\dash\Report\definition\pages"
    r"\564e5cc47bdc097e1bcc\visuals\3189eee51ce7b9b0b4c9\visual.json"
)
text = json.dumps(j, separators=(",", ":"), ensure_ascii=False)
out.write_text(text, encoding="utf-8")
print("written", len(text))
print(
    "old Construction PPC 4W % Property count",
    len(re.findall(r'"Property":"Construction PPC 4W %"', text)),
)
print("new PPC %", '"Property":"Portfolio Construction 4W PPC %"' in text)
print(
    "new Summary",
    '"Property":"Portfolio Construction 4W Commitments Summary"' in text,
)
print("revision filter", '"Property":"Is Latest Revision"' in text)
print("has queryRef", '"queryRef"' in text)
print("has filterConfig", '"filterConfig"' in text)
print("has howCreated", '"howCreated"' in text)
