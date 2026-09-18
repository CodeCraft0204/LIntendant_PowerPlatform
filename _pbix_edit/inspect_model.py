from pbixray import PBIXRay
from pbixray.pbix_unpacker import PbixUnpacker
from pbixray.meta.sqlite_handler import SQLiteHandler
from pbixray.utils import get_data_slice

m = PBIXRay(r"d:\Work\20260706_LIntendant\Code\SDH Scheduling Model.pbix")
t = m.get_table("sdh_schedulesnapshot")
print("cols sample:", [c for c in t.columns if "latest" in c.lower() or "revision" in c.lower() or "Is Latest" in c])
for c in t.columns:
    if "latest" in c.lower() or c in ("Is Latest Snapshot", "Is Latest Chronological Snapshot"):
        print("---", c)
        print(t[c].value_counts(dropna=False).head(10))

u = PbixUnpacker(r"d:\Work\20260706_LIntendant\Code\SDH Scheduling Model.pbix")
buf = get_data_slice(u.data_model, "metadata.sqlitedb")
sh = SQLiteHandler(buf)
print("tables:", sh.execute_query("SELECT name FROM sqlite_master WHERE type='table'")["name"].tolist())
print(sh.execute_query("PRAGMA table_info(Measure)"))
meas = sh.execute_query(
    "SELECT Name, length(Expression) AS elen FROM Measure WHERE Name LIKE '%PPC 4W Planned%'"
)
print(meas)
row = sh.execute_query(
    "SELECT Expression FROM Measure WHERE Name = 'PPC 4W Planned Derived'"
)
print(row.iloc[0]["Expression"][:500])
