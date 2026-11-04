import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { api, isDemo } from "../api/index.js"
import { useMembers, usePeople, useProjects, useRisks, useSavePerson, useSaveProject, useSaveSettings, useSetMemberAccess, useSettings } from "../api/hooks.js"
import Icon from "../components/Icon.jsx"
import { Alert, Card, Field, Page, PageHeader, PageSpinner, toast } from "../components/ui.jsx"
import { useI18n } from "../i18n/index.js"
import { useAuth } from "../lib/auth.jsx"
import { formatDate } from "../lib/format.js"
import { can, ROLES } from "../lib/roles.js"

function SettingsPanel() {
  const { t } = useI18n()
  const { role } = useAuth()
  const { settings, isLoading } = useSettings()
  const { data: risks } = useRisks()
  const save = useSaveSettings()
  const [draft, setDraft] = useState(settings)
  const [error, setError] = useState(null)
  const editable = can.changeSettings(role)

  useEffect(() => {
    setDraft(settings)
  }, [settings])
  if (isLoading) return <PageSpinner />

  const toRate = risks?.filter((risk) => risk.needs_rating).length ?? 0
  const changed = JSON.stringify(draft) !== JSON.stringify(settings)

  return (
    <form
      className="grid max-w-3xl gap-5"
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        try {
          await save.mutateAsync(draft)
          toast(t("admin.settingsSaved"))
        } catch (failure) {
          setError(failure.message)
        }
      }}
    >
      {!editable && <Alert tone="info">{t("admin.settingsLocked")}</Alert>}

      <Card title={t("admin.d2Title")}>
        <p className="mb-3 text-[13px] text-ink-2">{t("admin.d2Text")}</p>
        <div className="grid gap-2">
          <label className="check">
            <input type="radio" name="impact4" checked={!draft.flag_impact4_always} onChange={() => setDraft({ ...draft, flag_impact4_always: false })} disabled={!editable} />
            {t("admin.d2Like3")}
          </label>
          <label className="check">
            <input type="radio" name="impact4" checked={draft.flag_impact4_always} onChange={() => setDraft({ ...draft, flag_impact4_always: true })} disabled={!editable} />
            {t("admin.d2Like5")}
          </label>
        </div>
      </Card>

      <Card title={t("admin.d4Title")}>
        <Field label={t("admin.d4Label")} htmlFor="weekly" hint={t("admin.d4Hint")}>
          <select
            id="weekly"
            className="input max-w-xs"
            value={draft.weekly_review_min_score}
            onChange={(event) => setDraft({ ...draft, weekly_review_min_score: Number(event.target.value) })}
            disabled={!editable}
          >
            <option value={8}>{t("admin.d4Option8")}</option>
            <option value={9}>{t("admin.d4Option9")}</option>
            <option value={12}>{t("admin.d4Option12")}</option>
          </select>
        </Field>
      </Card>

      <Card title={t("admin.strictTitle")}>
        <label className="check items-start">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={draft.require_complete_active}
            onChange={(event) => setDraft({ ...draft, require_complete_active: event.target.checked })}
            disabled={!editable}
          />
          <span>
            {t("admin.strictLabelBefore")}
            <strong>{t("admin.strictLabelStrong")}</strong>
            {t("admin.strictLabelAfter")}
          </span>
        </label>
        <p className="mt-2 text-xs text-muted">{t("admin.strictHint")}</p>
        {draft.require_complete_active && toRate > 0 && (
          <div className="mt-3">
            <Alert tone="warn">{t("admin.strictWarn", { count: toRate })}</Alert>
          </div>
        )}
      </Card>

      <Alert>{error}</Alert>
      {editable && (
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={!changed || save.isPending}>
            {t("admin.saveSettings")}
          </button>
        </div>
      )}
    </form>
  )
}

function TeamPanel() {
  const { t } = useI18n()
  const { profile: me } = useAuth()
  const { data: members, isLoading } = useMembers()
  const setAccess = useSetMemberAccess()
  const [error, setError] = useState(null)

  if (isLoading) return <PageSpinner />

  const update = async (member, changes) => {
    setError(null)
    try {
      await setAccess.mutateAsync({ id: member.id, role: changes.role ?? member.role, active: changes.active ?? member.active })
      toast(t("admin.accessUpdated"))
    } catch (failure) {
      setError(failure.message)
    }
  }

  return (
    <div className="grid gap-4">
      {!isDemo && <Alert tone="info">{t("admin.inviteHelp")}</Alert>}
      <Alert>{error}</Alert>
      <section className="card overflow-hidden">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t("admin.member")}</th>
                <th>{t("admin.role")}</th>
                <th>{t("admin.access")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <span className="block font-semibold text-ink">{member.full_name || "—"}</span>
                    <span className="block text-xs text-muted">{member.email}</span>
                  </td>
                  <td>
                    <select
                      className="input w-auto"
                      value={member.role ?? ""}
                      onChange={(event) => update(member, { role: event.target.value || null })}
                      disabled={member.id === me.id}
                      aria-label={t("admin.roleOf", { name: member.full_name || member.email })}
                    >
                      <option value="">{t("admin.pendingRole")}</option>
                      {ROLES.map((code) => (
                        <option key={code} value={code}>
                          {t(`role.${code}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className="check">
                      <input type="checkbox" checked={member.active} onChange={(event) => update(member, { active: event.target.checked })} disabled={member.id === me.id} />
                      {member.active ? t("common.active") : t("common.paused")}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Card title={t("admin.roles")}>
        <dl className="grid gap-2 text-[13px] sm:grid-cols-[10rem_minmax(0,1fr)]">
          {ROLES.map((code) => (
            <div key={code} className="contents">
              <dt className="font-bold text-ink">{t(`role.${code}`)}</dt>
              <dd className="text-ink-2">{t(`roleDescription.${code}`)}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}

function DirectoryPanel({ kind }) {
  const { t } = useI18n()
  const people = usePeople()
  const projects = useProjects()
  const { data: risks } = useRisks()
  const savePerson = useSavePerson()
  const saveProject = useSaveProject()
  const [draft, setDraft] = useState({})
  const [error, setError] = useState(null)
  const [query, setQuery] = useState("")
  const isPeople = kind === "people"
  const { data: rows, isLoading } = isPeople ? people : projects
  const save = isPeople ? savePerson : saveProject

  const usage = useMemo(() => {
    const counts = new Map()
    for (const risk of risks ?? []) {
      if (risk.status !== "actif") continue
      const key = isPeople ? risk.owner_id : risk.project_id
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [risks, isPeople])

  if (isLoading) return <PageSpinner />

  const submit = async (record, message) => {
    setError(null)
    try {
      await save.mutateAsync(record)
      toast(message)
      return true
    } catch (failure) {
      setError(failure.message)
      return false
    }
  }

  const visible = rows.filter((row) => (isPeople ? row.full_name : `${row.number} ${row.name}`).toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="grid gap-4">
      <form
        className="card grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault()
          const ok = isPeople
            ? await submit({ full_name: draft.a ?? "", email: draft.b ?? "" }, t("admin.personAdded"))
            : await submit({ number: draft.a ?? "", name: draft.b ?? "" }, t("admin.projectAdded"))
          if (ok) setDraft({})
        }}
      >
        <Field label={isPeople ? t("admin.fullName") : t("admin.number")} htmlFor="new-a">
          <input id="new-a" className="input" value={draft.a ?? ""} onChange={(event) => setDraft({ ...draft, a: event.target.value })} required />
        </Field>
        <Field label={isPeople ? t("admin.emailLink") : t("admin.projectName")} htmlFor="new-b">
          <input id="new-b" className="input" type={isPeople ? "email" : "text"} value={draft.b ?? ""} onChange={(event) => setDraft({ ...draft, b: event.target.value })} />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          <Icon name="plus" />
          {t("common.add")}
        </button>
      </form>
      <Alert>{error}</Alert>
      <input
        className="input max-w-sm"
        type="search"
        placeholder={t("common.filterPlaceholder")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t("common.filter")}
      />
      <section className="card overflow-hidden">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{isPeople ? t("admin.person") : t("common.project")}</th>
                <th>{isPeople ? t("admin.account") : t("admin.name")}</th>
                <th className="num">{t("admin.activeItems")}</th>
                <th>{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold text-ink">{isPeople ? row.full_name : row.number}</td>
                  <td className="text-ink-2">
                    {isPeople ? (
                      row.profile_id ? (
                        <span className="pill">{t("admin.linked")}</span>
                      ) : (
                        <span className="text-muted">{row.email || t("admin.noAccount")}</span>
                      )
                    ) : (
                      row.name
                    )}
                  </td>
                  <td className="num">{usage.get(row.id) ?? 0}</td>
                  <td>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={row.active}
                        onChange={(event) => submit({ ...row, active: event.target.checked }, event.target.checked ? t("admin.reactivated") : t("admin.archivedToast"))}
                      />
                      {row.active ? t("common.active") : t("common.archived")}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function DataPanel() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { data: risks } = useRisks()
  const [busy, setBusy] = useState(false)
  const counts = {
    total: risks?.length ?? 0,
    legacy: risks?.filter((risk) => risk.legacy_created_at).length ?? 0,
    withId: risks?.filter((risk) => risk.legacy_sp_id).length ?? 0,
  }

  return (
    <div className="grid max-w-3xl gap-5">
      <Card title={t("admin.contents")}>
        <dl className="dl">
          <dt>{t("admin.items")}</dt>
          <dd>{counts.total}</dd>
          <dt>{t("admin.imported")}</dt>
          <dd>{counts.legacy}</dd>
          <dt>{t("admin.withId")}</dt>
          <dd>{counts.withId}</dd>
        </dl>
      </Card>
      {isDemo ? (
        <Card title={t("admin.demoTitle")}>
          <p className="text-[13px] leading-relaxed text-ink-2">
            {api.info().fromBackup ? t("admin.demoBackup", { date: formatDate(api.info().seedGeneratedAt) }) : t("admin.demoSample")} {t("admin.demoLocal")}
          </p>
          <button
            type="button"
            className="btn btn-danger mt-4"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(t("admin.demoConfirm"))) return
              setBusy(true)
              await api.reset()
              await queryClient.invalidateQueries()
              setBusy(false)
              toast(t("admin.demoReset"))
            }}
          >
            <Icon name="refresh" />
            {t("admin.demoResetButton")}
          </button>
        </Card>
      ) : (
        <Card title={t("admin.importTitle")}>
          <p className="text-[13px] leading-relaxed text-ink-2">{t("admin.importText")}</p>
        </Card>
      )}
    </div>
  )
}

const TABS = [
  { id: "parametres", allowed: () => true, render: () => <SettingsPanel /> },
  { id: "equipe", allowed: can.manageTeam, render: () => <TeamPanel /> },
  { id: "personnes", allowed: can.manageDirectory, render: () => <DirectoryPanel kind="people" /> },
  { id: "projets", allowed: can.manageDirectory, render: () => <DirectoryPanel kind="projects" /> },
  { id: "donnees", allowed: () => true, render: () => <DataPanel /> },
]

export default function Admin() {
  const { t } = useI18n()
  const { role } = useAuth()
  const tabs = TABS.filter((tab) => tab.allowed(role))
  const [tab, setTab] = useState(tabs[0].id)
  const current = tabs.find((item) => item.id === tab) ?? tabs[0]

  return (
    <>
      <PageHeader eyebrow={t("admin.title")} title={t("admin.title")} subtitle={t("admin.subtitle")} />
      <Page>
        <div className="segmented mb-5" role="tablist" aria-label={t("nav.sections")}>
          {tabs.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={item.id === current.id} onClick={() => setTab(item.id)}>
              {t(`admin.tabs.${item.id}`)}
            </button>
          ))}
        </div>
        {current.render()}
      </Page>
    </>
  )
}
