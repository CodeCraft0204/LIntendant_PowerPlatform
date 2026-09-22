# Quality / PPC colors, grades, and Leads target — apply guide

## Targets (new)


| Score (Quality Global or PPC %) | Grade (Quality only) | Color      |
| ------------------------------- | -------------------- | ---------- |
| **90%+**                        | **A**                | **Green**  |
| **85% – 89%**                   | **B**                | **Green**  |
| **80% – 84%**                   | **B**                | **Yellow** |
| **70% – 79%**                   | **C**                | **Yellow** |
| **60% – 69%**                   | **D**                | **Red**    |
| **< 60%**                       | **E**                | **Red**    |


PPC: **color only** (no grade letter).

Leads KPI target: **≤ 5%** (was ≤ 2%).

Suggested hex (matches existing report style):


| Role        | Hex       |
| ----------- | --------- |
| Green       | `#15803D` |
| Yellow      | `#D97706` |
| Red         | `#C93636` |
| Blank / n/a | `#6B7280` |


> **Important:** Color must be based on the **numeric score**, not the letter grade. Grade **B** is green at 85–89 and yellow at 80–84.

---



## Part A — Semantic model (`_Measures`)

Open **SDH Scheduling Model** (or the dataset in Desktop) → table `_Measures`.

### A1. Leads target → 5% (4 places)



#### 1) `Quality Global Score` — only change `LeadsPass`

Find:

```dax
VAR LeadsPass =
    IF(
        NOT ISBLANK(LeadsValue)
            && LeadsValue <= 0.02,
        1,
        0
    )
```

Replace with:

```dax
VAR LeadsPass =
    IF(
        NOT ISBLANK(LeadsValue)
            && LeadsValue <= 0.05,
        1,
        0
    )
```

Leave other thresholds (e.g. Hard Constraints ≤ 2%) unchanged.

#### 2) `Quality Leads Color`

Replace entire measure:

```dax
Quality Leads Color =
VAR v = [Quality Leads %]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(v), "#6B7280",
    v <= 0.05, "#15803D",
    "#C93636"
)
```



#### 3) `Quality Data Status` — `LEADS_PCT` branch

Find:

```dax
MetricKey = "LEADS_PCT",
    IF(V <= 0.02, "Met", "Not Met"),
```

Replace with:

```dax
MetricKey = "LEADS_PCT",
    IF(V <= 0.05, "Met", "Not Met"),
```



#### 4) `Quality Data Target` — `LEADS_PCT` label

Find:

```dax
"LEADS_PCT", "≤ 2%",
```

Replace with:

```dax
"LEADS_PCT", "≤ 5%",
```

Also update any card subtitle / text box on **Schedule Quality** that still says “≤ 2%” for Leads.

---



### A2. Quality grade letters (include **E**)

Replace `Quality Global Grade`:

```dax
Quality Global Grade =
VAR Score = [Quality Global Score]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(Score), "—",
    Score >= 90, "A",
    Score >= 80, "B",
    Score >= 70, "C",
    Score >= 60, "D",
    "E"
)
```

If you created `Portfolio Quality Global Grade`, use the same bands with `[Portfolio Quality Global Score]`.

---



### A3. Quality score color (score-based, not letter-based)

Replace `Quality Global Score Color`:

```dax
Quality Global Score Color =
VAR Score = [Quality Global Score]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(Score), "#6B7280",
    Score >= 85, "#15803D",   -- A + high B → green
    Score >= 70, "#D97706",   -- low B + C → yellow
    "#C93636"                 -- D + E → red
)
```

Optional portfolio twin:

```dax
Portfolio Quality Global Score Color =
VAR Score = [Portfolio Quality Global Score]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(Score), "#6B7280",
    Score >= 85, "#15803D",
    Score >= 70, "#D97706",
    "#C93636"
)
```

---



### A4. Create PPC color measures (no grade)

PPC values are usually **0–1** decimals (e.g. `0.85` = 85%). Use `0.85` / `0.70` thresholds.

```dax
Construction Current PPC Color =
VAR v = [Construction Current PPC]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(v), "#6B7280",
    v >= 0.85, "#15803D",
    v >= 0.70, "#D97706",
    "#C93636"
)
```

```dax
Construction PPC 4W % Color =
VAR v = [Construction PPC 4W %]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(v), "#6B7280",
    v >= 0.85, "#15803D",
    v >= 0.70, "#D97706",
    "#C93636"
)
```

```dax
Procurement Current PPC Color =
VAR v = [Procurement Current PPC]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(v), "#6B7280",
    v >= 0.85, "#15803D",
    v >= 0.70, "#D97706",
    "#C93636"
)
```

```dax
Procurement PPC 4W % Color =
VAR v = [Procurement PPC 4W %]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(v), "#6B7280",
    v >= 0.85, "#15803D",
    v >= 0.70, "#D97706",
    "#C93636"
)
```

```dax
Portfolio Construction 4W PPC % Color =
VAR v = [Portfolio Construction 4W PPC %]
RETURN
SWITCH(
    TRUE(),
    ISBLANK(v), "#6B7280",
    v >= 0.85, "#15803D",
    v >= 0.70, "#D97706",
    "#C93636"
)
```

If any PPC measure is already formatted as **percent 0–100** (eighty-five not 0.85), use `85` / `70` instead of `0.85` / `0.70`.

---



## Part B — Report conditional formatting

After measures exist, wire **font or background** color via **Field value** → the `* Color` measure.

### B1. Schedule Quality — Global Score / Grade card

Visual already uses `Quality Global Score Color` in many builds.

1. Select **Global Quality Score / Grade** card
2. Format → **Callout value** (or font) → **Conditional formatting**
3. Format style: **Field value**
4. Field: `Quality Global Score Color`
5. Apply to score **and** grade text if shown separately



### B2. Project Portfolio — Active Project Information


| Column                                                   | Conditional format field                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Quality Global Score (or Portfolio Quality Global Score) | `Portfolio Quality Global Score Color` **or** `Quality Global Score Color` if still on raw measure |
| Construction PPC 4W %                                    | `Portfolio Construction 4W PPC % Color`                                                            |


Steps per column:

1. Column header dropdown → **Conditional formatting** → **Font color** (or Background)
2. **Field value**
3. Pick the matching `* Color` measure
4. OK



### B3. PPC / Reliability page cards


| Card                     | Color measure                    |
| ------------------------ | -------------------------------- |
| Construction Current PPC | `Construction Current PPC Color` |
| Construction 4-Week PPC  | `Construction PPC 4W % Color`    |
| Procurement Current PPC  | `Procurement Current PPC Color`  |
| Procurement 4-Week PPC   | `Procurement PPC 4W % Color`     |


For each card: Format visual → Callout value → Conditional formatting → Field value → color measure.

### B4. Overview / other pages

Anywhere else that shows:

- Quality Global Score → `Quality Global Score Color` (or Portfolio twin on multi-project visuals)  
- Any Construction/Procurement Current or 4W PPC % → matching `* Color` measure

---



## Part C — Validate


| Check                                               | Expected                      |
| --------------------------------------------------- | ----------------------------- |
| Leads KPI target text                               | ≤ 5%                          |
| Leads 3%                                            | Met / green                   |
| Leads 6%                                            | Not Met / red                 |
| Score 92                                            | Grade **A**, green            |
| Score 87                                            | Grade **B**, green            |
| Score 82                                            | Grade **B**, yellow           |
| Score 75                                            | Grade **C**, yellow           |
| Score 65                                            | Grade **D**, red              |
| Score 55                                            | Grade **E**, red (not F)      |
| PPC 88%                                             | green, no letter              |
| PPC 82%                                             | yellow                        |
| PPC 55%                                             | red                           |
| Portfolio row vs Schedule Quality (latest snapshot) | same score **and** same color |


---



## Part D — Save & publish

1. Save semantic model
2. Publish dataset
3. Publish / refresh report
4. Spot-check Portfolio + Schedule Quality + PPC pages

---



## Quick checklist

- [x] `Quality Global Score` LeadsPass `<= 0.05`  
- [x] `Quality Leads Color` `<= 0.05`  
- [x] `Quality Data Status` LEADS `<= 0.05`  
- [x] `Quality Data Target` `"≤ 5%"`  
- [x] `Quality Global Grade` ends with **"E"** (not F)  
- [x] `Quality Global Score Color` uses **score bands** (85 / 70), not letter alone  
- [x] PPC `* Color` measures created  
- [x] Conditional formatting on Portfolio, Schedule Quality, PPC cards  
- [x] UI labels saying “≤ 2%” for Leads updated  

---

*Hard Constraints target stays ≤ 2% unless you decide to change that separately.*