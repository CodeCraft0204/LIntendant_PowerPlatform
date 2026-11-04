// Assessment rules of the risk register (Phase 1).
//
// One source for the browser: the form's live preview, the demo backend and
// the validation messages all use these functions. The database applies the
// same rules in supabase/migrations (generated score and level, the
// risk_exec_flag / risk_next_review functions and the risks_before_write
// trigger); scripts/test-db.mjs checks that both agree on all 25 ratings.

export const PROBABILITIES = [
  { value: 1, label: "Très improbable" },
  { value: 2, label: "Improbable" },
  { value: 3, label: "Modéré" },
  { value: 4, label: "Probable" },
  { value: 5, label: "Presque certain" },
]

export const IMPACTS = [
  { value: 1, label: "Négligeable" },
  { value: 2, label: "Mineur" },
  { value: 3, label: "Modéré" },
  { value: 4, label: "Majeur" },
  { value: 5, label: "Sévère" },
]

// Bands confirmed by Simon (D1). Only products of two ratings are possible
// scores, so 7, 11, 13, 14, 17–19 and 21–24 never occur.
export const LEVELS = [
  { code: "critique", label: "Critique", min: 20 },
  { code: "eleve", label: "Élevé", min: 12 },
  { code: "moyen", label: "Moyen", min: 8 },
  { code: "faible", label: "Faible", min: 4 },
  { code: "tres_faible", label: "Très faible", min: 1 },
]

export const LEVEL_BY_CODE = Object.fromEntries(LEVELS.map((level) => [level.code, level]))

export const KINDS = [
  { code: "risque", label: "Risque", hint: "Événement incertain qui pourrait survenir." },
  { code: "enjeu", label: "Enjeu", hint: "Événement déjà survenu : la probabilité est fixée à 5." },
]

export const STATUSES = [
  { code: "actif", label: "Actif" },
  { code: "ferme", label: "Fermé" },
]

export const STRATEGIES = [
  { code: "eviter", label: "Éviter" },
  { code: "attenuer", label: "Atténuer" },
  { code: "transferer", label: "Transférer" },
  { code: "accepter", label: "Accepter" },
]

// Simon's definitions, with the two typos of the source corrected.
export const CAUSES = [
  { code: "technique", label: "Technique", hint: "Conception incomplète, coordination interdisciplinaire, etc." },
  { code: "gestion_projet", label: "Gestion de projet", hint: "Mauvaise planification, échéancier irréaliste, dérive de la portée, etc." },
  { code: "contractuel", label: "Contractuel / commercial", hint: "Portée contractuelle mal définie, réclamations, litiges, etc." },
  { code: "financier", label: "Financier", hint: "Dépassement de coûts, délai de financement, problème de liquidités, etc." },
  { code: "approvisionnement", label: "Chaîne d'approvisionnement", hint: "Retard de livraison, fluctuation de prix, fournisseur unique, etc." },
  {
    code: "construction",
    label: "Construction",
    hint: "Baisse de productivité, bris d'équipement, reprise de travaux, coordination des sous-traitants, retard de commande de matériel, qualité de la main-d'œuvre, etc.",
  },
  { code: "externe", label: "Externe", hint: "Météo, conditions environnementales, réglementation, capacité des services publics, etc." },
  { code: "parties_prenantes", label: "Parties prenantes", hint: "Changements du client, retards d'approbation, etc." },
  { code: "sst", label: "Santé, sécurité et environnement", hint: "Accident, pollution, amendes de non-conformité, travail en hauteur, etc." },
]

// Proposed mapping from the old "Type" (to be validated by Simon, D5). Only
// the standard rows may be pre-filled automatically; the others are reviewed
// by the project manager.
export const LEGACY_TYPE_TO_CAUSE = {
  Financier: { cause: "financier", review: false },
  "Sous-traitant": { cause: "construction", review: false },
  Approvisionnement: { cause: "approvisionnement", review: false },
  "Satisfaction client": { cause: "parties_prenantes", review: false },
  Légal: { cause: "contractuel", review: false },
  Qualité: { cause: "construction", review: true },
  Échéancier: { cause: "gestion_projet", review: true },
  "RH LIntendant": { cause: "construction", review: true },
  "RH LInterndant": { cause: "construction", review: true },
}

// Decisions still open with Simon are settings, not code: D2 (impact 4) and
// D4 (weekly review threshold), plus the switch for the strict "active record
// must be complete" rule once the reassessment campaign is finished.
export const DEFAULT_SETTINGS = {
  weekly_review_min_score: 8,
  flag_impact4_always: false,
  require_complete_active: false,
}

export const labelOf = (list, code) => list.find((item) => item.code === code || item.value === code)?.label ?? ""

export function scoreOf(probability, impact) {
  const p = Number(probability)
  const i = Number(impact)
  if (!p || !i) return null
  return p * i
}

export function levelOf(score) {
  if (!score) return null
  return LEVELS.find((level) => score >= level.min)?.code ?? null
}

// Management flag (D2): impact 5 always; impact 3–4 when the probability is
// "Modéré" (3) or higher; impact 4 always if the setting says so.
export function execFlagOf(probability, impact, settings = DEFAULT_SETTINGS) {
  const p = Number(probability) || null
  const i = Number(impact) || null
  if (!i) return false
  if (i === 5) return true
  if (i === 4 && settings.flag_impact4_always) return true
  if (!p) return false
  return i >= 3 && p >= 3
}

// Review interval (D4): weekly from the threshold score, monthly below it.
export function reviewIntervalDays(score, settings = DEFAULT_SETTINGS) {
  if (!score) return null
  return score >= settings.weekly_review_min_score ? 7 : 30
}

// Dates travel as "YYYY-MM-DD" strings, read as calendar days (no time zone).
export function addDays(isoDate, days) {
  if (!isoDate || days == null) return null
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return next.toISOString().slice(0, 10)
}

export function todayISO(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function nextReviewOf(lastReview, score, settings = DEFAULT_SETTINGS) {
  if (!lastReview || !score) return null
  return addDays(lastReview, reviewIntervalDays(score, settings))
}

// Everything the register derives from a stored risk. The database view
// risk_register returns the same fields.
export function derive(risk, settings = DEFAULT_SETTINGS, today = todayISO()) {
  const score = scoreOf(risk.probability, risk.impact)
  const level = levelOf(score)
  const exec_flag = execFlagOf(risk.probability, risk.impact, settings)
  const next_review = nextReviewOf(risk.last_review, score, settings)
  const active = risk.status === "actif"
  return {
    score,
    level,
    exec_flag,
    next_review,
    needs_rating: active && score == null,
    in_committee: active && ((score ?? 0) >= 12 || Boolean(risk.committee_override)),
    review_overdue: active && next_review != null && next_review <= today,
  }
}

// Validation shared by the form and the demo backend. Returns
// { field: message }; empty when the record can be saved.
//
// - An "enjeu" has already happened, so its probability is 5.
// - A closed record has a closure date, unless it was closed before the
//   upgrade (legacy_closed_record).
// - New active records are complete. Records imported from SharePoint are
//   held to the same rule only once `require_complete_active` is switched on
//   (after the reassessment campaign, like "stage B" in the SharePoint plan).
export function validateRisk(values, { isNew = false, settings = DEFAULT_SETTINGS, legacyClosed = false } = {}) {
  const errors = {}
  const missing = "Champ obligatoire."

  if (!values.project_id) errors.project_id = missing
  if (!String(values.title ?? "").trim()) errors.title = missing

  if (values.kind === "enjeu" && values.probability && Number(values.probability) !== 5) {
    errors.probability = "Un enjeu est un événement survenu : sa probabilité est 5 (Presque certain)."
  }

  if (values.status === "ferme" && !values.closed_date && !legacyClosed) {
    errors.closed_date = "Un élément fermé doit avoir une date de fermeture."
  }

  if (values.delay_days !== "" && values.delay_days != null) {
    const delay = Number(values.delay_days)
    if (!Number.isInteger(delay) || delay < 0) errors.delay_days = "Le délai doit être un nombre entier positif ou nul."
  }

  if (values.cost !== "" && values.cost != null && (Number.isNaN(Number(values.cost)) || Number(values.cost) < 0)) {
    errors.cost = "Le coût doit être un montant positif ou nul."
  }

  const strict = values.status === "actif" && (isNew || settings.require_complete_active)
  if (strict) {
    for (const field of ["kind", "cause", "owner_id", "probability", "impact", "response_strategy"]) {
      if (!values[field]) errors[field] = missing
    }
  }

  return errors
}

// French messages for the errors the database can return (check constraints
// and the trigger's hints), so a rule broken outside the form still reads well.
export const DB_ERRORS = {
  enjeu_probability: "Enregistrement refusé : un enjeu doit avoir une probabilité de 5 (Presque certain).",
  closed_needs_date: "Enregistrement refusé : un élément fermé doit avoir une date de fermeture.",
  incomplete_active:
    "Enregistrement refusé : un élément actif doit avoir risque/enjeu, cause, propriétaire, probabilité, impact et stratégie de réponse.",
  risks_delay_days_check: "Le délai doit être un nombre entier positif ou nul.",
  risks_cost_check: "Le coût doit être un montant positif ou nul.",
}
