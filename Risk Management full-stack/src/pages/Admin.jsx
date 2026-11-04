import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { api, isDemo } from "../api/index.js"
import { useMembers, usePeople, useProjects, useRisks, useSavePerson, useSaveProject, useSaveSettings, useSetMemberAccess, useSettings } from "../api/hooks.js"
import Icon from "../components/Icon.jsx"
import { Alert, Card, Field, Page, PageHeader, PageSpinner, toast } from "../components/ui.jsx"
import { useAuth } from "../lib/auth.jsx"
import { formatDate } from "../lib/format.js"
import { can, ROLES } from "../lib/roles.js"

function SettingsPanel() {
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
          toast("Paramètres enregistrés")
        } catch (failure) {
          setError(failure.message)
        }
      }}
    >
      {!editable && <Alert tone="info">Seules la direction et l'administration peuvent modifier ces paramètres.</Alert>}

      <Card title="Signalement direction (décision D2)">
        <p className="mb-3 text-[13px] text-ink-2">Impact 5 : toujours signalé. Impact 3 : signalé si la probabilité est de 3 ou plus. Et l'impact 4 ?</p>
        <div className="grid gap-2">
          <label className="check">
            <input type="radio" name="impact4" checked={!draft.flag_impact4_always} onChange={() => setDraft({ ...draft, flag_impact4_always: false })} disabled={!editable} />
            Comme l'impact 3 : signalé si la probabilité est de 3 ou plus
          </label>
          <label className="check">
            <input type="radio" name="impact4" checked={draft.flag_impact4_always} onChange={() => setDraft({ ...draft, flag_impact4_always: true })} disabled={!editable} />
            Comme l'impact 5 : toujours signalé
          </label>
        </div>
      </Card>

      <Card title="Fréquence de révision (décision D4)">
        <Field label="Révision hebdomadaire à partir du score" htmlFor="weekly" hint="Sous ce score, la révision est mensuelle (30 jours).">
          <select
            id="weekly"
            className="input max-w-xs"
            value={draft.weekly_review_min_score}
            onChange={(event) => setDraft({ ...draft, weekly_review_min_score: Number(event.target.value) })}
            disabled={!editable}
          >
            <option value={8}>8 (le niveau Moyen au complet)</option>
            <option value={9}>9 (le tableau d'acceptation du plan)</option>
            <option value={12}>12 (Élevé et Critique seulement)</option>
          </select>
        </Field>
      </Card>

      <Card title="Validation complète des éléments actifs">
        <label className="check items-start">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={draft.require_complete_active}
            onChange={(event) => setDraft({ ...draft, require_complete_active: event.target.checked })}
            disabled={!editable}
          />
          <span>
            Exiger une cote complète (risque/enjeu, cause, propriétaire, probabilité, impact, stratégie) pour enregistrer <strong>tout</strong> élément actif, y compris
            ceux repris de SharePoint.
          </span>
        </label>
        <p className="mt-2 text-xs text-muted">Les nouveaux éléments sont toujours complets. À activer quand la vue À recoter est vide (l'« étape B » du plan).</p>
        {draft.require_complete_active && toRate > 0 && (
          <div className="mt-3">
            <Alert tone="warn">
              {toRate} élément{toRate > 1 ? "s" : ""} actif{toRate > 1 ? "s" : ""} n'{toRate > 1 ? "ont" : "a"} pas encore de cote. Une fois cette option activée, on ne
              pourra plus les modifier sans les coter au complet.
            </Alert>
          </div>
        )}
      </Card>

      <Alert>{error}</Alert>
      {editable && (
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={!changed || save.isPending}>
            Enregistrer les paramètres
          </button>
        </div>
      )}
    </form>
  )
}

function TeamPanel() {
  const { profile: me } = useAuth()
  const { data: members, isLoading } = useMembers()
  const setAccess = useSetMemberAccess()
  const [error, setError] = useState(null)

  if (isLoading) return <PageSpinner />

  const update = async (member, changes) => {
    setError(null)
    try {
      await setAccess.mutateAsync({ id: member.id, role: changes.role ?? member.role, active: changes.active ?? member.active })
      toast("Accès mis à jour")
    } catch (failure) {
      setError(failure.message)
    }
  }

  return (
    <div className="grid gap-4">
      {!isDemo && (
        <Alert tone="info">
          Pour ajouter quelqu'un : invitez son courriel dans Supabase (<em>Authentication › Users › Invite user</em>) ou laissez-le se connecter avec son compte
          Microsoft. Il apparaît ici sans rôle ; choisissez-en un pour lui ouvrir le registre.
        </Alert>
      )}
      <Alert>{error}</Alert>
      <section className="card overflow-hidden">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Rôle</th>
                <th>Accès</th>
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
                      aria-label={`Rôle de ${member.full_name || member.email}`}
                    >
                      <option value="">En attente (aucun rôle)</option>
                      {Object.entries(ROLES).map(([code, item]) => (
                        <option key={code} value={code}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className="check">
                      <input type="checkbox" checked={member.active} onChange={(event) => update(member, { active: event.target.checked })} disabled={member.id === me.id} />
                      {member.active ? "Actif" : "Suspendu"}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Card title="Rôles">
        <dl className="grid gap-2 text-[13px] sm:grid-cols-[10rem_minmax(0,1fr)]">
          {Object.values(ROLES).map((item) => (
            <div key={item.label} className="contents">
              <dt className="font-bold text-ink">{item.label}</dt>
              <dd className="text-ink-2">{item.description}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}

function DirectoryPanel({ kind }) {
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
            ? await submit({ full_name: draft.a ?? "", email: draft.b ?? "" }, "Personne ajoutée")
            : await submit({ number: draft.a ?? "", name: draft.b ?? "" }, "Projet ajouté")
          if (ok) setDraft({})
        }}
      >
        <Field label={isPeople ? "Nom complet" : "Numéro"} htmlFor="new-a">
          <input id="new-a" className="input" value={draft.a ?? ""} onChange={(event) => setDraft({ ...draft, a: event.target.value })} required />
        </Field>
        <Field label={isPeople ? "Courriel (lie la personne à son compte)" : "Nom du projet"} htmlFor="new-b">
          <input id="new-b" className="input" type={isPeople ? "email" : "text"} value={draft.b ?? ""} onChange={(event) => setDraft({ ...draft, b: event.target.value })} />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          <Icon name="plus" />
          Ajouter
        </button>
      </form>
      <Alert>{error}</Alert>
      <input className="input max-w-sm" type="search" placeholder="Filtrer…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Filtrer" />
      <section className="card overflow-hidden">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{isPeople ? "Personne" : "Projet"}</th>
                <th>{isPeople ? "Compte" : "Nom"}</th>
                <th className="num">Éléments actifs</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold text-ink">{isPeople ? row.full_name : row.number}</td>
                  <td className="text-ink-2">
                    {isPeople ? (
                      row.profile_id ? (
                        <span className="pill">Lié à un compte</span>
                      ) : (
                        <span className="text-muted">{row.email || "Aucun compte"}</span>
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
                        onChange={(event) => submit({ ...row, active: event.target.checked }, event.target.checked ? "Réactivé" : "Archivé")}
                      />
                      {row.active ? "Actif" : "Archivé"}
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
      <Card title="Contenu du registre">
        <dl className="dl">
          <dt>Éléments</dt>
          <dd>{counts.total}</dd>
          <dt>Repris de SharePoint</dt>
          <dd>{counts.legacy}</dd>
          <dt>Avec ID SharePoint</dt>
          <dd>{counts.withId}</dd>
        </dl>
      </Card>
      {isDemo ? (
        <Card title="Mode démonstration">
          <p className="text-[13px] leading-relaxed text-ink-2">
            {api.info().fromBackup
              ? `Données reprises de la sauvegarde SharePoint (préparées le ${formatDate(api.info().seedGeneratedAt)}), plus un projet exemple fictif.`
              : "Données fictives d'exemple. Lancez « npm run demo:seed » pour charger la sauvegarde SharePoint."}{" "}
            Les modifications restent dans ce navigateur.
          </p>
          <button
            type="button"
            className="btn btn-danger mt-4"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("Effacer toutes les modifications faites dans la démonstration ?")) return
              setBusy(true)
              await api.reset()
              await queryClient.invalidateQueries()
              setBusy(false)
              toast("Démonstration réinitialisée")
            }}
          >
            <Icon name="refresh" />
            Réinitialiser la démonstration
          </button>
        </Card>
      ) : (
        <Card title="Reprise des données SharePoint">
          <p className="text-[13px] leading-relaxed text-ink-2">
            La reprise se fait une fois, depuis un poste de confiance : <code>npm run import:legacy -- --apply</code> (voir le README). Elle est sans risque à relancer :
            les éléments déjà repris sont ignorés.
          </p>
        </Card>
      )}
    </div>
  )
}

const TABS = [
  { id: "parametres", label: "Paramètres", allowed: () => true, render: () => <SettingsPanel /> },
  { id: "equipe", label: "Équipe", allowed: can.manageTeam, render: () => <TeamPanel /> },
  { id: "personnes", label: "Personnes", allowed: can.manageDirectory, render: () => <DirectoryPanel kind="people" /> },
  { id: "projets", label: "Projets", allowed: can.manageDirectory, render: () => <DirectoryPanel kind="projects" /> },
  { id: "donnees", label: "Données", allowed: () => true, render: () => <DataPanel /> },
]

export default function Admin() {
  const { role } = useAuth()
  const tabs = TABS.filter((tab) => tab.allowed(role))
  const [tab, setTab] = useState(tabs[0].id)
  const current = tabs.find((item) => item.id === tab) ?? tabs[0]

  return (
    <>
      <PageHeader eyebrow="Administration" title="Administration" subtitle="Décisions de cotation, accès de l'équipe, personnes, projets et données." />
      <Page>
        <div className="segmented mb-5" role="tablist" aria-label="Sections">
          {tabs.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={item.id === current.id} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        {current.render()}
      </Page>
    </>
  )
}
