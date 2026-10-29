# Risques et enjeux: Phase 1 implementation guide (native SharePoint)

Based on *Risk and Issue Register Upgrade: implementation proposal* (2 Oct 2026), Simon's comments on it, and the current list (site **Bureau de projet**, list **Risques et enjeux**).

**Phase 1 delivers:**
- new columns with stable internal names;
- calculated score, level, management flag and next review;
- the reference list *Référence – Grille d'impact*;
- validation rules;
- an organized native form with conditional fields and cause guidance;
- five operational views, plus a per-project link.

No Power Apps; that is Phase 2.

**Order matters.** Work in a test copy first (steps 1–11). Then apply the same steps to production in the order given in step 13. In particular, mark the historical closed records (step 10) **before** enabling validation (step 7). Otherwise, editing an old closed record is blocked.

---

## 0. Decisions to lock before configuring

| # | Decision | Status / default used in this guide |
| --- | --- | --- |
| D1 | Level labels and bands: 1–3 Très faible, 4–6 Faible, 8–10 Moyen, 12–16 Élevé, 20–25 Critique | **Confirmed** ("OK") |
| D2 | Management flag (*Signalement direction*) | Simon: impact 5 always; impact 3 **only with probability ≥ 3**. Used here: `Impact = 5 OR (Impact ≥ 3 AND Probabilité ≥ 3)`. **Confirm whether impact 4 follows the same rule as impact 3** (assumed yes). |
| D3 | *Répondant direction* visibility | Shown when the item is flagged (same rule as D2), so it is never asked for items management doesn't see. |
| D4 | Weekly review threshold | The plan has a conflict: the level table puts score 8 in Moyen (weekly), but the acceptance table says "≥ 9". Used here: **score ≥ 8 → +7 days**, otherwise +30. Confirm. |
| D5 | Cause mapping from the old *Type* | "To be validated before implementation". Pre-fill **only after** validation (step 10.2). |
| D6 | Old **Comité opération** checkbox | Recommended: keep it as a manual override, so the committee view = score ≥ 12 **or** checkbox = Oui. Alternative: retire it. |
| D7 | Owners of the 12 active records without owner | Simon assigns them before transfer. |

---

## 1. Discovery (inventory the current list)

1. **Schema with internal names.** Open this URL in the browser (replace the site path if it differs):

   ```
   https://lintendant1.sharepoint.com/sites/PMO/_api/web/lists/getbytitle('Risques et enjeux')/fields?$filter=Hidden eq false and ReadOnlyField eq false&$select=Title,InternalName,TypeAsString,Required,DefaultValue
   ```

   Record the display name, internal name, type, required flag and default of every column in a *field dictionary* (Excel). The steps below need these values:
   - the **project** column (currently labelled "25014 - Costco"): its internal name and type (Choice or Lookup);
   - **Description**: is it the list's `Title` field, or a separate text column? (See step 3.2.)
   - **Statut**: internal name and **exact** choice values (`Actif`, `Fermé`, others?);
   - **Type**, **Indice de risque**, **Autres impacts**, **Stratégie**, **Comité opération**, **Impact – Coût ($)**, **Impact – Échéancier (jours)**, **Propriétaire**.
2. **Counts.** Filter *Tous les éléments* by Statut and note: total, Actif, Fermé, and active items with an empty Propriétaire. The baseline was 305 / 69 / 236 / 12.
3. **List settings to note:**
   - *Versioning settings*: versioning must stay on.
   - *Advanced settings*: content types allowed? Attachments on?
   - *Permissions for this list*: inherited or unique.
   - Any existing *validation settings*.
4. **Integrations.** Open *Integrate → Power Automate → See your flows* and ask IT whether any flow, app or report writes to this list. Validation rules (step 7) also apply to flows and grid edits, so a writer that doesn't fill the new fields would start failing.
5. **Regional settings.** Open *Site settings → Regional settings* and note the locale. If its decimal separator is a comma (French locales), SharePoint formulas use **`;`** instead of `,` between arguments. All formulas below use `,`; swap to `;` if SharePoint rejects them.

## 2. Backup and test copy

1. **Backup.** Agree the method with IT. At minimum, use *Export → Export to CSV/Excel* on *Tous les éléments* with all columns, plus a screenshot of every view's settings. Version history stays in the list.
2. **Test copy.** In the same site, go to *New → List → From existing list* → *Risques et enjeux* and name it **Risques et enjeux – TEST**. This copies columns, views and formatting, but not items.
3. **Restrict it.** Under *List settings → Permissions*, stop inheriting and keep yourself plus the pilot users.
4. **Test data.** Open production in *Edit in grid view*, copy 15–20 representative rows (active and closed, with and without owner), and paste them into the test list's grid. Anonymize descriptions if needed.

## 3. Existing columns: rename and clean up

Do the renames **before** writing formulas or validation, so the formulas use the final labels. Renaming changes only the display name; internal names, data and references stay the same.

1. **Project column:** rename "25014 - Costco" to **Projet**.
2. **Title:**
   - If *Description* **is** the `Title` field, rename it to **Titre**.
   - If *Description* is a separate column while `Title` exists unused, first rename `Title` to *Titre (ancien)* and hide it from forms and views. Then rename *Description* to **Titre**.
3. **Impact – Coût ($)** → **Coût ($)**. Under *Default value*, **clear the 0**: blank means "not estimated", while 0 means "estimated at zero".
4. **Impact – Échéancier (jours)** → **Délai (jours)**. Set *Number of decimal places* = 0 and *Minimum allowed value* = 0. Add **column validation**:

   ```
   =OR(ISBLANK([Délai (jours)]),AND([Délai (jours)]>=0,INT([Délai (jours)])=[Délai (jours)]))
   ```

   User message: `Le délai doit être un nombre entier positif ou nul.`
5. **Stratégie** → **Détails de la stratégie**.
6. **Statut** and **Propriétaire** keep their names.
7. **Statut default:** check that it is `Actif`.
8. **Type, Indice de risque, Autres impacts:** keep them unchanged. They become historical, read-only by convention in Phase 1 and truly read-only in Phase 2.

## 4. New columns

**Internal-name rule.** SharePoint fixes a column's internal name from the name typed at creation and never changes it. Create each column with the **internal name** (English, no spaces or accents), save it, then edit it and change the display name to the French label. This gives clean internal names (`RiskImpact`, not `Impact_x00e9_...`) for formulas, JSON and Phase 2.

Create the columns in this order: choice, text, date, person and Yes/No columns first; the calculated columns (step 5) last.

| Create as (internal) | Rename to (display) | Type and settings |
| --- | --- | --- |
| `RiskKind` | Risque ou enjeu | Choice: `Risque`, `Enjeu`. Default `Risque`. Drop-down. |
| `RiskCause` | Cause | Choice: `Technique`, `Gestion de projet`, `Contractuel / commercial`, `Financier`, `Chaîne d'approvisionnement`, `Construction`, `Externe`, `Parties prenantes`, `Santé, sécurité et environnement`. No default. Description: `Voir le guide des causes au bas du formulaire.` |
| `RiskDetails` | Détails | Multiple lines of text, **plain text**. |
| `RiskProbability` | Probabilité | Choice: `1 - Très improbable`, `2 - Improbable`, `3 - Modéré`, `4 - Probable`, `5 - Presque certain`. No default. Description: `Pour un enjeu (événement survenu), choisir 5.` |
| `RiskImpact` | Impact | Choice: `1 - Négligeable`, `2 - Mineur`, `3 - Modéré`, `4 - Majeur`, `5 - Sévère`. No default. Description: `Conséquence la plus grave parmi coût, délai, qualité, SST et réputation.` |
| `QualityImpact` | Qualité | Multiple lines, plain text. |
| `HSImpact` | Santé et sécurité | Multiple lines, plain text. |
| `ReputationImpact` | Réputation | Multiple lines, plain text. |
| `ResponseStrategy` | Stratégie de réponse | Choice: `Éviter`, `Atténuer`, `Transférer`, `Accepter`. No default. |
| `ExecContact` | Répondant direction | Person or Group, people only, single. Not required. |
| `LastReview` | Dernière révision | Date only. Default **Today's date**. Description: `Mettre à jour à chaque révision de la cote.` |
| `ClosedDate` | Date de fermeture | Date only. No default. |
| `LegacyClosedRecord` | Exception historique | Yes/No, default **No**. Hidden from the form (step 8.1) and from views. |

**Leave "Require that this column contains information" set to No** on every new column. Required-ness is conditional and is handled by list validation (step 7). A plain "required" would also block edits of the 236 historical records.

**The two first characters of the Probabilité and Impact choices (`1 `…`5 `) are part of the design.** The formulas read the rating from them. Don't reword the choices without keeping the leading digit.

## 5. Calculated columns

Create each one with its internal name, then rename it. Formulas reference **display names**, so do steps 3–4 first.

### 5.1 `RiskScore` → **Score**

Data type returned: **Number**, 0 decimals.

```
=IF(OR(ISBLANK([Probabilité]),ISBLANK([Impact])),"",VALUE(LEFT([Probabilité],1))*VALUE(LEFT([Impact],1)))
```

### 5.2 `RiskLevel` → **Niveau**

Data type returned: **Single line of text**.

```
=IF(OR(ISBLANK([Probabilité]),ISBLANK([Impact])),"",IF(VALUE(LEFT([Probabilité],1))*VALUE(LEFT([Impact],1))>=20,"Critique",IF(VALUE(LEFT([Probabilité],1))*VALUE(LEFT([Impact],1))>=12,"Élevé",IF(VALUE(LEFT([Probabilité],1))*VALUE(LEFT([Impact],1))>=8,"Moyen",IF(VALUE(LEFT([Probabilité],1))*VALUE(LEFT([Impact],1))>=4,"Faible","Très faible")))))
```

### 5.3 `ExecFlag` → **Signalement direction**

Data type returned: **Yes/No**. Rule D2.

```
=IF(ISBLANK([Impact]),FALSE,IF(VALUE(LEFT([Impact],1))=5,TRUE,IF(ISBLANK([Probabilité]),FALSE,AND(VALUE(LEFT([Impact],1))>=3,VALUE(LEFT([Probabilité],1))>=3))))
```

If Simon decides impact 4 is always flagged, change `=5` to `>=4`.

### 5.4 `NextReview` → **Prochaine révision**

Data type returned: **Date and Time**, format **Date only**. Rule D4.

```
=IF(OR(ISBLANK([Dernière révision]),ISBLANK([Probabilité]),ISBLANK([Impact])),"",[Dernière révision]+IF(VALUE(LEFT([Probabilité],1))*VALUE(LEFT([Impact],1))>=8,7,30))
```

Each formula repeats the blank check instead of reading another calculated column. That keeps every result independent and blank whenever a rating is missing.

### 5.5 Expected results (use for the 25-combination test)

Score / level; **bold** = Signalement direction = Oui; † = review every 7 days.

| Impact \ Probabilité | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| **1** | 1 Très faible | 2 Très faible | 3 Très faible | 4 Faible | 5 Faible |
| **2** | 2 Très faible | 4 Faible | 6 Faible | 8 Moyen † | 10 Moyen † |
| **3** | 3 Très faible | 6 Faible | **9 Moyen †** | **12 Élevé †** | **15 Élevé †** |
| **4** | 4 Faible | 8 Moyen † | **12 Élevé †** | **16 Élevé †** | **20 Critique †** |
| **5** | **5 Faible** | **10 Moyen †** | **15 Élevé †** | **20 Critique †** | **25 Critique †** |

## 6. Reference list: *Référence – Grille d'impact*

1. *New → List → Blank list*, named **Référence – Grille d'impact**.
2. Add columns, using the same internal-name rule:

   | Create as | Rename to | Type |
   | --- | --- | --- |
   | `Title` (exists) | Libellé | Text, e.g. `4 - Majeur` |
   | `ScaleType` | Échelle | Choice: `Probabilité`, `Impact`, `Cause` |
   | `Rating` | Cote | Number 1–5, 0 decimals (blank for causes) |
   | `GuideText` | Description | Multiple lines, plain |
   | `CostGuide` | Coût | Multiple lines, plain (impact rows only) |
   | `DelayGuide` | Délai | Multiple lines, plain |
   | `QualityGuide` | Qualité | Multiple lines, plain |
   | `HSGuide` | Santé et sécurité | Multiple lines, plain |
   | `ReputationGuide` | Réputation | Multiple lines, plain |

3. **Content: 19 rows.**
   - **5 Probabilité rows:** management supplies the wording. Draft to propose: 1 < 10 %, 2 = 10–30 %, 3 = 30–50 %, 4 = 50–80 %, 5 > 80 % or already occurred.
   - **5 Impact rows:** management supplies the cost and delay thresholds plus the quality, H&S and reputation wording.
   - **9 Cause rows:** use the descriptions Simon provided (the same text as the form footer in step 8.4).
4. **View *Par échelle*:** group by Échelle, sort by Cote.
5. **Permissions:** stop inheriting. Register users get **Read**; the designated owner(s) get **Edit**.
6. Copy the list URL; the form footer links to it.

## 7. List validation

*List settings → Validation settings.* There is a single formula per list. It can reference choice, text, number, date and Yes/No columns, but **not Person or Lookup columns**. So *Propriétaire* (and *Projet*, if it is a Lookup) can't be enforced natively; Phase 2 enforces them in the form.

### 7.1 Stage A: enable at go-live (after step 10.1)

```
=AND(
OR([Risque ou enjeu]<>"Enjeu",LEFT([Probabilité],1)="5"),
OR([Statut]<>"Fermé",NOT(ISBLANK([Date de fermeture])),[Exception historique]=TRUE)
)
```

Remove the line breaks when pasting. User message:

```
Enregistrement refusé : un enjeu doit avoir une probabilité de 5 (Presque certain), et un élément fermé doit avoir une date de fermeture.
```

### 7.2 Stage B: enable after the 69 active records are reassessed

Stage B adds the required fields for active records. Enabling it earlier would block every edit of an active record that hasn't been rated yet. Turn it on when the *À recoter* view (step 9) is empty.

```
=AND(
OR([Risque ou enjeu]<>"Enjeu",LEFT([Probabilité],1)="5"),
OR([Statut]<>"Fermé",NOT(ISBLANK([Date de fermeture])),[Exception historique]=TRUE),
OR([Statut]<>"Actif",AND(NOT(ISBLANK([Titre])),NOT(ISBLANK([Risque ou enjeu])),NOT(ISBLANK([Cause])),NOT(ISBLANK([Probabilité])),NOT(ISBLANK([Impact])),NOT(ISBLANK([Stratégie de réponse]))))
)
```

- **Projet:** if it is a Choice column, add `NOT(ISBLANK([Projet]))` to the last `AND`.
- **Message:**

  ```
  Enregistrement refusé : un enjeu doit avoir une probabilité de 5 ; un élément fermé doit avoir une date de fermeture ; un élément actif doit avoir titre, risque/enjeu, cause, probabilité, impact et stratégie de réponse.
  ```

**How the historical exception works.**
- **Closed records:** a closed record never has to meet the "active" requirements. The exception flag only exempts it from the closure date.
- **Reopened records:** if one is reopened (Statut → Actif), the active requirements apply automatically.
- **Closing it again:** clear *Exception historique* manually (Phase 2 does it automatically), and a closure date becomes mandatory.

## 8. Native form

Open any item → *Edit form* (pencil icon, top right).

### 8.1 Fields shown

Use *Edit columns*:
- **Hide:** *Exception historique*, *Titre (ancien)* if it exists, and any obsolete columns.
- **Order:** Projet, Titre, Risque ou enjeu, Cause, Détails, Statut, Probabilité, Impact, Coût ($), Délai (jours), Qualité, Santé et sécurité, Réputation, Propriétaire, Stratégie de réponse, Détails de la stratégie, Répondant direction, Dernière révision, Date de fermeture, Type, Indice de risque, Autres impacts, Comité opération.

Hiding a field preserves its value. It is display only, not protection.

### 8.2 Conditional formulas

*Edit columns → ⋮ next to the column → Edit conditional formula.* Use internal names, with `[$Statut]` and the others as found in step 1:

| Column | Formula |
| --- | --- |
| Répondant direction | `=if(Number(substring([$RiskImpact],0,1)) == 5 \|\| (Number(substring([$RiskImpact],0,1)) >= 3 && Number(substring([$RiskProbability],0,1)) >= 3), 'true', 'false')` |
| Date de fermeture | `=if([$Statut] == 'Fermé', 'true', 'false')` |
| Type | `=if([$Type] == '', 'false', 'true')` |
| Indice de risque | `=if([$<internal name>] == '', 'false', 'true')` |
| Autres impacts | `=if([$<internal name>] == '', 'false', 'true')` |

In the table, `\|\|` is `||`; type it without the backslashes. The historical fields then appear only on records that have a value.

### 8.3 Header and sections

*Edit form → Configure layout → Header*. Replace `[$Title]` if the title field's internal name differs:

```json
{
  "elmType": "div",
  "style": { "display": "flex", "align-items": "center", "width": "100%", "padding": "8px 0 12px", "margin-bottom": "12px", "border-bottom": "1px solid #edebe9" },
  "children": [
    {
      "elmType": "div",
      "style": { "flex": "1", "font-size": "20px", "font-weight": "600" },
      "txtContent": "=if([$Title] == '', 'Nouveau risque ou enjeu', [$Title])"
    },
    {
      "elmType": "div",
      "style": {
        "padding": "2px 12px", "border-radius": "12px", "font-weight": "600",
        "background-color": "=if([$RiskLevel] == 'Critique', '#C93636', if([$RiskLevel] == 'Élevé', '#EA7317', if([$RiskLevel] == 'Moyen', '#F2C744', if([$RiskLevel] == 'Faible', '#15803D', if([$RiskLevel] == 'Très faible', '#86C79A', '#EDEBE9')))))",
        "color": "=if([$RiskLevel] == 'Moyen' || [$RiskLevel] == 'Très faible' || [$RiskLevel] == '', '#323130', '#FFFFFF')"
      },
      "txtContent": "=if([$RiskLevel] == '', 'Non évalué', [$RiskLevel] + ' · ' + [$RiskScore])"
    }
  ]
}
```

*Configure layout → Body*. Field names are **display names**:

```json
{
  "sections": [
    { "displayname": "Identification", "fields": ["Projet", "Titre", "Risque ou enjeu", "Cause", "Détails", "Statut"] },
    { "displayname": "Évaluation", "fields": ["Probabilité", "Impact", "Score", "Niveau", "Signalement direction"] },
    { "displayname": "Conséquences", "fields": ["Coût ($)", "Délai (jours)", "Qualité", "Santé et sécurité", "Réputation"] },
    { "displayname": "Réponse", "fields": ["Propriétaire", "Stratégie de réponse", "Détails de la stratégie", "Répondant direction"] },
    { "displayname": "Suivi", "fields": ["Dernière révision", "Prochaine révision", "Date de fermeture", "Comité opération"] },
    { "displayname": "Historique", "fields": ["Type", "Indice de risque", "Autres impacts"] }
  ]
}
```

Score, Niveau, Signalement direction and Prochaine révision are calculated, so they appear after the first save. That is expected in Phase 1; the live preview comes in Phase 2.

### 8.4 Footer: cause guide and reference link

This makes the cause definitions visible while choosing (Simon's requirement). Replace `<URL Référence>` with the URL from step 6.6.

```json
{
  "elmType": "div",
  "style": { "width": "100%", "padding": "12px 0", "font-size": "12px", "color": "#605e5c", "border-top": "1px solid #edebe9" },
  "children": [
    { "elmType": "div", "style": { "font-weight": "600", "margin-bottom": "6px", "color": "#323130" }, "txtContent": "Guide des causes" },
    { "elmType": "div", "txtContent": "Technique : conception incomplète, coordination interdisciplinaire, etc." },
    { "elmType": "div", "txtContent": "Gestion de projet : mauvaise planification, échéancier irréaliste, dérive de la portée, etc." },
    { "elmType": "div", "txtContent": "Contractuel / commercial : portée contractuelle mal définie, réclamations, litiges, etc." },
    { "elmType": "div", "txtContent": "Financier : dépassement de coûts, délai de financement, problème de liquidités, etc." },
    { "elmType": "div", "txtContent": "Chaîne d'approvisionnement : retard de livraison, fluctuation de prix, fournisseur unique, etc." },
    { "elmType": "div", "txtContent": "Construction : baisse de productivité, bris d'équipement, reprise de travaux, coordination des sous-traitants, retard de commande de matériel, qualité de la main-d'œuvre, etc." },
    { "elmType": "div", "txtContent": "Externe : météo, conditions environnementales, réglementation, capacité des services publics, etc." },
    { "elmType": "div", "txtContent": "Parties prenantes : changements du client, retards d'approbation, etc." },
    { "elmType": "div", "txtContent": "Santé, sécurité et environnement : accident, pollution, amendes de non-conformité, travail en hauteur, etc." },
    { "elmType": "a", "style": { "display": "block", "margin-top": "8px" }, "attributes": { "href": "<URL Référence>", "target": "_blank" }, "txtContent": "Consulter la grille de référence (probabilité et impact)" }
  ]
}
```

### 8.5 Niveau column formatting (views)

Use *Niveau column → Column settings → Format this column → Advanced mode*:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/sp/v2/column-formatting.schema.json",
  "elmType": "div",
  "style": {
    "padding": "2px 10px", "border-radius": "12px", "font-weight": "600", "display": "=if(@currentField == '', 'none', 'inline-block')",
    "background-color": "=if(@currentField == 'Critique', '#C93636', if(@currentField == 'Élevé', '#EA7317', if(@currentField == 'Moyen', '#F2C744', if(@currentField == 'Faible', '#15803D', '#86C79A'))))",
    "color": "=if(@currentField == 'Moyen' || @currentField == 'Très faible', '#323130', '#FFFFFF')"
  },
  "txtContent": "@currentField"
}
```

## 9. Views

Create each one as *Create new view → List*, public. Show these columns: Projet, Titre, Risque ou enjeu, Cause, Niveau, Score, Propriétaire, Stratégie de réponse, Prochaine révision, Statut.

| View | Filter | Sort / group |
| --- | --- | --- |
| **Comité d'opération** | Score ≥ 12 **AND** Statut = Actif. With D6 (manual override kept), use in this order: Score ≥ 12 **OR** Comité opération = Oui **AND** Statut = Actif | Group by Projet (expanded); sort Score descending |
| **Mes risques actifs** | Statut = Actif **AND** Propriétaire = `[Me]` | Score descending |
| **Révision échue** | Statut = Actif **AND** Prochaine révision ≤ `[Today]` | Prochaine révision ascending |
| **Signalement direction** | Statut = Actif **AND** Signalement direction = Oui | Group by Projet; Score descending |
| **À recoter** | Statut = Actif **AND** Score is equal to *(leave empty)* | Projet, then Titre |

- **No parentheses in view filters.** SharePoint applies the conditions in sequence. "Élevé OR Critique" is therefore written as the single condition **Score ≥ 12**, and "missing probability or impact" as **Score is empty**, because the score is blank exactly when a rating is missing.
- **Testing the D6 override:** check the OR/AND order with one test item of each kind.
- **Old view:** rename the old *Comité opération* view to *Comité opération (ancien)* until Simon retires it.
- **Per-project view** (no need for 53 views): use one link per project with a URL filter on the active view:

  ```
  https://lintendant1.sharepoint.com/sites/PMO/Lists/<list>/<Active view>.aspx?FilterField1=<Projet internal name>&FilterValue1=232408-Utile%20Saint-Sacrement
  ```

  Add it as a **Website** tab in the project's Teams channel, or as a link on the project's SharePoint page.
- **Indexes:** under *List settings → Indexed columns*, index **Statut**, **Projet** and **Propriétaire**.

## 10. Data preparation

### 10.1 Mark historical closed records (before stage A validation)

1. Temporarily show *Exception historique* in a personal view filtered on Statut = Fermé.
2. In *Edit in grid view*, set **Oui** on the first row. Copy the cell, select the rest of the column, and paste. That covers about 236 rows.
3. Check the count against the step 1 baseline, then remove the column from the view.

### 10.2 Cause pre-fill (after Simon validates the mapping)

| Old Type | Cause |
| --- | --- |
| Financier | Financier |
| Sous-traitant | Construction |
| Approvisionnement | Chaîne d'approvisionnement |
| Satisfaction client | Parties prenantes |
| Légal | Contractuel / commercial |
| Qualité / Échéancier / RH variants | Construction / Gestion de projet / Construction. **Active items: the PM confirms.** |
| Blank | Leave blank |

Fill it in grid view, sorted by Type. Keep *Type* unchanged.

### 10.3 Reassessment campaign (project managers)

- PMs work from the **À recoter** view, filling Risque ou enjeu, Cause, Probabilité, Impact, Stratégie de réponse, Propriétaire and Dernière révision.
- Simon assigns the 12 records without an owner.
- When À recoter is empty, enable stage B validation (7.2).

## 11. Phase 1 tests (in the test copy)

Record expected and actual results in the field dictionary workbook.

| Test | Expected |
| --- | --- |
| 25 rating combinations (grid-paste 25 rows) | Score, Niveau, Signalement direction and Prochaine révision match 5.5 |
| Missing rating | Score, Niveau and Prochaine révision blank; flag = Non; item appears in À recoter |
| Enjeu with probability 3 | Save rejected; with 5, it saves |
| Close without date (new record) | Rejected; with a date, it saves |
| Edit an old closed record (exception = Oui), no ratings, no closure date | Saves |
| Reopen that record (stage B on) | Rejected until the active fields are filled |
| Impact 2 → 3 with probability 2, then 3 | Répondant direction hidden, then shown |
| Impact 5, probability 1 | Score 5, Faible, flag = Oui, Répondant direction shown |
| Statut → Fermé | Date de fermeture appears |
| Hide a filled field (impact back to 2) | Répondant direction value kept after save |
| Délai −1 or 2.5 | Rejected |
| Coût blank vs 0 | Blank stays blank; 0 is stored as 0 |
| Views | Each view returns exactly the expected test items; committee grouping and sort correct |
| Grid edit that breaks a rule | Rejected, because validation applies to the grid too |
| Reader account | Can view; cannot edit the register or the reference list |

## 12. Review with Simon (Phase 1 review point)

Demonstrate in the test copy:
- the form;
- an Enjeu rejection;
- the flag on 1 × 5 and on 3 × 3;
- the closure-date rule;
- an old closed record saving;
- the five views;
- a per-project link.

Get decisions D2 (impact 4), D4, D5 and D6 confirmed before step 13.

## 13. Apply to production

The order avoids blocking users:

1. Backup (2.1). Announce a short configuration window.
2. Renames and clean-up (step 3).
3. New columns (step 4) and calculated columns (step 5). New columns don't appear in existing views automatically.
4. Reference list (step 6).
5. **Mark historical closed records (10.1).**
6. Stage A validation (7.1).
7. Form: hidden fields, conditional formulas, header, body and footer (step 8). Niveau formatting.
8. Views (step 9). Indexes.
9. Cause pre-fill (10.2), once validated.
10. Smoke test with an ordinary editor account: create, edit and close one test item, then delete it.
11. Start the reassessment campaign (10.3). After it is complete, enable stage B (7.2). The committee view is complete from that point.

## 14. Hand-over (Phase 1)

- **Field dictionary:** display name, internal name, type, choices, defaults, formulas and validation.
- **Form JSON:** header, body and footer, plus the Niveau formatting JSON and the view definitions.
- **Reference list:** content and permission owners.
- **Test results** (step 11) and the exception log.
- **Rollback note:**
  - The form JSON can be removed with *Configure layout → clear*.
  - Validation can be cleared.
  - New columns can be hidden without data loss.
  - Renamed labels can be reverted. Internal names never changed.
