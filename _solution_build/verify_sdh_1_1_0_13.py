import json
import re
import zipfile
from pathlib import Path

ZIP = Path(__file__).resolve().parent.parent / "SchedulingDataHubPOC_1_1_0_13_managed.zip"

z = zipfile.ZipFile(ZIP)
print("root entries:", [n for n in z.namelist() if "/" not in n])
text = z.read(next(n for n in z.namelist() if "SDH-01" in n)).decode("utf-8-sig")
definition = json.loads(text)["properties"]["definition"]
trigger = definition["triggers"]["TRG_SP_File_Created"]
print("trigger:", json.dumps(trigger["inputs"]["parameters"], ensure_ascii=False), trigger.get("runtimeConfiguration"))
for key in ["dataset", "parameters/destinationDataset", "folderPath", "parameters/destinationFolderPath",
            "source", "drive", "file", "item/sdh_sourcefolder"]:
    values = sorted(set(re.findall(r'"' + re.escape(key) + r'": "([^"]*)"', text)))
    print(f"{key}: {values}")
print(re.search(r"<Version>[^<]+", z.read("solution.xml").decode("utf-8-sig")).group())
