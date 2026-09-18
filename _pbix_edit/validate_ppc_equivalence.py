"""
Structural validation: Portfolio Construction 4W measures resolve to the same
latest-snapshot / latest-revision anchor the PPC page uses when those slicers
are set to the project's latest values.
"""
from pbixray import PBIXRay

dash = r"d:\Work\20260706_LIntendant\Code\SDH Project Scheduling Dashboard.pbix"
m = PBIXRay(dash)
measures = {
    r["Name"]: r["Expression"]
    for _, r in m.dax_measures.iterrows()
}

checks = []

# 1) Portfolio wrappers pin latest date + revision per project
for name in (
    "Portfolio Construction 4W PPC %",
    "Portfolio Construction 4W Commitments Summary",
):
    expr = measures[name]
    checks.append(
        (
            f"{name} resolves max snapshot date per project",
            "MAX(" in expr
            and "sdh_snapshotdate" in expr
            and "sdh_projectnumber" in expr,
        )
    )
    checks.append(
        (
            f"{name} resolves max revision on that date",
            "sdh_snapshotrevision" in expr
            and (
                "LatestDate" in expr
                or ("MAX(" in expr and "snapshotdate" in expr)
            ),
        )
    )

# 2) Planned/Completed CurrentDate aligned
planned_cd = measures["PPC 4W Planned Derived"].split("VAR CurrentDate", 1)[1][:400]
completed_cd = measures["PPC 4W Completed Derived"].split("VAR CurrentDate", 1)[1][:400]
checks.append(
    (
        "Planned Derived CurrentDate uses SELECTEDVALUE then MAX",
        "SELECTEDVALUE" in planned_cd and "COALESCE" in planned_cd and "MAX(" in planned_cd,
    )
)
checks.append(
    (
        "Completed Derived CurrentDate uses SELECTEDVALUE then MAX",
        "SELECTEDVALUE" in completed_cd and "COALESCE" in completed_cd and "MAX(" in completed_cd,
    )
)

# 3) Construction 4W % used on PPC page still exists unchanged as thin wrapper
checks.append(
    (
        "PPC page Construction PPC 4W % still divides Completed/Planned",
        "Construction PPC 4W Completed" in measures["Construction PPC 4W %"]
        and "Construction PPC 4W Planned" in measures["Construction PPC 4W %"],
    )
)

# 4) Portfolio wrappers call the same Construction 4W Planned/Completed
for name in (
    "Portfolio Construction 4W PPC %",
    "Portfolio Construction 4W Commitments Summary",
):
    expr = measures[name]
    checks.append(
        (
            f"{name} calls Construction PPC 4W Planned/Completed",
            "Construction PPC 4W Planned" in expr and "Construction PPC 4W Completed" in expr,
        )
    )

failed = [c for c, ok in checks if not ok]
for c, ok in checks:
    print(("PASS" if ok else "FAIL"), "-", c)

if failed:
    raise SystemExit(f"{len(failed)} validation checks failed")

print()
print("Equivalence argument:")
print(
    "On PPC page, selecting a project's latest snapshot date + latest revision"
    " makes Construction PPC 4W % evaluate Planned/Completed under that context."
)
print(
    "On Portfolio, Portfolio Construction 4W PPC % / Commitments Summary force"
    " the same project + MAX(date) + MAX(revision) before calling the same"
    " Construction PPC 4W Planned/Completed measures."
)
print(
    "With Planned Derived now also preferring SELECTEDVALUE(date), Planned and"
    " Completed share the same anchor date in both contexts."
)
print("Live UI check: open dashboard, compare project 232408 on both pages.")
