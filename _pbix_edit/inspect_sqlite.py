from pbixray.pbix_unpacker import PbixUnpacker
from pbixray.meta.sqlite_handler import SQLiteHandler
from pbixray.utils import get_data_slice

u = PbixUnpacker(r"d:\Work\20260706_LIntendant\Code\SDH Scheduling Model.pbix")
buf = get_data_slice(u.data_model, "metadata.sqlitedb")
sh = SQLiteHandler(buf)
print("tables:", sh.execute_query("SELECT name FROM sqlite_master WHERE type='table'")["name"].tolist())
print(sh.execute_query("PRAGMA table_info(Measure)"))
meas = sh.execute_query(
    "SELECT Name, length(Expression) AS elen FROM Measure WHERE Name LIKE '%PPC 4W Planned%'"
)
print(meas)
expr = sh.execute_query(
    "SELECT Expression FROM Measure WHERE Name = 'PPC 4W Planned Derived'"
).iloc[0]["Expression"]
print("EXPR START:")
print(expr[:700])

# List files in data model for write strategy
dm = u.data_model
print("dm attrs", [a for a in dir(dm) if not a.startswith("_")])
if hasattr(dm, "files"):
    files = dm.files
    print("file count", len(files))
    for f in files:
        name = getattr(f, "Name", None) or getattr(f, "Path", None) or str(f)
        if "sqlite" in str(name).lower() or "metadata" in str(name).lower():
            print(name, getattr(f, "Size", None), type(f))
