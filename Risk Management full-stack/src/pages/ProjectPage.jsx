import { useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { useProjects, useRisks } from "../api/hooks.js"
import Icon from "../components/Icon.jsx"
import { RiskMatrix, RiskTable } from "../components/risk.jsx"
import { Card, EmptyState, Page, PageHeader, PageSpinner, StatCard, toast } from "../components/ui.jsx"
import { useI18n } from "../i18n/index.js"
import { useAuth } from "../lib/auth.jsx"
import { formatMoney } from "../lib/format.js"
import { can } from "../lib/roles.js"

const TABS = [
  { id: "actifs", view: "actifs", filter: (risk) => risk.status === "actif", sort: { key: "score", dir: "desc" } },
  { id: "fermes", view: "fermes", filter: (risk) => risk.status === "ferme", sort: { key: "closed", dir: "desc" } },
  { id: "tous", view: "tous", filter: () => true, sort: { key: "id", dir: "desc" } },
]

// One project's register: the page to pin as a "Website" tab in the
// project's Teams channel (no need for one SharePoint view per project).
export default function ProjectPage() {
  const { t } = useI18n()
  const { number } = useParams()
  const { role } = useAuth()
  const { data: projects, isLoading } = useProjects()
  const { data: risks } = useRisks()
  const [tab, setTab] = useState(TABS[0])
  const [sort, setSort] = useState(null)

  const project = projects?.find((item) => item.number === number)
  const own = useMemo(() => (risks ?? []).filter((risk) => risk.project_number === number), [risks, number])
  const active = own.filter((risk) => risk.status === "actif")
  const matrix = useMemo(() => {
    const counts = {}
    for (const risk of own) {
      if (risk.status === "actif" && risk.score) counts[`${risk.probability}-${risk.impact}`] = (counts[`${risk.probability}-${risk.impact}`] ?? 0) + 1
    }
    return counts
  }, [own])
  const rows = useMemo(() => own.filter(tab.filter), [own, tab])

  if (isLoading || !risks) return <PageSpinner />
  if (!project) {
    return (
      <Page>
        <EmptyState
          icon="search"
          title={t("project.notFoundTitle")}
          action={
            <Link to="/projets" className="btn btn-secondary">
              {t("common.allProjects")}
            </Link>
          }
        >
          {t("project.notFoundText", { number })}
        </EmptyState>
      </Page>
    )
  }

  const copyLink = async () => {
    const url = `${window.location.origin}/projets/${project.number}`
    try {
      await navigator.clipboard.writeText(url)
      toast(t("project.copied"))
    } catch {
      window.prompt(t("project.copyPrompt"), url)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t("project.eyebrow", { number: project.number })}
        title={project.name || project.number}
        subtitle={t("project.subtitle", { active: active.length, closed: own.length - active.length })}
        back={{ to: "/projets", label: t("common.allProjects") }}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={copyLink}>
              <Icon name="link_2" />
              {t("project.teamsLink")}
            </button>
            {can.editRisks(role) && (
              <Link to={`/risques/nouveau?projet=${project.number}`} className="btn btn-primary">
                <Icon name="plus" />
                {t("common.new")}
              </Link>
            )}
          </>
        }
      />
      <Page>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={t("dashboard.active")} value={active.length} sub={t("project.issues", { count: active.filter((risk) => risk.kind === "enjeu").length })} />
          <StatCard
            label={t("dashboard.high")}
            value={active.filter((risk) => risk.level === "critique" || risk.level === "eleve").length}
            sub={t("dashboard.highSub", { count: active.filter((risk) => risk.in_committee).length })}
          />
          <StatCard
            label={t("dashboard.flagged")}
            value={active.filter((risk) => risk.exec_flag).length}
            sub={t("project.toRate", { count: active.filter((risk) => risk.needs_rating).length })}
          />
          <StatCard
            label={t("risk.estimatedCost")}
            value={formatMoney(active.reduce((sum, risk) => sum + Number(risk.cost ?? 0), 0))}
            sub={t("project.activeItems")}
          />
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card title={t("project.matrix")}>
            <RiskMatrix compact counts={matrix} cellHref={(probability, impact) => `/risques?vue=actifs&projet=${project.number}&p=${probability}&i=${impact}`} />
          </Card>
          <section className="card overflow-hidden">
            <header className="card-head">
              <div className="segmented" role="tablist" aria-label={t("common.filter")}>
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={item.id === tab.id}
                    onClick={() => {
                      setTab(item)
                      setSort(null)
                    }}
                  >
                    {t(`view.${item.view}`)}
                    <span className="count">{own.filter(item.filter).length}</span>
                  </button>
                ))}
              </div>
            </header>
            <RiskTable rows={rows} sort={sort ?? tab.sort} onSort={setSort} hideProject emptyText={t("project.empty")} />
          </section>
        </div>
      </Page>
    </>
  )
}
