import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { useProjects, useRisks } from "../api/hooks.js"
import Icon from "../components/Icon.jsx"
import { LevelBadge } from "../components/risk.jsx"
import { Alert, Page, PageHeader, PageSpinner } from "../components/ui.jsx"
import { matchesSearch } from "../domain/views.js"
import { useI18n } from "../i18n/index.js"
import { formatMoney } from "../lib/format.js"

const rank = { critique: 5, eleve: 4, moyen: 3, faible: 2, tres_faible: 1 }

export function projectStats(projects, risks) {
  const stats = new Map(
    projects.map((project) => [project.number, { ...project, active: 0, closed: 0, high: 0, flagged: 0, toRate: 0, overdue: 0, cost: 0, top: null }])
  )
  for (const risk of risks) {
    const entry = stats.get(risk.project_number)
    if (!entry) continue
    if (risk.status === "ferme") {
      entry.closed += 1
      continue
    }
    entry.active += 1
    entry.cost += Number(risk.cost ?? 0)
    if (risk.level === "critique" || risk.level === "eleve") entry.high += 1
    if (risk.exec_flag) entry.flagged += 1
    if (risk.needs_rating) entry.toRate += 1
    if (risk.review_overdue) entry.overdue += 1
    if (risk.level && (!entry.top || rank[risk.level] > rank[entry.top.level] || (risk.level === entry.top.level && risk.score > entry.top.score))) {
      entry.top = { level: risk.level, score: risk.score }
    }
  }
  return [...stats.values()]
}

export default function Projects() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: projects, isLoading, error } = useProjects()
  const { data: risks } = useRisks()
  const [query, setQuery] = useState("")
  const [onlyActive, setOnlyActive] = useState(true)

  const rows = useMemo(() => {
    if (!projects || !risks) return []
    return projectStats(projects, risks)
      .filter((project) => !onlyActive || project.active > 0)
      .filter((project) => matchesSearch({ id: 0, title: project.name, project_number: project.number }, query))
      .sort((a, b) => b.high - a.high || b.active - a.active || a.number.localeCompare(b.number, "fr", { numeric: true }))
  }, [projects, risks, onlyActive, query])

  return (
    <>
      <PageHeader eyebrow={t("projects.eyebrow")} title={t("projects.title")} subtitle={t("projects.subtitle")} />
      <Page>
        <Alert>{error?.message}</Alert>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[16rem] flex-1 sm:max-w-sm">
            <span className="sr-only">{t("projects.search")}</span>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" type="search" placeholder={t("projects.searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={onlyActive} onChange={(event) => setOnlyActive(event.target.checked)} />
            {t("projects.onlyActive")}
          </label>
        </div>

        <section className="card overflow-hidden">
          {isLoading || !risks ? (
            <PageSpinner />
          ) : rows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("common.project")}</th>
                    <th className="num">{t("dashboard.colActive")}</th>
                    <th className="num">{t("dashboard.colHigh")}</th>
                    <th className="num">{t("dashboard.colFlag")}</th>
                    <th className="num">{t("projects.colToRate")}</th>
                    <th className="num">{t("projects.colOverdue")}</th>
                    <th>{t("dashboard.colMax")}</th>
                    <th className="num">{t("dashboard.colCost")}</th>
                    <th className="num">{t("projects.colClosed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((project) => (
                    <tr key={project.id} data-href onClick={() => navigate(`/projets/${project.number}`)}>
                      <td>
                        <Link to={`/projets/${project.number}`} className="font-semibold text-ink hover:underline">
                          {project.number}
                        </Link>
                        <span className="block max-w-[18rem] truncate text-xs text-muted">{project.name}</span>
                      </td>
                      <td className="num font-semibold text-ink">{project.active}</td>
                      <td className="num">{project.high || "—"}</td>
                      <td className="num">{project.flagged || "—"}</td>
                      <td className="num">{project.toRate || "—"}</td>
                      <td className={`num ${project.overdue ? "font-semibold text-danger" : ""}`}>{project.overdue || "—"}</td>
                      <td>{project.active ? <LevelBadge level={project.top?.level} score={project.top?.score} /> : <span className="text-muted">—</span>}</td>
                      <td className="num">{project.active ? formatMoney(project.cost) : "—"}</td>
                      <td className="num text-muted">{project.closed || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">{t("projects.empty")}</p>
          )}
        </section>
      </Page>
    </>
  )
}
