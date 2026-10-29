# Risk and Issue Register: answers to your comments

Thank you for the review. Answers follow in document order. Items you marked "OK" are confirmed and simply listed.

## Questions

**1. "We already have an app for field users that includes Health and Safety tools. Are we going to be able to add the risk tool to this app?"**

Yes, if that app is a Power Apps canvas app in your Microsoft environment. We would add the risk screens to it, connected to the same three SharePoint lists. Field users would then see the same risks, ratings and journal as everyone else.

The SharePoint list form (Phase 2) and the field app are two separate apps. We would build the matrix and journal once as a shared component and reuse it in both, so the rules stay identical.

To confirm and estimate it, we need:
- the app's name and owner;
- whether it is a canvas app;
- edit access to it.

This would be an addition to Phase 2, estimated separately once we have seen the app. If the app is not a Power Apps app (a third-party product), we would add a link that opens the risk form instead.

**2. "For desktop users, will the app be available in Teams so users don't have to go to the Power Apps tool?"**

Yes. Users never need to open Power Apps itself:
- **Teams tab:** add the *Risques et enjeux* list as a **Lists** tab in a Teams channel. *New* and *Edit* open the list's form directly in Teams. That is the native form in Phase 1, and the custom Power Apps form automatically from Phase 2.
- **Project channels:** the same works with a per-project link (question 4).
- **SharePoint:** the form also opens from SharePoint as it does today.

**3. "Possible to have a view per project when you are in a particular project in Teams or SharePoint?"**

Yes, without creating 53 views. We use one filtered link per project: the same list and view, with the project filter built into the link. We add that link as a tab in the project's Teams channel, or on the project's SharePoint page, so users land directly on that project's risks.

**4. "Closure date required when moving to Fermé. Automatic?"**
- **Phase 1:** no. The native SharePoint form can't fill one field from another. The user enters the date, and saving without it is refused.
- **Phase 2:** yes. When the status changes to *Fermé*, the form fills in today's date automatically, and the user can change it (for example, closed last Friday).

**5. "What's the row limit? What is the row limit meaning for the parent list and the child list?"**

Two different limits matter:

1. **Power Apps data row limit: 500 by default, 2,000 maximum.** When a Power Apps search can't be run by SharePoint itself, Power Apps downloads only the first 500 (or 2,000) rows and searches inside them. Anything beyond is silently missed.
   - **Parent list (Risques et enjeux):** 305 records today. That is below the limit, but it will grow.
   - **Child list (Journal des interventions):** this one grows fastest, with one entry per update. With about 70 active risks reviewed weekly or monthly, plus the migrated comments, it will pass 2,000 entries within months.
   - **How we handle it:** the form always asks SharePoint for "the entries of risk #N, newest first". SharePoint runs that search on the server, so it is complete no matter how many entries exist. We test it with the limit artificially lowered to prove nothing is missed.
2. **SharePoint list view threshold: 5,000 items.** Beyond 5,000 items, SharePoint requires indexed columns for filtered views. We index the journal's link to the risk and its date from the start, so views and the form keep working as the journal grows.

## Points marked "not clear": explained with examples

**6. Historical exception (*LegacyClosedRecord*).**

Example: risk #12, *Manque de main-d'œuvre*, was closed in 2022. It has no probability, impact or closure date, because those fields didn't exist then.
- **The problem:** the new rules say "a closed item must have a closure date". Without an exception, correcting a typo in #12 would be refused until someone invents a closure date and a rating.
- **The fix:** at go-live we tick a hidden box, *Exception historique*, on the ~236 records that are already closed. Those records stay editable as they are.
- **Reopening:** if #12 is reopened (*Actif*), it must be fully rated like any active risk.
- **Visibility:** users never see the box.

We'll demonstrate this with real examples in the Phase 1 review.

**7. "SharePoint will store the calculated results; Power Apps will calculate a live preview."**

Example: a user changes Probability from 2 to 4 with Impact 3.
- **In Phase 1 (native form):** the Score (12) and Level (Élevé) appear after saving. SharePoint calculates and stores them, and the views, the committee filter and later reporting use these stored values.
- **In Phase 2 (Power Apps form):** the user sees 12 / Élevé immediately while clicking in the matrix, before saving. The form computes the same formula on screen.

After saving, we check that the on-screen value and the stored value are identical. That is part of the 25-combination test. The rules exist once; the form only shows them earlier.

**8. "OnEdit / OnView / clearing the state."**

This is internal to the Phase 2 form. For users, it means **each risk always opens clean**. One form serves every risk, so if a user opens risk A, clicks in the matrix, cancels, then opens risk B, nothing from A (selected rating, draft journal entry, error message) carries over to B. We test it explicitly.

## Decisions and confirmations

**9. Management flag: "CONFIRMED, but I don't want all the level 3 risks flagged to management, only those with moderate probability or higher."**

Understood. The rule we'll configure:

| Impact | Flagged to management when |
| --- | --- |
| 5 – Sévère | Always, whatever the probability |
| 4 – Majeur | Probability ≥ 3 (Modéré) — *please confirm: same as impact 3, or always flagged like impact 5?* |
| 3 – Modéré | Probability ≥ 3 (Modéré) |
| 1–2 | Never |

The *Répondant direction* field will appear only on flagged items, so project teams aren't asked for a management contact on items management won't see.

**10. Cause details: "This has to be available to the user to make his choice."**

Agreed:
- **Phase 1:** the descriptions you wrote appear in a *Guide des causes* section directly on the form, visible while choosing the cause. They are also stored in the reference list, so management can update the wording without changing the form.
- **Phase 2:** the description of the selected cause appears next to the field.

We'll correct two typos in the source text: *Chaîne* and *commande*.

**11. Cause mapping: "To be validated before implementation."**

Agreed. Before any pre-fill, we'll send you the list of active records with the proposed cause for each, for validation by the project managers. Closed records would receive the standard mapping only. Please confirm that closed records should be mapped, or left blank.

**12. Owners: "I will do the assignment before transfer."**

Noted. We'll provide the list of active records without an owner (12 at the 21 September baseline) so you can assign them.

**13. Review interval: one point to confirm.**

The document is inconsistent: the level table puts score 8 in *Moyen* (weekly review), but the acceptance table says "score ≥ 9 → 7 days". We propose **score ≥ 8 → weekly**, consistent with the levels. Please confirm.

**14. Current "Comité opération" checkbox.**

Today the committee view is driven by a manual Yes/No box. The new committee view selects active Élevé and Critique items automatically. We recommend keeping the box as a **manual override**, so management can add a specific lower-rated item to the agenda. Otherwise we retire it. Which do you prefer?

**Confirmed (OK):**
- Power BI, notifications and approval flows are out of scope for now.
- *Critique* is the label for 20–25.
- The display-name changes to existing fields.
- Blank cost ≠ zero cost, and delay is a whole number ≥ 0.
- Project managers reassess the 69 active records; the old index is not used to infer new ratings.

## One observation from the current list

In every view, the project column header currently reads **"25014 - Costco"**. The column's display name was changed by mistake at some point. The data is fine, and the Phase 1 rename to **Projet** corrects it.

---

**Next step:** the Phase 1 discovery and test copy. We'll come back with the demonstration (form, rules, views, historical examples) and need decisions 9 (impact 4), 11, 13 and 14 before applying the configuration to production.
