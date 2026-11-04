import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { api } from "../api/index.js"
import {
  useAddNote,
  useAttachments,
  useDeleteAttachment,
  useDeleteRisk,
  useEvents,
  usePeople,
  useProjects,
  useReference,
  useRisk,
  useSaveRisk,
  useSettings,
  useUploadAttachment,
} from "../api/hooks.js"
import { EventItem, NOTE_TYPE_OPTIONS } from "../components/events.jsx"
import Icon from "../components/Icon.jsx"
import { LevelBadge, RiskMatrix, StatusPill } from "../components/risk.jsx"
import { Alert, Card, EmptyState, Field, Page, PageHeader, PageSpinner, toast } from "../components/ui.jsx"
import {
  CAUSES,
  derive,
  IMPACTS,
  KINDS,
  LEVEL_BY_CODE,
  PROBABILITIES,
  STATUSES,
  STRATEGIES,
  todayISO,
  validateRisk,
  labelOf,
} from "../domain/rules.js"
import { useAuth } from "../lib/auth.jsx"
import { formatDate, formatDateTime, formatMoney, riskRef } from "../lib/format.js"
import { can } from "../lib/roles.js"

const EMPTY = {
  project_id: "",
  title: "",
  kind: "risque",
  cause: "",
  details: "",
  status: "actif",
  probability: "",
  impact: "",
  cost: "",
  delay_days: "",
  quality_impact: "",
  hs_impact: "",
  reputation_impact: "",
  owner_id: "",
  response_strategy: "",
  strategy_details: "",
  exec_contact_id: "",
  last_review: "",
  closed_date: "",
  committee_override: false,
}

const fromRisk = (risk) =>
  Object.fromEntries(Object.keys(EMPTY).map((key) => [key, risk[key] == null ? EMPTY[key] === false ? false : "" : risk[key]]))

const same = (a, b) => Object.keys(EMPTY).every((key) => String(a[key] ?? "") === String(b[key] ?? ""))

function Choice({ name, options, value, onChange, disabled }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          role="radio"
          aria-checked={value === option.code}
          aria-selected={value === option.code}
          disabled={disabled}
          onClick={() => onChange(option.code)}
          title={option.hint}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Attachments({ riskId, canEdit, canRemove }) {
  const { data: attachments, isLoading } = useAttachments(riskId)
  const upload = useUploadAttachment(riskId)
  const remove = useDeleteAttachment(riskId)
  const input = useRef(null)
  const [error, setError] = useState(null)

  const onFiles = async (fileList) => {
    setError(null)
    for (const file of fileList) {
      if (file.size > 50 * 1024 * 1024) {
        setError(`${file.name} dépasse 50 Mo.`)
        continue
      }
      try {
        await upload.mutateAsync(file)
      } catch (failure) {
        setError(failure.message)
      }
    }
    toast("Fichier ajouté")
  }

  const open = async (attachment) => {
    try {
      window.open(await api.attachmentUrl(attachment), "_blank", "noopener")
    } catch (failure) {
      setError(failure.message)
    }
  }

  return (
    <Card
      title="Pièces jointes"
      actions={
        canEdit && (
          <>
            <input ref={input} type="file" multiple hidden onChange={(event) => onFiles([...event.target.files]).then(() => (event.target.value = ""))} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current.click()} disabled={upload.isPending}>
              <Icon name="upload" />
              {upload.isPending ? "Envoi…" : "Ajouter"}
            </button>
          </>
        )
      }
    >
      <Alert>{error}</Alert>
      {isLoading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : attachments?.length ? (
        <ul className="grid gap-1.5">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 rounded-md border border-line px-2.5 py-2">
              <Icon name="paperclip" className="size-4 shrink-0 text-muted" />
              <button type="button" className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-link hover:underline" onClick={() => open(attachment)}>
                {attachment.file_name}
              </button>
              {attachment.size_bytes != null && <span className="text-[11px] text-muted">{Math.max(1, Math.round(attachment.size_bytes / 1024))} Ko</span>}
              {canRemove && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  aria-label={`Retirer ${attachment.file_name}`}
                  onClick={() => window.confirm(`Retirer « ${attachment.file_name} » ?`) && remove.mutate(attachment)}
                >
                  <Icon name="trash" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucune pièce jointe.</p>
      )}
    </Card>
  )
}

function Journal({ riskId, canEdit }) {
  const { data: events, isLoading } = useEvents(riskId)
  const addNote = useAddNote(riskId)
  const [noteType, setNoteType] = useState("mise_a_jour")
  const [body, setBody] = useState("")
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    try {
      await addNote.mutateAsync({ noteType, body })
      setBody("")
      toast("Note ajoutée au journal")
    } catch (failure) {
      setError(failure.message)
    }
  }

  return (
    <Card title="Journal des interventions">
      {canEdit && (
        <form className="mb-5 grid gap-2" onSubmit={submit}>
          <div className="flex gap-2">
            <select className="input w-auto" value={noteType} onChange={(event) => setNoteType(event.target.value)} aria-label="Type d'intervention">
              {NOTE_TYPE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="input"
            rows={3}
            placeholder="Mise à jour, action prise, décision du comité…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-label="Texte de la note"
          />
          <Alert>{error}</Alert>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!body.trim() || addNote.isPending}>
              Ajouter au journal
            </button>
          </div>
        </form>
      )}
      {isLoading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : events?.length ? (
        <ul className="timeline">
          {events.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Les révisions de cote, fermetures et notes s'inscrivent ici automatiquement.</p>
      )}
    </Card>
  )
}

function Guidance({ reference, probability, impact }) {
  const p = reference?.find((row) => row.scale === "probabilite" && row.rating === Number(probability))
  const i = reference?.find((row) => row.scale === "impact" && row.rating === Number(impact))
  if (!p && !i) return <p className="text-xs text-muted">Choisissez une case de la matrice, ou la probabilité et l'impact ci-dessous.</p>
  const guides = i
    ? [
        ["Coût", i.cost_guide],
        ["Délai", i.delay_guide],
        ["Qualité", i.quality_guide],
        ["Santé et sécurité", i.hs_guide],
        ["Réputation", i.reputation_guide],
      ].filter(([, text]) => text)
    : []
  return (
    <div className="grid gap-3 rounded-md bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-ink-2 sm:grid-cols-2">
      {p && (
        <div>
          <p className="font-bold text-ink">Probabilité · {p.label}</p>
          <p className="mt-0.5">{p.description || "—"}</p>
        </div>
      )}
      {i && (
        <div>
          <p className="font-bold text-ink">Impact · {i.label}</p>
          {i.description && <p className="mt-0.5">{i.description}</p>}
          {guides.length > 0 && (
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2">
              {guides.map(([label, text]) => (
                <div key={label} className="contents">
                  <dt className="text-muted">{label}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
      <p className="text-muted sm:col-span-2">
        <Link to="/reference" className="link" target="_blank">
          Grille de référence complète
        </Link>
      </p>
    </div>
  )
}

function RiskForm({ risk, isNew }) {
  const { profile, role } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: projects } = useProjects()
  const { data: people } = usePeople()
  const { data: reference } = useReference()
  const { settings } = useSettings()
  const save = useSaveRisk()
  const remove = useDeleteRisk()
  const canEdit = can.editRisks(role)

  const initial = useMemo(() => {
    if (!isNew) return fromRisk(risk)
    const project = projects?.find((item) => item.number === params.get("projet"))
    const me = people?.find((person) => person.profile_id === profile.id)
    return { ...EMPTY, project_id: project?.id ?? "", owner_id: me?.id ?? "", last_review: todayISO() }
  }, [isNew, risk, projects, people, params, profile.id])

  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [showCauses, setShowCauses] = useState(false)
  const dirty = !same(values, initial)

  // A new version from the server (after a save) refreshes a clean form.
  const lastSeen = useRef(initial)
  useEffect(() => {
    if (same(values, lastSeen.current)) setValues(initial)
    lastSeen.current = initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  useEffect(() => {
    if (!dirty) return
    const warn = (event) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (changes) => {
    setValues((current) => {
      const next = { ...current, ...changes }
      // An enjeu has happened: probability 5.
      if (changes.kind === "enjeu") next.probability = 5
      // Closing pre-fills today's date; the user can change it.
      if (changes.status === "ferme" && !next.closed_date) next.closed_date = todayISO()
      return next
    })
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(changes)) delete next[key]
      return next
    })
  }

  // Live preview, computed exactly like the database. A rating change
  // counts as a review, so the next review restarts from today.
  const ratingChanged = !isNew && (Number(values.probability) !== Number(risk.probability ?? 0) || Number(values.impact) !== Number(risk.impact ?? 0))
  const reviewDate = ratingChanged && values.last_review === initial.last_review ? todayISO() : values.last_review
  const live = derive({ ...values, last_review: reviewDate, probability: Number(values.probability) || null, impact: Number(values.impact) || null }, settings)
  const legacyClosed = Boolean(risk?.legacy_closed_record) && values.status === "ferme"
  const strict = values.status === "actif" && (isNew || settings.require_complete_active)
  const disabled = !canEdit

  const submit = async (event) => {
    event?.preventDefault()
    setServerError(null)
    const found = validateRisk(values, { isNew, settings, legacyClosed })
    setErrors(found)
    if (Object.keys(found).length) {
      document.getElementById(`field-${Object.keys(found)[0]}`)?.scrollIntoView?.({ behavior: "smooth", block: "center" })
      return
    }
    try {
      const { id } = await save.mutateAsync({ id: isNew ? null : risk.id, values })
      toast(isNew ? "Élément créé" : "Modifications enregistrées")
      if (isNew) navigate(`/risques/${id}`, { replace: true })
    } catch (failure) {
      setServerError(failure.message)
    }
  }

  const project = projects?.find((item) => item.id === values.project_id)
  const activePeople = (people ?? []).filter((person) => person.active || person.id === values.owner_id || person.id === values.exec_contact_id)
  // Cause descriptions come from the reference grid (management edits them
  // there); the built-in text is the fallback.
  const causes = CAUSES.map((item) => ({
    ...item,
    hint: reference?.find((row) => row.scale === "cause" && row.code === item.code)?.description || item.hint,
  }))
  const cause = causes.find((item) => item.code === values.cause)
  const hasHistory = risk && (risk.legacy_type || risk.legacy_risk_index || risk.legacy_other_impacts || risk.legacy_sp_id || risk.legacy_created_at)

  const field = (name) => ({
    id: `field-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `field-${name}-error` : undefined,
    disabled,
  })

  return (
    <>
      <PageHeader
        eyebrow={isNew ? "Nouvel élément" : `${riskRef(risk.id)} · ${risk.project_number} ${risk.project_name}`}
        title={isNew ? "Nouveau risque ou enjeu" : risk.title}
        subtitle={
          isNew
            ? "Les champs marqués * sont obligatoires pour un élément actif."
            : risk.legacy_created_at
              ? `Repris de SharePoint${risk.legacy_sp_id ? ` (ID ${risk.legacy_sp_id})` : ""} · créé le ${formatDateTime(risk.legacy_created_at)}${risk.legacy_created_by ? ` par ${risk.legacy_created_by}` : ""}`
              : `Créé le ${formatDateTime(risk.created_at)}`
        }
        back={{ to: "/risques", label: "Retour au registre" }}
        actions={
          !isNew && (
            <>
              <LevelBadge level={risk.level} score={risk.score} />
              <StatusPill status={risk.status} />
              {can.deleteRisks(role) && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    if (!window.confirm(`Supprimer définitivement ${riskRef(risk.id)} et son journal ? Pour un élément terminé, préférez le statut Fermé.`)) return
                    await remove.mutateAsync(risk.id)
                    toast("Élément supprimé")
                    navigate("/risques", { replace: true })
                  }}
                >
                  <Icon name="trash" />
                  Supprimer
                </button>
              )}
            </>
          )
        }
      />
      <Page>
        {!isNew && risk.needs_rating && (
          <div className="mb-4">
            <Alert tone="warn">
              <strong>À recoter.</strong> Cet élément actif vient de SharePoint et n'a pas encore de cote. Complétez risque/enjeu, cause, probabilité, impact et
              stratégie de réponse.
            </Alert>
          </div>
        )}
        {!canEdit && (
          <div className="mb-4">
            <Alert tone="info">Consultation seulement : votre rôle ne permet pas de modifier le registre.</Alert>
          </div>
        )}

        <form onSubmit={submit} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="grid gap-5">
            <Card title="Identification">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Projet" htmlFor="field-project_id" required error={errors.project_id} className="sm:col-span-2">
                  <select className="input" value={values.project_id} onChange={(event) => set({ project_id: event.target.value })} {...field("project_id")}>
                    <option value="">Choisir un projet…</option>
                    {(projects ?? [])
                      .filter((item) => item.active || item.id === values.project_id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.number} · {item.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Titre" htmlFor="field-title" required error={errors.title} className="sm:col-span-2">
                  <textarea className="input min-h-[3.25rem]" rows={2} value={values.title} onChange={(event) => set({ title: event.target.value })} {...field("title")} />
                </Field>
                <Field label="Risque ou enjeu" htmlFor="field-kind" required={strict} error={errors.kind} hint={labelOf(KINDS, values.kind) && KINDS.find((kind) => kind.code === values.kind)?.hint}>
                  <div id="field-kind">
                    <Choice name="Risque ou enjeu" options={KINDS} value={values.kind} onChange={(kind) => set({ kind })} disabled={disabled} />
                  </div>
                </Field>
                <Field label="Statut" htmlFor="field-status">
                  <div id="field-status">
                    <Choice name="Statut" options={STATUSES} value={values.status} onChange={(status) => set({ status })} disabled={disabled} />
                  </div>
                </Field>
                <Field label="Cause" htmlFor="field-cause" required={strict} error={errors.cause} className="sm:col-span-2">
                  <select className="input" value={values.cause} onChange={(event) => set({ cause: event.target.value })} {...field("cause")}>
                    <option value="">Choisir une cause…</option>
                    {CAUSES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="field-hint">{cause ? cause.hint : "La description de la cause choisie s'affiche ici."}</p>
                    <button type="button" className="link shrink-0 text-xs" onClick={() => setShowCauses((open) => !open)} aria-expanded={showCauses}>
                      {showCauses ? "Masquer le guide des causes" : "Guide des causes"}
                    </button>
                  </div>
                  {showCauses && (
                    <ul className="mt-1 grid gap-1.5 rounded-md bg-[var(--surface-2)] p-3 text-xs leading-relaxed">
                      {causes.map((item) => (
                        <li key={item.code}>
                          <span className="font-bold text-ink">{item.label} :</span> {item.hint}
                        </li>
                      ))}
                    </ul>
                  )}
                  {risk?.legacy_type && !values.cause && <p className="field-hint">Ancien type SharePoint : {risk.legacy_type}</p>}
                </Field>
                <Field label="Détails" htmlFor="field-details" className="sm:col-span-2">
                  <textarea className="input" rows={3} value={values.details} onChange={(event) => set({ details: event.target.value })} {...field("details")} />
                </Field>
              </div>
            </Card>

            <Card
              title="Évaluation"
              actions={<LevelBadge level={live.level} score={live.score} empty="Non évalué" />}
            >
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_13rem]">
                <RiskMatrix
                  value={{ probability: values.probability, impact: values.impact }}
                  onChange={(rating) => set(rating)}
                  lockProbability={values.kind === "enjeu"}
                  disabled={disabled}
                />
                <div className="grid content-start gap-4">
                  <Field label="Probabilité" htmlFor="field-probability" required={strict} error={errors.probability} hint={values.kind === "enjeu" ? "Fixée à 5 pour un enjeu." : undefined}>
                    <select
                      className="input"
                      value={values.probability}
                      onChange={(event) => set({ probability: event.target.value ? Number(event.target.value) : "" })}
                      {...field("probability")}
                      disabled={disabled || values.kind === "enjeu"}
                    >
                      <option value="">—</option>
                      {PROBABILITIES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.value} - {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Impact" htmlFor="field-impact" required={strict} error={errors.impact} hint="La conséquence la plus grave parmi coût, délai, qualité, SST et réputation.">
                    <select className="input" value={values.impact} onChange={(event) => set({ impact: event.target.value ? Number(event.target.value) : "" })} {...field("impact")}>
                      <option value="">—</option>
                      {IMPACTS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.value} - {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
              <div className="mt-4">
                <Guidance reference={reference} probability={values.probability} impact={values.impact} />
              </div>
            </Card>

            <Card title="Conséquences">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Coût ($)" htmlFor="field-cost" error={errors.cost} hint="Vide = non estimé. 0 = estimé à zéro.">
                  <input className="input" type="number" min="0" step="1000" inputMode="numeric" value={values.cost} onChange={(event) => set({ cost: event.target.value })} {...field("cost")} />
                </Field>
                <Field label="Délai (jours)" htmlFor="field-delay_days" error={errors.delay_days} hint="Nombre entier de jours, 0 ou plus.">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={values.delay_days}
                    onChange={(event) => set({ delay_days: event.target.value })}
                    {...field("delay_days")}
                  />
                </Field>
                <Field label="Qualité" htmlFor="field-quality_impact">
                  <textarea className="input" rows={2} value={values.quality_impact} onChange={(event) => set({ quality_impact: event.target.value })} {...field("quality_impact")} />
                </Field>
                <Field label="Santé et sécurité" htmlFor="field-hs_impact">
                  <textarea className="input" rows={2} value={values.hs_impact} onChange={(event) => set({ hs_impact: event.target.value })} {...field("hs_impact")} />
                </Field>
                <Field label="Réputation" htmlFor="field-reputation_impact" className="sm:col-span-2">
                  <textarea className="input" rows={2} value={values.reputation_impact} onChange={(event) => set({ reputation_impact: event.target.value })} {...field("reputation_impact")} />
                </Field>
              </div>
            </Card>

            <Card title="Réponse">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Propriétaire" htmlFor="field-owner_id" required={strict} error={errors.owner_id}>
                  <select className="input" value={values.owner_id} onChange={(event) => set({ owner_id: event.target.value })} {...field("owner_id")}>
                    <option value="">Choisir…</option>
                    {activePeople.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.full_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Stratégie de réponse" htmlFor="field-response_strategy" required={strict} error={errors.response_strategy}>
                  <div id="field-response_strategy">
                    <Choice name="Stratégie de réponse" options={STRATEGIES} value={values.response_strategy} onChange={(response_strategy) => set({ response_strategy })} disabled={disabled} />
                  </div>
                </Field>
                <Field label="Détails de la stratégie" htmlFor="field-strategy_details" className="sm:col-span-2">
                  <textarea className="input" rows={4} value={values.strategy_details} onChange={(event) => set({ strategy_details: event.target.value })} {...field("strategy_details")} />
                </Field>
                {live.exec_flag && (
                  <Field
                    label="Répondant direction"
                    htmlFor="field-exec_contact_id"
                    className="sm:col-span-2"
                    hint="Affiché parce que l'élément est signalé à la direction (impact 5, ou impact 3–4 avec une probabilité de 3 ou plus)."
                  >
                    <select className="input" value={values.exec_contact_id} onChange={(event) => set({ exec_contact_id: event.target.value })} {...field("exec_contact_id")}>
                      <option value="">Aucun</option>
                      {activePeople.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.full_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            </Card>

            <Card title="Suivi">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dernière révision" htmlFor="field-last_review" hint="Mise à jour automatiquement quand la cote change.">
                  <input className="input" type="date" value={values.last_review} onChange={(event) => set({ last_review: event.target.value })} {...field("last_review")} />
                </Field>
                <Field
                  label="Prochaine révision"
                  hint={live.score ? `Aux ${live.score >= settings.weekly_review_min_score ? "7" : "30"} jours pour un score de ${live.score}.` : "Calculée dès que l'élément est coté."}
                >
                  <p className={`input flex items-center bg-[var(--surface-2)] ${live.review_overdue ? "font-semibold text-danger" : ""}`}>{formatDate(live.next_review)}</p>
                </Field>
                {values.status === "ferme" && (
                  <Field
                    label="Date de fermeture"
                    htmlFor="field-closed_date"
                    required={!legacyClosed}
                    error={errors.closed_date}
                    hint={legacyClosed && !values.closed_date ? "Fermé avant la mise à niveau : la date n'est pas exigée." : undefined}
                  >
                    <input className="input" type="date" value={values.closed_date} onChange={(event) => set({ closed_date: event.target.value })} {...field("closed_date")} />
                  </Field>
                )}
                <div className="field sm:col-span-2">
                  <label className="check">
                    <input type="checkbox" checked={Boolean(values.committee_override)} onChange={(event) => set({ committee_override: event.target.checked })} disabled={disabled} />
                    Ajouter au comité d'opération même si le niveau est inférieur à Élevé
                  </label>
                  <p className="field-hint">Les éléments actifs Élevé et Critique y figurent automatiquement.</p>
                </div>
              </div>
            </Card>

            {hasHistory && (
              <Card title="Historique SharePoint">
                <p className="mb-3 text-xs text-muted">Valeurs reprises de l'ancienne liste, conservées en lecture seule.</p>
                <dl className="dl">
                  {risk.legacy_sp_id && (
                    <>
                      <dt>ID SharePoint</dt>
                      <dd>{risk.legacy_sp_id}</dd>
                    </>
                  )}
                  {risk.legacy_type && (
                    <>
                      <dt>Type</dt>
                      <dd>{risk.legacy_type}</dd>
                    </>
                  )}
                  {risk.legacy_risk_index && (
                    <>
                      <dt>Indice de risque</dt>
                      <dd>{risk.legacy_risk_index}</dd>
                    </>
                  )}
                  {risk.legacy_created_at && (
                    <>
                      <dt>Créé</dt>
                      <dd>
                        {formatDateTime(risk.legacy_created_at)}
                        {risk.legacy_created_by && ` · ${risk.legacy_created_by}`}
                      </dd>
                    </>
                  )}
                  {risk.legacy_modified_at && (
                    <>
                      <dt>Dernière modification</dt>
                      <dd>
                        {formatDateTime(risk.legacy_modified_at)}
                        {risk.legacy_modified_by && ` · ${risk.legacy_modified_by}`}
                      </dd>
                    </>
                  )}
                  {risk.legacy_closed_record && (
                    <>
                      <dt>Exception historique</dt>
                      <dd>Fermé avant la mise à niveau</dd>
                    </>
                  )}
                </dl>
                {risk.legacy_other_impacts && (
                  <div className="mt-4">
                    <p className="eyebrow">Autres impacts</p>
                    <p className="mt-1 whitespace-pre-line text-[13px] text-ink-2">{risk.legacy_other_impacts}</p>
                  </div>
                )}
              </Card>
            )}

            {canEdit && (dirty || isNew) && (
              <div className="save-bar">
                <div className="min-w-0 text-sm">
                  {serverError ? (
                    <span className="font-semibold text-danger">{serverError}</span>
                  ) : Object.keys(errors).length ? (
                    <span className="font-semibold text-danger">Vérifiez les champs signalés.</span>
                  ) : (
                    <span className="text-muted">{isNew ? "Nouvel élément, pas encore enregistré." : "Modifications non enregistrées."}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (isNew) navigate(-1)
                      else {
                        setValues(initial)
                        setErrors({})
                        setServerError(null)
                      }
                    }}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={save.isPending}>
                    {save.isPending ? "Enregistrement…" : isNew ? "Créer l'élément" : "Enregistrer"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="grid gap-5 lg:sticky lg:top-5">
            <Card title="Résumé">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Niveau</p>
                  <p className="mt-1 text-[1.65rem] font-bold leading-none text-ink">{live.level ? LEVEL_BY_CODE[live.level].label : "Non évalué"}</p>
                </div>
                <div className="text-right">
                  <p className="eyebrow">Score</p>
                  <p className="mt-1 text-[1.65rem] font-bold leading-none tabular-nums text-ink">{live.score ?? "—"}</p>
                </div>
              </div>
              {live.level && <div className="mt-3 h-1.5 rounded-full" style={{ background: `var(--lvl-${live.level})` }}></div>}
              <dl className="dl mt-4">
                <dt>Signalement direction</dt>
                <dd className={live.exec_flag ? "text-danger" : ""}>{live.exec_flag ? "Oui" : "Non"}</dd>
                <dt>Comité d'opération</dt>
                <dd>{live.in_committee ? "Oui" : "Non"}</dd>
                <dt>Prochaine révision</dt>
                <dd className={live.review_overdue ? "text-danger" : ""}>{formatDate(live.next_review)}</dd>
                <dt>Projet</dt>
                <dd className="truncate">{project ? project.number : "—"}</dd>
                <dt>Coût estimé</dt>
                <dd>{values.cost === "" ? "Non estimé" : formatMoney(values.cost)}</dd>
              </dl>
              {ratingChanged && <p className="mt-3 text-xs text-muted">Aperçu : la cote sera enregistrée et la révision datée d'aujourd'hui.</p>}
            </Card>

            {!isNew && <Attachments riskId={risk.id} canEdit={canEdit} canRemove={can.removeAttachments(role)} />}
            {!isNew && <Journal riskId={risk.id} canEdit={canEdit} />}
          </aside>
        </form>
      </Page>
    </>
  )
}

export default function RiskPage() {
  const { id } = useParams()
  const isNew = !id
  const { data: risk, isLoading, error } = useRisk(isNew ? null : id)
  const { isLoading: loadingProjects } = useProjects()
  const { isLoading: loadingPeople } = usePeople()

  if ((!isNew && isLoading) || loadingProjects || loadingPeople) return <PageSpinner />
  if (error) {
    return (
      <Page>
        <Alert>{error.message}</Alert>
      </Page>
    )
  }
  if (!isNew && !risk) {
    return (
      <Page>
        <EmptyState icon="search" title="Élément introuvable" action={<Link to="/risques" className="btn btn-secondary">Retour au registre</Link>}>
          {riskRef(id)} n'existe pas ou a été supprimé.
        </EmptyState>
      </Page>
    )
  }
  return <RiskForm key={isNew ? "new" : risk.id} risk={risk} isNew={isNew} />
}
