import { Fragment, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { IMPACTS, LEVEL_BY_CODE, levelOf, PROBABILITIES, STRATEGIES, labelOf } from "../domain/rules.js"
import { sortRisks } from "../domain/views.js"
import { formatDate, riskRef } from "../lib/format.js"
import Icon from "./Icon.jsx"

export function LevelBadge({ level, score, empty = "Non coté" }) {
  if (!level) return <span className="level" data-level="none">{empty}</span>
  return (
    <span className="level" data-level={level}>
      {LEVEL_BY_CODE[level].label}
      {score != null && <span className="opacity-80">· {score}</span>}
    </span>
  )
}

export function StatusPill({ status }) {
  return status === "ferme" ? <span className="pill pill-muted">Fermé</span> : <span className="pill">Actif</span>
}

export function KindTag({ kind }) {
  if (!kind) return null
  return kind === "enjeu" ? <span className="tag tag-enjeu">Enjeu</span> : <span className="tag">Risque</span>
}

// 5 × 5 matrix, impact on the vertical axis (5 at the top), probability on
// the horizontal one. Two uses:
//   counts  heat map of the active risks; a cell links to the filtered register
//   picker  the assessment control in the form (click a cell to rate)
export function RiskMatrix({ counts, cellHref, value, onChange, lockProbability, disabled, compact = false }) {
  const picker = Boolean(onChange)
  const impacts = [...IMPACTS].reverse()

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
      <div className="grid place-items-center">
        <span className="eyebrow [writing-mode:vertical-rl] rotate-180">Impact</span>
      </div>
      <div>
        <div className="matrix" role={picker ? "radiogroup" : "table"} aria-label="Matrice probabilité × impact">
          {impacts.map((impact) => (
            <Fragment key={impact.value}>
              <div className={`matrix-axis justify-items-end pr-1 ${compact ? "" : "min-w-[4.5rem]"}`}>
                <span className="text-right leading-tight">
                  <span className="block text-[13px] font-bold text-ink">{impact.value}</span>
                  {!compact && <span className="block text-[10px]">{impact.label}</span>}
                </span>
              </div>
              {PROBABILITIES.map((probability) => {
                const score = probability.value * impact.value
                const level = levelOf(score)
                const key = `${probability.value}-${impact.value}`
                const label = `Probabilité ${probability.value} (${probability.label}) × impact ${impact.value} (${impact.label}) = ${score}, ${LEVEL_BY_CODE[level].label}`

                if (picker) {
                  const selected = Number(value?.probability) === probability.value && Number(value?.impact) === impact.value
                  const blocked = disabled || (lockProbability && probability.value !== 5)
                  return (
                    <button
                      key={key}
                      type="button"
                      className="matrix-cell"
                      data-level={level}
                      aria-pressed={selected}
                      aria-label={label}
                      title={label}
                      disabled={blocked}
                      onClick={() => onChange({ probability: probability.value, impact: impact.value })}
                    >
                      {score}
                    </button>
                  )
                }

                const count = counts?.[key] ?? 0
                const content = count || "·"
                return cellHref && count ? (
                  <Link key={key} to={cellHref(probability.value, impact.value)} className="matrix-cell" data-level={level} data-strong={count > 0} title={`${label} : ${count} élément(s)`}>
                    {content}
                  </Link>
                ) : (
                  <div key={key} className="matrix-cell" data-level={level} data-empty={!count} title={`${label} : ${count} élément(s)`}>
                    {content}
                  </div>
                )
              })}
            </Fragment>
          ))}
          <div></div>
          {PROBABILITIES.map((probability) => (
            <div key={probability.value} className="matrix-axis pt-1">
              <span className="leading-tight">
                <span className="block text-[13px] font-bold text-ink">{probability.value}</span>
                {!compact && <span className="block text-[10px]">{probability.label}</span>}
              </span>
            </div>
          ))}
        </div>
        <p className="eyebrow mt-1.5 text-center">Probabilité</p>
      </div>
    </div>
  )
}

const PAGE_SIZE = 50

function SortButton({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey
  return (
    <button
      type="button"
      onClick={() => onSort({ key: sortKey, dir: active && sort.dir === "desc" ? "asc" : active ? "desc" : sortKey === "score" ? "desc" : "asc" })}
      aria-label={`Trier par ${label.toLowerCase()}`}
    >
      {label}
      {active && <Icon name={sort.dir === "desc" ? "chevron_down" : "chevron_up"} className="size-3" />}
    </button>
  )
}

// The register table. Rows open the record; grouping by project is used by
// the committee and management views.
export function RiskTable({ rows, sort, onSort, group = false, hideProject = false, emptyText = "Aucun élément." }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const sorted = useMemo(() => sortRisks(rows, sort), [rows, sort])

  // A new filter or view starts again at the first page.
  useEffect(() => {
    setPage(1)
  }, [rows])

  // Projects in number order; the chosen sort applies inside each group.
  const grouped = useMemo(() => {
    if (!group) return null
    const map = new Map()
    for (const risk of sorted) {
      const key = risk.project_number
      if (!map.has(key)) map.set(key, { number: risk.project_number, name: risk.project_name, rows: [] })
      map.get(key).rows.push(risk)
    }
    return [...map.values()].sort((a, b) => a.number.localeCompare(b.number, "fr", { numeric: true }))
  }, [sorted, group])

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const visible = group ? null : sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  if (!rows.length) return <p className="px-5 py-10 text-center text-sm text-muted">{emptyText}</p>

  const open = (risk) => navigate(`/risques/${risk.id}`)
  const columns = hideProject ? 6 : 7

  const renderRow = (risk) => (
    <tr
      key={risk.id}
      data-href
      onClick={(event) => {
        if (event.target.closest("a")) return
        if (event.metaKey || event.ctrlKey) window.open(`/risques/${risk.id}`, "_blank")
        else open(risk)
      }}
    >
      <td className="ref">{riskRef(risk.id)}</td>
      {!hideProject && (
        <td className="min-w-[7.5rem]">
          <span className="block font-semibold text-ink">{risk.project_number}</span>
          <span className="block max-w-[10rem] truncate text-xs text-muted">{risk.project_name}</span>
        </td>
      )}
      <td className="min-w-[16rem] max-w-[30rem]">
        <Link to={`/risques/${risk.id}`} className="clamp-2 font-medium text-ink hover:underline">
          {risk.title}
        </Link>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <KindTag kind={risk.kind} />
          {risk.exec_flag && risk.status === "actif" && (
            <span className="tag" title="Signalement direction">
              <Icon name="flag" className="mr-1 size-3" />
              Direction
            </span>
          )}
          {risk.committee_override && risk.status === "actif" && <span className="tag">Comité (manuel)</span>}
          {risk.attachment_count > 0 && (
            <span className="tag" title={`${risk.attachment_count} pièce(s) jointe(s)`}>
              <Icon name="paperclip" className="mr-0.5 size-3" />
              {risk.attachment_count}
            </span>
          )}
        </span>
      </td>
      <td>
        <LevelBadge level={risk.level} score={risk.score} />
      </td>
      <td className="whitespace-nowrap">{risk.owner_name ?? <span className="text-danger">Sans propriétaire</span>}</td>
      <td className="whitespace-nowrap">{labelOf(STRATEGIES, risk.response_strategy) || <span className="text-muted">—</span>}</td>
      <td className="whitespace-nowrap">
        {risk.status === "ferme" ? (
          <span className="pill pill-muted">Fermé{risk.closed_date ? ` le ${formatDate(risk.closed_date)}` : ""}</span>
        ) : (
          <span className={risk.review_overdue ? "font-semibold text-danger" : ""}>{formatDate(risk.next_review)}</span>
        )}
      </td>
    </tr>
  )

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>
                <SortButton label="Réf." sortKey="id" sort={sort} onSort={onSort} />
              </th>
              {!hideProject && (
                <th>
                  <SortButton label="Projet" sortKey="project" sort={sort} onSort={onSort} />
                </th>
              )}
              <th>
                <SortButton label="Titre" sortKey="title" sort={sort} onSort={onSort} />
              </th>
              <th>
                <SortButton label="Niveau" sortKey="score" sort={sort} onSort={onSort} />
              </th>
              <th>
                <SortButton label="Propriétaire" sortKey="owner" sort={sort} onSort={onSort} />
              </th>
              <th>Stratégie</th>
              <th>
                <SortButton label="Prochaine révision" sortKey="next_review" sort={sort} onSort={onSort} />
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped
              ? grouped.map((projectGroup) => (
                  <Fragment key={projectGroup.number}>
                    <tr className="group-row">
                      <td colSpan={columns}>
                        <Link to={`/projets/${projectGroup.number}`} className="hover:underline">
                          {projectGroup.number} · {projectGroup.name}
                        </Link>
                        <span className="ml-2 font-medium text-muted">{projectGroup.rows.length}</span>
                      </td>
                    </tr>
                    {projectGroup.rows.map(renderRow)}
                  </Fragment>
                ))
              : visible.map(renderRow)}
          </tbody>
        </table>
      </div>
      {!group && pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
          <span>
            {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, sorted.length)} sur {sorted.length}
          </span>
          <div className="flex gap-1">
            <button type="button" className="btn btn-secondary btn-sm btn-icon" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Page précédente">
              <Icon name="chevron_left" />
            </button>
            <button type="button" className="btn btn-secondary btn-sm btn-icon" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Page suivante">
              <Icon name="chevron_right" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
