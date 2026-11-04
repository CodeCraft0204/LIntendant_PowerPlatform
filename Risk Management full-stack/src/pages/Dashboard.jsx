import { useMemo } from "react"
import { Link } from "react-router"
import { useRecentEvents, useRisks, useSettings } from "../api/hooks.js"
import { EventItem } from "../components/events.jsx"
import Icon from "../components/Icon.jsx"
import { LevelBadge, RiskMatrix } from "../components/risk.jsx"
import { Alert, Card, Page, PageHeader, Skeleton, StatCard } from "../components/ui.jsx"
import { LEVELS, todayISO } from "../domain/rules.js"
import { useI18n } from "../i18n/index.js"
import { useAuth } from "../lib/auth.jsx"
import { formatDate, formatInt, formatMoney } from "../lib/format.js"
import { can } from "../lib/roles.js"

const rank = { critique: 5, eleve: 4, moyen: 3, faible: 2, tres_faible: 1 }

function summarize(risks) {
  const active = risks.filter((risk) => risk.status === "actif")
  const rated = active.filter((risk) => risk.score != null)
  const matrix = {}
  for (const risk of rated) matrix[`${risk.probability}-${risk.impact}`] = (matrix[`${risk.probability}-${risk.impact}`] ?? 0) + 1

  const byProject = new Map()
  for (const risk of active) {
    const entry = byProject.get(risk.project_number) ?? {
      number: risk.project_number,
      name: risk.project_name,
      active: 0,
      high: 0,
      flagged: 0,
      toRate: 0,
      cost: 0,
      top: null,
    }
    entry.active += 1
    if (risk.level === "critique" || risk.level === "eleve") entry.high += 1
    if (risk.exec_flag) entry.flagged += 1
    if (risk.needs_rating) entry.toRate += 1
    entry.cost += Number(risk.cost ?? 0)
    if (risk.level && (!entry.top || rank[risk.level] > rank[entry.top.level] || (risk.level === entry.top.level && risk.score > entry.top.score))) {
      entry.top = { level: risk.level, score: risk.score }
    }
    byProject.set(risk.project_number, entry)
  }

  return {
    active,
    rated,
    matrix,
    enjeux: active.filter((risk) => risk.kind === "enjeu").length,
    high: active.filter((risk) => risk.level === "critique" || risk.level === "eleve").length,
    committee: active.filter((risk) => risk.in_committee).length,
    flagged: active.filter((risk) => risk.exec_flag).length,
    overdue: active.filter((risk) => risk.review_overdue).length,
    toRate: active.filter((risk) => risk.needs_rating).length,
    withoutOwner: active.filter((risk) => !risk.owner_id).length,
    cost: active.reduce((sum, risk) => sum + Number(risk.cost ?? 0), 0),
    levels: LEVELS.map((level) => ({ ...level, count: active.filter((risk) => risk.level === level.code).length })),
    projects: [...byProject.values()].sort((a, b) => b.high - a.high || b.flagged - a.flagged || b.cost - a.cost || b.active - a.active),
  }
}

export default function Dashboard() {
  const { t } = useI18n()
  const { role } = useAuth()
  const { data: risks, isLoading, error } = useRisks()
  const { settings } = useSettings()
  const { data: events } = useRecentEvents()
  const stats = useMemo(() => (risks ? summarize(risks) : null), [risks])

  const ratedShare = stats && stats.active.length ? Math.round(((stats.active.length - stats.toRate) / stats.active.length) * 100) : 0
  const maxLevel = stats ? Math.max(1, ...stats.levels.map((level) => level.count), stats.toRate) : 1

  return (
    <>
      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle", { date: formatDate(todayISO()) })}
        actions={
          can.editRisks(role) && (
            <Link to="/risques/nouveau" className="btn btn-primary">
              <Icon name="plus" />
              {t("dashboard.newItem")}
            </Link>
          )
        }
      />
      <Page>
        <Alert>{error?.message}</Alert>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {stats ? (
            <>
              <StatCard
                label={t("dashboard.active")}
                value={formatInt(stats.active.length)}
                sub={t("dashboard.activeSub", { issues: stats.enjeux, projects: new Set(stats.active.map((risk) => risk.project_number)).size })}
                to="/risques?vue=actifs"
              />
              <StatCard
                label={t("dashboard.high")}
                value={formatInt(stats.high)}
                sub={t("dashboard.highSub", { count: stats.committee })}
                to="/risques?vue=comite"
                tone={stats.high ? "danger" : undefined}
              />
              <StatCard label={t("dashboard.flagged")} value={formatInt(stats.flagged)} sub={t("dashboard.flaggedSub")} to="/risques?vue=direction" />
              <StatCard
                label={t("dashboard.overdue")}
                value={formatInt(stats.overdue)}
                sub={t("dashboard.overdueSub")}
                to="/risques?vue=revision-echue"
                tone={stats.overdue ? "danger" : undefined}
              />
              <StatCard label={t("dashboard.toRate")} value={formatInt(stats.toRate)} sub={t("dashboard.toRateSub", { pct: ratedShare })} to="/risques?vue=a-recoter">
                <div className="progress" aria-hidden="true">
                  <span style={{ width: `${ratedShare}%` }}></span>
                </div>
              </StatCard>
            </>
          ) : (
            Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="card stat">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-16" />
                <Skeleton className="mt-3 h-3 w-32" />
              </div>
            ))
          )}
        </div>

        {stats && stats.toRate > 0 && !settings.require_complete_active && (
          <div className="mt-4">
            <Alert tone="info">
              <strong>{t("dashboard.campaignTitle")}</strong> {t("dashboard.campaignText", { count: stats.toRate })}{" "}
              {stats.withoutOwner > 0 && `${t("dashboard.campaignOwners", { count: stats.withoutOwner })} `}
              <Link to="/risques?vue=a-recoter" className="link">
                {t("dashboard.campaignLink")}
              </Link>
            </Alert>
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-5">
          <Card
            className="lg:col-span-3"
            title={t("dashboard.matrix")}
            actions={<span className="text-xs text-muted">{stats ? t("dashboard.rated", { count: stats.rated.length }) : ""}</span>}
          >
            <RiskMatrix counts={stats?.matrix} cellHref={(probability, impact) => `/risques?vue=actifs&p=${probability}&i=${impact}`} />
            <p className="mt-4 text-xs leading-relaxed text-muted">{t("dashboard.matrixNote", { threshold: settings.weekly_review_min_score })}</p>
          </Card>

          <div className="grid gap-5 lg:col-span-2">
            <Card title={t("dashboard.levels")}>
              <ul className="grid gap-2.5">
                {(stats?.levels ?? LEVELS.map((level) => ({ ...level, count: 0 }))).map((level) => (
                  <li key={level.code} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-3">
                    <LevelBadge level={level.code} />
                    <span className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)] shadow-[inset_0_0_0_1px_var(--line)]">
                      <span className="block h-full rounded-full" style={{ width: `${(level.count / maxLevel) * 100}%`, background: `var(--lvl-${level.code})` }}></span>
                    </span>
                    <span className="text-right text-sm font-bold tabular-nums text-ink">{level.count}</span>
                  </li>
                ))}
                <li className="grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-3">
                  <LevelBadge level={null} />
                  <span className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)] shadow-[inset_0_0_0_1px_var(--line)]">
                    <span className="block h-full rounded-full bg-[var(--line-strong)]" style={{ width: `${((stats?.toRate ?? 0) / maxLevel) * 100}%` }}></span>
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-ink">{stats?.toRate ?? 0}</span>
                </li>
              </ul>
            </Card>
            <StatCard label={t("dashboard.cost")} value={stats ? formatMoney(stats.cost) : "…"} sub={t("dashboard.costSub")} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-5">
          <Card
            className="lg:col-span-3"
            title={t("dashboard.exposed")}
            bodyClassName=""
            actions={
              <Link to="/projets" className="link text-xs">
                {t("dashboard.allProjects")}
              </Link>
            }
          >
            {isLoading ? (
              <div className="grid gap-3 p-5">
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("common.project")}</th>
                      <th className="num">{t("dashboard.colActive")}</th>
                      <th className="num">{t("dashboard.colHigh")}</th>
                      <th className="num">{t("dashboard.colFlag")}</th>
                      <th>{t("dashboard.colMax")}</th>
                      <th className="num">{t("dashboard.colCost")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.projects.slice(0, 8).map((project) => (
                      <tr key={project.number}>
                        <td>
                          <Link to={`/projets/${project.number}`} className="font-semibold text-ink hover:underline">
                            {project.number}
                          </Link>
                          <span className="block max-w-[14rem] truncate text-xs text-muted">{project.name}</span>
                        </td>
                        <td className="num">{project.active}</td>
                        <td className="num font-semibold text-ink">{project.high || "—"}</td>
                        <td className="num">{project.flagged || "—"}</td>
                        <td>{project.top ? <LevelBadge level={project.top.level} score={project.top.score} /> : <LevelBadge level={null} />}</td>
                        <td className="num">{formatMoney(project.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2" title={t("dashboard.activity")}>
            {events?.length ? (
              <ul className="timeline">
                {events.map((event) => (
                  <EventItem key={event.id} event={event} showRisk />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t("dashboard.activityEmpty")}</p>
            )}
          </Card>
        </div>
      </Page>
    </>
  )
}
