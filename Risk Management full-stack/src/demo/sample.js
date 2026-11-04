// Fallback data for the demo mode when src/demo/seed.generated.json has not
// been built (npm run demo:seed builds it from the SharePoint backup).
// Everything here is fictional.

const project = { id: "demo-project-1", number: "00000", name: "Projet exemple (démonstration)", active: true }
const people = [
  { id: "demo-person-1", full_name: "Simon Tremblay", email: null, profile_id: "demo-direction", active: true },
  { id: "demo-person-2", full_name: "Isabelle Leboeuf", email: null, profile_id: "demo-gestion", active: true },
]

const base = {
  details: "",
  quality_impact: "",
  hs_impact: "",
  reputation_impact: "",
  strategy_details: "Données fictives pour la démonstration.",
  exec_contact_id: null,
  closed_date: null,
  committee_override: false,
  legacy_closed_record: false,
  legacy_sp_id: null,
  legacy_type: null,
  legacy_risk_index: null,
  legacy_other_impacts: null,
  legacy_created_by: null,
  legacy_created_at: null,
  legacy_modified_by: null,
  legacy_modified_at: null,
  created_at: "2026-10-20T09:00:00-04:00",
  updated_at: "2026-10-20T09:00:00-04:00",
}

export default {
  generated_at: null,
  source: null,
  profiles: [
    { id: "demo-admin", full_name: "Administrateur démo", email: "admin@demo.lintendant", role: "admin", active: true },
    { id: "demo-direction", full_name: "Simon Tremblay", email: "simon@demo.lintendant", role: "direction", active: true },
    { id: "demo-gestion", full_name: "Isabelle Leboeuf", email: "isabelle@demo.lintendant", role: "gestion", active: true },
    { id: "demo-lecteur", full_name: "Lecteur démo", email: "lecteur@demo.lintendant", role: "lecteur", active: true },
  ],
  people,
  projects: [project],
  risks: [
    { ...base, id: 1, project_id: project.id, title: "Retard de livraison des fenêtres (exemple)", kind: "enjeu", cause: "approvisionnement", status: "actif", probability: 5, impact: 4, cost: 120000, delay_days: 30, owner_id: "demo-person-1", response_strategy: "attenuer", last_review: "2026-10-20" },
    { ...base, id: 2, project_id: project.id, title: "Dépassement du budget de béton (exemple)", kind: "risque", cause: "financier", status: "actif", probability: 4, impact: 3, cost: 80000, delay_days: null, owner_id: "demo-person-2", response_strategy: "attenuer", last_review: "2026-10-28" },
    { ...base, id: 3, project_id: project.id, title: "Coordination des entraves avec la Ville (exemple)", kind: null, cause: null, status: "actif", probability: null, impact: null, cost: 0, delay_days: null, owner_id: null, response_strategy: null, last_review: null, legacy_created_at: "2026-08-01T09:00:00-04:00" },
  ],
}
