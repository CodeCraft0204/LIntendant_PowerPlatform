// Builds src/demo/seed.generated.json for the offline demo mode (no Supabase
// needed) from the SharePoint backup exports, plus one clearly labelled
// example project with rated risks so the matrix and views have content.
//
//   npm run demo:seed
//   npm run demo:seed -- --full "<full export.csv>" --ids "<export with ID.csv>"
//
// The generated file holds client data and is git-ignored.

import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { loadLegacy, printReport } from "./lib/legacy.mjs"
import { defaultSources } from "./lib/sources.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const args = process.argv.slice(2)
const option = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

const sources = defaultSources(root)
const full = resolve(option("full") ?? sources.full)
const ids = option("ids") ? resolve(option("ids")) : sources.ids
if (!existsSync(full)) {
  console.error(`Full export not found: ${full}\nPass it with --full "<file.csv>".`)
  process.exit(1)
}

const legacy = loadLegacy({ full, ids, mapCauses: false })
printReport(legacy)

const today = new Date().toISOString().slice(0, 10)
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

// People and projects
const people = legacy.people.map((full_name) => ({ id: randomUUID(), full_name, email: null, profile_id: null, active: true }))
const personByName = new Map(people.map((person) => [person.full_name.toLowerCase(), person]))
const projects = legacy.projects.map((project) => ({ id: randomUUID(), number: project.number, name: project.name, active: true }))
const projectByNumber = new Map(projects.map((project) => [project.number, project]))

// Demo accounts: one per role. Simon and Isabelle are linked to their person
// so "Mes risques actifs" shows their records.
const profile = (full_name, email, role) => ({ id: randomUUID(), full_name, email, role, active: true })
const profiles = [
  profile("Administrateur démo", "admin@demo.lintendant", "admin"),
  profile("Simon Tremblay", "simon@demo.lintendant", "direction"),
  profile("Isabelle Leboeuf", "isabelle@demo.lintendant", "gestion"),
  profile("Lecteur démo", "lecteur@demo.lintendant", "lecteur"),
]
for (const account of profiles) {
  const person = personByName.get(account.full_name.toLowerCase())
  if (person) person.profile_id = account.id
}

let nextId = 1
const blank = {
  kind: null,
  cause: null,
  details: "",
  probability: null,
  impact: null,
  quality_impact: "",
  hs_impact: "",
  reputation_impact: "",
  response_strategy: null,
  exec_contact_id: null,
  last_review: null,
  closed_date: null,
}

const risks = legacy.records
  .sort((a, b) => (a.legacy_created_at ?? "").localeCompare(b.legacy_created_at ?? ""))
  .map((record) => ({
    ...blank,
    id: nextId++,
    project_id: projectByNumber.get(record.project.number).id,
    title: record.title,
    status: record.status,
    cost: record.cost,
    delay_days: record.delay_days,
    owner_id: record.owner_name ? personByName.get(record.owner_name.toLowerCase())?.id ?? null : null,
    strategy_details: record.strategy_details,
    committee_override: record.committee_override,
    legacy_closed_record: record.legacy_closed_record,
    legacy_sp_id: record.legacy_sp_id,
    legacy_type: record.legacy_type,
    legacy_risk_index: record.legacy_risk_index,
    legacy_other_impacts: record.legacy_other_impacts,
    legacy_created_by: record.legacy_created_by,
    legacy_created_at: record.legacy_created_at,
    legacy_modified_by: record.legacy_modified_by,
    legacy_modified_at: record.legacy_modified_at,
    created_at: record.legacy_created_at,
    updated_at: record.legacy_modified_at ?? record.legacy_created_at,
  }))

// Example project (fictional data, labelled as such in the title).
const example = { id: randomUUID(), number: "00000", name: "Projet exemple (démonstration)", active: true }
projects.unshift(example)
const isabelle = personByName.get("isabelle leboeuf")?.id ?? null
const simon = personByName.get("simon tremblay")?.id ?? null
const samples = [
  ["Retard de livraison des fenêtres", "enjeu", "approvisionnement", 5, 4, "attenuer", 120000, 30, 3],
  ["Sol contaminé possible lors de l'excavation", "risque", "externe", 3, 5, "transferer", 250000, 20, 12],
  ["Dépassement du budget de béton", "risque", "financier", 4, 3, "attenuer", 80000, null, 9],
  ["Pénurie de main-d'œuvre qualifiée en finition", "risque", "construction", 3, 3, "attenuer", 40000, 15, 2],
  ["Changements tardifs demandés par le client", "risque", "parties_prenantes", 4, 2, "accepter", 25000, 10, 40],
  ["Gel au sol en début de saison", "risque", "externe", 2, 2, "accepter", 10000, 5, 6],
  ["Travail en hauteur près des lignes électriques", "risque", "sst", 1, 5, "eviter", null, null, 4],
  ["Coordination des entraves avec la Ville", "risque", "gestion_projet", 1, 2, "accepter", 0, 2, 35],
]
for (const [title, kind, cause, probability, impact, strategy, cost, delay, reviewedDaysAgo] of samples) {
  risks.push({
    ...blank,
    id: nextId++,
    project_id: example.id,
    title: `${title} (exemple)`,
    kind,
    cause,
    status: "actif",
    probability,
    impact,
    cost,
    delay_days: delay,
    owner_id: impact >= 4 ? simon : isabelle,
    response_strategy: strategy,
    strategy_details: "Données fictives pour la démonstration.",
    exec_contact_id: impact >= 4 ? simon : null,
    last_review: daysAgo(reviewedDaysAgo),
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
    created_at: `${daysAgo(reviewedDaysAgo + 10)}T09:00:00-05:00`,
    updated_at: `${daysAgo(reviewedDaysAgo)}T09:00:00-05:00`,
  })
}

const output = join(root, "src", "demo", "seed.generated.json")
mkdirSync(dirname(output), { recursive: true })
writeFileSync(
  output,
  JSON.stringify({ generated_at: today, source: { full, ids: ids ?? null }, profiles, people, projects, risks }, null, 0)
)
console.log(`\nWrote ${output}\n  ${risks.length} risks (${samples.length} fictional examples), ${projects.length} projects, ${people.length} people`)
