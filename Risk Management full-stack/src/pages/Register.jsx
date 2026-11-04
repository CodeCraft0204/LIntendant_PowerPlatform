import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { usePeople, useProjects, useRisks } from "../api/hooks.js"
import Icon from "../components/Icon.jsx"
import { RiskTable } from "../components/risk.jsx"
import { Alert, Page, PageHeader, PageSpinner, useDebounced } from "../components/ui.jsx"
import { CAUSES, LEVELS } from "../domain/rules.js"
import { matchesSearch, VIEW_BY_ID, VIEWS } from "../domain/views.js"
import { useI18n } from "../i18n/index.js"
import { useAuth } from "../lib/auth.jsx"
import { exportRisks } from "../lib/exportCsv.js"
import { can } from "../lib/roles.js"

// Filters live in the URL (?vue=comite&projet=25009…), so any view can be
// bookmarked or pinned as a Teams tab.
export function useRegisterFilters() {
  const [params, setParams] = useSearchParams()
  const set = (changes) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value === "" || value == null) next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true }
    )
  return {
    view: VIEW_BY_ID[params.get("vue")] ?? VIEW_BY_ID.actifs,
    q: params.get("q") ?? "",
    project: params.get("projet") ?? "",
    level: params.get("niveau") ?? "",
    cause: params.get("cause") ?? "",
    owner: params.get("proprietaire") ?? "",
    probability: params.get("p") ?? "",
    impact: params.get("i") ?? "",
    set,
  }
}

export function applyFilters(rows, filters) {
  return rows.filter((risk) => {
    if (filters.project && risk.project_number !== filters.project) return false
    if (filters.level === "none" ? risk.level != null : filters.level && risk.level !== filters.level) return false
    if (filters.cause === "none" ? risk.cause != null : filters.cause && risk.cause !== filters.cause) return false
    if (filters.owner === "none" ? risk.owner_id != null : filters.owner && risk.owner_id !== filters.owner) return false
    if (filters.probability && String(risk.probability) !== filters.probability) return false
    if (filters.impact && String(risk.impact) !== filters.impact) return false
    return true
  })
}

export default function Register() {
  const { t, labelOf } = useI18n()
  const { profile, role } = useAuth()
  const filters = useRegisterFilters()
  const { data: risks, isLoading, error } = useRisks()
  const { data: projects } = useProjects()
  const { data: people } = usePeople()
  const [search, setSearch] = useState(filters.q)
  const query = useDebounced(search)
  const [sort, setSort] = useState(null)

  const { view, project, level, cause, owner, probability, impact } = filters
  const base = useMemo(
    () =>
      risks ? applyFilters(risks, { project, level, cause, owner, probability, impact }).filter((risk) => matchesSearch(risk, query)) : [],
    [risks, project, level, cause, owner, probability, impact, query]
  )
  const counts = useMemo(
    () => Object.fromEntries(VIEWS.map((item) => [item.id, base.filter((risk) => item.filter(risk, { profileId: profile.id })).length])),
    [base, profile.id]
  )
  const rows = useMemo(() => base.filter((risk) => view.filter(risk, { profileId: profile.id })), [base, view, profile.id])
  const activeSort = sort ?? filters.view.sort

  const filtered = filters.project || filters.level || filters.cause || filters.owner || filters.probability || query
  const usedProjects = useMemo(() => {
    const numbers = new Set((risks ?? []).map((risk) => risk.project_number))
    return (projects ?? []).filter((item) => numbers.has(item.number))
  }, [risks, projects])

  return (
    <>
      <PageHeader
        eyebrow={t("register.eyebrow")}
        title={t("register.title")}
        subtitle={risks ? t("register.subtitle", { count: rows.length, view: t(`view.${filters.view.id}`) }) : t("common.loading")}
        actions={
          <>
            <button type="button" className="btn btn-secondary" disabled={!rows.length} onClick={() => exportRisks(rows, filters.view.id)}>
              <Icon name="download" />
              {t("common.export")}
            </button>
            {can.editRisks(role) && (
              <Link to={filters.project ? `/risques/nouveau?projet=${filters.project}` : "/risques/nouveau"} className="btn btn-primary">
                <Icon name="plus" />
                {t("common.new")}
              </Link>
            )}
          </>
        }
      />
      <Page>
        <div className="segmented" role="tablist" aria-label={t("register.views")}>
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === filters.view.id}
              onClick={() => {
                setSort(null)
                filters.set({ vue: item.id })
              }}
              title={item.hint ? t(`viewHint.${item.id}`) : undefined}
            >
              {t(`view.${item.id}`)}
              <span className="count">{counts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>
        {filters.view.hint && <p className="mt-2 text-xs text-muted">{t(`viewHint.${filters.view.id}`)}</p>}

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <label className="relative">
            <span className="sr-only">{t("common.search")}</span>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              type="search"
              placeholder={t("register.searchPlaceholder")}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                filters.set({ q: event.target.value })
              }}
            />
          </label>
          <select className="input" value={filters.project} onChange={(event) => filters.set({ projet: event.target.value })} aria-label={t("common.project")}>
            <option value="">{t("common.allProjects")}</option>
            {usedProjects.map((item) => (
              <option key={item.id} value={item.number}>
                {item.number} · {item.name}
              </option>
            ))}
          </select>
          <select className="input" value={filters.level} onChange={(event) => filters.set({ niveau: event.target.value })} aria-label={t("common.level")}>
            <option value="">{t("register.allLevels")}</option>
            {LEVELS.map((item) => (
              <option key={item.code} value={item.code}>
                {labelOf("level", item.code)}
              </option>
            ))}
            <option value="none">{t("common.notRated")}</option>
          </select>
          <select className="input" value={filters.cause} onChange={(event) => filters.set({ cause: event.target.value })} aria-label={t("risk.cause")}>
            <option value="">{t("register.allCauses")}</option>
            {CAUSES.map((item) => (
              <option key={item.code} value={item.code}>
                {labelOf("cause", item.code)}
              </option>
            ))}
            <option value="none">{t("register.noCause")}</option>
          </select>
          <select className="input" value={filters.owner} onChange={(event) => filters.set({ proprietaire: event.target.value })} aria-label={t("common.owner")}>
            <option value="">{t("register.allOwners")}</option>
            {(people ?? []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.full_name}
              </option>
            ))}
            <option value="none">{t("common.noOwner")}</option>
          </select>
        </div>

        {(filtered || filters.probability) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            {filters.probability && filters.impact && (
              <span className="pill">
                {t("register.cellChip", { p: filters.probability, i: filters.impact })}
                <button type="button" onClick={() => filters.set({ p: "", i: "" })} aria-label={t("register.removeCell")}>
                  <Icon name="close" className="size-3" />
                </button>
              </span>
            )}
            {filters.cause && filters.cause !== "none" && <span className="pill pill-muted">{labelOf("cause", filters.cause)}</span>}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch("")
                filters.set({ q: "", projet: "", niveau: "", cause: "", proprietaire: "", p: "", i: "" })
              }}
            >
              {t("common.clearFilters")}
            </button>
          </div>
        )}

        <div className="mt-4">
          <Alert>{error?.message}</Alert>
        </div>

        <section className="card mt-1 overflow-hidden">
          {isLoading ? (
            <PageSpinner />
          ) : (
            <RiskTable
              rows={rows}
              sort={activeSort}
              onSort={setSort}
              group={filters.view.group}
              emptyText={filters.view.id === "mes-risques" ? t("register.emptyMine") : t("register.empty")}
            />
          )}
        </section>
      </Page>
    </>
  )
}
