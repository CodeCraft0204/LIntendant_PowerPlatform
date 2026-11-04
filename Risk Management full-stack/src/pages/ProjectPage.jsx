import { useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { useProjects, useRisks } from "../api/hooks.js"
import Icon from "../components/Icon.jsx"
import { RiskMatrix, RiskTable } from "../components/risk.jsx"
import { Card, EmptyState, Page, PageHeader, PageSpinner, StatCard, toast } from "../components/ui.jsx"
import { useAuth } from "../lib/auth.jsx"
import { formatMoney } from "../lib/format.js"
import { can } from "../lib/roles.js"

const TABS = [
  { id: "actifs", label: "Actifs", filter: (risk) => risk.status === "actif", sort: { key: "score", dir: "desc" } },
  { id: "fermes", label: "Fermés", filter: (risk) => risk.status === "ferme", sort: { key: "closed", dir: "desc" } },
  { id: "tous", label: "Tous", filter: () => true, sort: { key: "id", dir: "desc" } },
]

// One project's register: the page to pin as a "Website" tab in the
// project's Teams channel (no need for one SharePoint view per project).
export default function ProjectPage() {
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
    for (const risk of active) if (risk.score) counts[`${risk.probability}-${risk.impact}`] = (counts[`${risk.probability}-${risk.impact}`] ?? 0) + 1
    return counts
  }, [active])
  const rows = useMemo(() => own.filter(tab.filter), [own, tab])

  if (isLoading || !risks) return <PageSpinner />
  if (!project) {
    return (
      <Page>
        <EmptyState icon="search" title="Projet introuvable" action={<Link to="/projets" className="btn btn-secondary">Tous les projets</Link>}>
          Aucun projet ne porte le numéro {number}.
        </EmptyState>
      </Page>
    )
  }

  const copyLink = async () => {
    const url = `${window.location.origin}/projets/${project.number}`
    try {
      await navigator.clipboard.writeText(url)
      toast("Lien du projet copié : collez-le dans un onglet Site web de Teams")
    } catch {
      window.prompt("Copiez le lien du projet :", url)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={`Projet ${project.number}`}
        title={project.name || project.number}
        subtitle={`${active.length} élément${active.length > 1 ? "s" : ""} actif${active.length > 1 ? "s" : ""} · ${own.length - active.length} fermé${own.length - active.length > 1 ? "s" : ""}`}
        back={{ to: "/projets", label: "Tous les projets" }}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={copyLink}>
              <Icon name="link_2" />
              Lien pour Teams
            </button>
            {can.editRisks(role) && (
              <Link to={`/risques/nouveau?projet=${project.number}`} className="btn btn-primary">
                <Icon name="plus" />
                Nouveau
              </Link>
            )}
          </>
        }
      />
      <Page>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Éléments actifs" value={active.length} sub={`${active.filter((risk) => risk.kind === "enjeu").length} enjeu(x)`} />
          <StatCard
            label="Critiques et élevés"
            value={active.filter((risk) => risk.level === "critique" || risk.level === "eleve").length}
            sub={`${active.filter((risk) => risk.in_committee).length} au comité d'opération`}
          />
          <StatCard label="Signalement direction" value={active.filter((risk) => risk.exec_flag).length} sub={`${active.filter((risk) => risk.needs_rating).length} à recoter`} />
          <StatCard label="Coût estimé" value={formatMoney(active.reduce((sum, risk) => sum + Number(risk.cost ?? 0), 0))} sub="Éléments actifs" />
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card title="Matrice du projet">
            <RiskMatrix compact counts={matrix} cellHref={(probability, impact) => `/risques?vue=actifs&projet=${project.number}&p=${probability}&i=${impact}`} />
          </Card>
          <section className="card overflow-hidden">
            <header className="card-head">
              <div className="segmented" role="tablist" aria-label="Filtre">
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
                    {item.label}
                    <span className="count">{own.filter(item.filter).length}</span>
                  </button>
                ))}
              </div>
            </header>
            <RiskTable rows={rows} sort={sort ?? tab.sort} onSort={setSort} hideProject emptyText="Aucun élément pour ce projet." />
          </section>
        </div>
      </Page>
    </>
  )
}
