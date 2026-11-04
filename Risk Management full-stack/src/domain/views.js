// The register's saved views: the five operational views of the plan, plus
// active, closed and everything. Each has a filter, a default sort and,
// for the committee and management views, grouping by project.

// Labels and hints: src/i18n, keys view.<id> and viewHint.<id>.
export const VIEWS = [
  { id: "actifs", filter: (risk) => risk.status === "actif", sort: { key: "score", dir: "desc" } },
  { id: "comite", hint: true, filter: (risk) => risk.in_committee, sort: { key: "score", dir: "desc" }, group: true },
  {
    id: "mes-risques",
    hint: true,
    filter: (risk, context) => risk.status === "actif" && Boolean(context.profileId) && risk.owner_profile_id === context.profileId,
    sort: { key: "score", dir: "desc" },
  },
  { id: "revision-echue", hint: true, filter: (risk) => risk.review_overdue, sort: { key: "next_review", dir: "asc" } },
  { id: "direction", hint: true, filter: (risk) => risk.status === "actif" && risk.exec_flag, sort: { key: "score", dir: "desc" }, group: true },
  { id: "a-recoter", hint: true, filter: (risk) => risk.needs_rating, sort: { key: "project", dir: "asc" } },
  { id: "fermes", filter: (risk) => risk.status === "ferme", sort: { key: "closed", dir: "desc" } },
  { id: "tous", filter: () => true, sort: { key: "id", dir: "desc" } },
]

export const VIEW_BY_ID = Object.fromEntries(VIEWS.map((view) => [view.id, view]))

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true })

const SORTERS = {
  id: (risk) => risk.id,
  project: (risk) => `${risk.project_number} ${risk.title}`,
  title: (risk) => risk.title,
  score: (risk) => risk.score ?? -1,
  owner: (risk) => risk.owner_name ?? "",
  next_review: (risk) => risk.next_review ?? "9999",
  status: (risk) => risk.status,
  closed: (risk) => risk.closed_date ?? risk.legacy_modified_at ?? "",
  updated: (risk) => risk.updated_at ?? "",
}

export function sortRisks(rows, { key, dir }) {
  const pick = SORTERS[key] ?? SORTERS.id
  const factor = dir === "desc" ? -1 : 1
  return [...rows].sort((a, b) => {
    const x = pick(a)
    const y = pick(b)
    const order = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y))
    return order * factor || a.id - b.id
  })
}

export function matchesSearch(risk, query) {
  if (!query) return true
  const haystack = [
    risk.title,
    risk.details,
    risk.project_number,
    risk.project_name,
    risk.owner_name,
    risk.strategy_details,
    risk.legacy_type,
    `R-${String(risk.id).padStart(4, "0")}`,
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
  return query
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word))
}
