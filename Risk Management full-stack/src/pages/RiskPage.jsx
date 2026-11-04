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
import { EventItem, NOTE_TYPES } from "../components/events.jsx"
import Icon from "../components/Icon.jsx"
import { LevelBadge, RiskMatrix, StatusPill } from "../components/risk.jsx"
import { Alert, Card, EmptyState, Field, Page, PageHeader, PageSpinner, toast } from "../components/ui.jsx"
import { CAUSES, derive, IMPACTS, KINDS, PROBABILITIES, STATUSES, STRATEGIES, todayISO, validateRisk } from "../domain/rules.js"
import { causeDescription, useI18n } from "../i18n/index.js"
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
  const { t } = useI18n()
  const { data: attachments, isLoading } = useAttachments(riskId)
  const upload = useUploadAttachment(riskId)
  const remove = useDeleteAttachment(riskId)
  const input = useRef(null)
  const [error, setError] = useState(null)

  const onFiles = async (fileList) => {
    setError(null)
    for (const file of fileList) {
      if (file.size > 50 * 1024 * 1024) {
        setError(t("errors.fileTooLarge", { name: file.name }))
        continue
      }
      try {
        await upload.mutateAsync(file)
      } catch (failure) {
        setError(failure.message)
      }
    }
    toast(t("attachments.added"))
  }

  // The tab is opened during the click (so pop-up blockers allow it), then
  // pointed at the short-lived link once it is ready.
  const open = async (attachment) => {
    setError(null)
    const tab = window.open("about:blank", "_blank")
    try {
      const url = await api.attachmentUrl(attachment)
      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else window.location.assign(url)
    } catch (failure) {
      tab?.close()
      setError(failure.message)
    }
  }

  const download = async (attachment) => {
    setError(null)
    try {
      await api.downloadAttachment(attachment)
    } catch (failure) {
      setError(failure.message)
    }
  }

  return (
    <Card
      title={t("attachments.title")}
      actions={
        canEdit && (
          <>
            <input ref={input} type="file" multiple hidden onChange={(event) => onFiles([...event.target.files]).then(() => (event.target.value = ""))} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current.click()} disabled={upload.isPending}>
              <Icon name="upload" />
              {upload.isPending ? t("attachments.uploading") : t("common.add")}
            </button>
          </>
        )
      }
    >
      <Alert>{error}</Alert>
      {isLoading ? (
        <p className="text-sm text-muted">{t("common.loading")}</p>
      ) : attachments?.length ? (
        <ul className="grid gap-1.5">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 rounded-md border border-line px-2.5 py-2">
              <Icon name="paperclip" className="size-4 shrink-0 text-muted" />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-link hover:underline"
                onClick={() => open(attachment)}
                title={t("attachments.open", { name: attachment.file_name })}
              >
                {attachment.file_name}
              </button>
              {attachment.size_bytes != null && (
                <span className="text-[11px] text-muted">{t("attachments.kb", { size: Math.max(1, Math.round(attachment.size_bytes / 1024)) })}</span>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                aria-label={t("attachments.download", { name: attachment.file_name })}
                title={t("attachments.download", { name: attachment.file_name })}
                onClick={() => download(attachment)}
              >
                <Icon name="download" />
              </button>
              {canRemove && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  aria-label={t("attachments.remove", { name: attachment.file_name })}
                  onClick={() => window.confirm(t("attachments.confirmRemove", { name: attachment.file_name })) && remove.mutate(attachment)}
                >
                  <Icon name="trash" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t("attachments.empty")}</p>
      )}
    </Card>
  )
}

function Journal({ riskId, canEdit }) {
  const { t, labelOf } = useI18n()
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
      toast(t("journal.added"))
    } catch (failure) {
      setError(failure.message)
    }
  }

  return (
    <Card title={t("journal.title")}>
      {canEdit && (
        <form className="mb-5 grid gap-2" onSubmit={submit}>
          <div className="flex gap-2">
            <select className="input w-auto" value={noteType} onChange={(event) => setNoteType(event.target.value)} aria-label={t("journal.type")}>
              {NOTE_TYPES.map((code) => (
                <option key={code} value={code}>
                  {labelOf("noteType", code)}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="input"
            rows={3}
            placeholder={t("journal.placeholder")}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-label={t("journal.text")}
          />
          <Alert>{error}</Alert>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!body.trim() || addNote.isPending}>
              {t("journal.add")}
            </button>
          </div>
        </form>
      )}
      {isLoading ? (
        <p className="text-sm text-muted">{t("common.loading")}</p>
      ) : events?.length ? (
        <ul className="timeline">
          {events.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t("journal.empty")}</p>
      )}
    </Card>
  )
}

// Reference-grid guidance for the chosen ratings. Labels follow the interface
// language; the descriptions are the grid's content, as management wrote it.
function Guidance({ reference, probability, impact }) {
  const { t, labelOf } = useI18n()
  const p = reference?.find((row) => row.scale === "probabilite" && row.rating === Number(probability))
  const i = reference?.find((row) => row.scale === "impact" && row.rating === Number(impact))
  if (!p && !i) return <p className="text-xs text-muted">{t("guidance.pick")}</p>
  const guides = i
    ? [
        [t("guide.cost"), i.cost_guide],
        [t("guide.delay"), i.delay_guide],
        [t("guide.quality"), i.quality_guide],
        [t("guide.hs"), i.hs_guide],
        [t("guide.reputation"), i.reputation_guide],
      ].filter(([, text]) => text)
    : []
  return (
    <div className="grid gap-3 rounded-md bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-ink-2 sm:grid-cols-2">
      {p && (
        <div>
          <p className="font-bold text-ink">{t("guidance.probability", { label: `${p.rating} - ${labelOf("probability", p.rating)}` })}</p>
          <p className="mt-0.5">{p.description || "—"}</p>
        </div>
      )}
      {i && (
        <div>
          <p className="font-bold text-ink">{t("guidance.impact", { label: `${i.rating} - ${labelOf("impact", i.rating)}` })}</p>
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
          {t("guidance.full")}
        </Link>
      </p>
    </div>
  )
}

function RiskForm({ risk, isNew }) {
  const { t, labelOf } = useI18n()
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
  // Field errors hold message keys, so they follow a language switch.
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
      toast(isNew ? t("risk.createdToast") : t("risk.savedToast"))
      if (isNew) navigate(`/risques/${id}`, { replace: true })
    } catch (failure) {
      setServerError(failure.message)
    }
  }

  const project = projects?.find((item) => item.id === values.project_id)
  const activePeople = (people ?? []).filter((person) => person.active || person.id === values.owner_id || person.id === values.exec_contact_id)

  const causes = CAUSES.map((item) => ({
    code: item.code,
    label: labelOf("cause", item.code),
    hint: causeDescription(reference?.find((row) => row.scale === "cause" && row.code === item.code)?.description, item.code, t),
  }))
  const cause = causes.find((item) => item.code === values.cause)
  const kinds = KINDS.map((item) => ({ code: item.code, label: labelOf("kind", item.code), hint: t(`kindHint.${item.code}`) }))
  const statuses = STATUSES.map((item) => ({ code: item.code, label: labelOf("status", item.code) }))
  const strategies = STRATEGIES.map((item) => ({ code: item.code, label: labelOf("strategy", item.code) }))
  const hasHistory = risk && (risk.legacy_type || risk.legacy_risk_index || risk.legacy_other_impacts || risk.legacy_sp_id || risk.legacy_created_at)
  const error = (name) => (errors[name] ? t(errors[name]) : undefined)

  const field = (name) => ({
    id: `field-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `field-${name}-error` : undefined,
    disabled,
  })

  return (
    <>
      <PageHeader
        eyebrow={isNew ? t("risk.newEyebrow") : `${riskRef(risk.id)} · ${risk.project_number} ${risk.project_name}`}
        title={isNew ? t("risk.newTitle") : risk.title}
        subtitle={
          isNew
            ? t("risk.newSubtitle")
            : risk.legacy_created_at
              ? t("risk.imported", { id: risk.legacy_sp_id, date: formatDateTime(risk.legacy_created_at), by: risk.legacy_created_by })
              : t("risk.created", { date: formatDateTime(risk.created_at) })
        }
        back={{ to: "/risques", label: t("risk.backToRegister") }}
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
                    if (!window.confirm(t("risk.confirmDelete", { ref: riskRef(risk.id) }))) return
                    await remove.mutateAsync(risk.id)
                    toast(t("risk.deleted"))
                    navigate("/risques", { replace: true })
                  }}
                >
                  <Icon name="trash" />
                  {t("common.delete")}
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
              <strong>{t("risk.toRateTitle")}</strong> {t("risk.toRateText")}
            </Alert>
          </div>
        )}
        {!canEdit && (
          <div className="mb-4">
            <Alert tone="info">{t("risk.readOnly")}</Alert>
          </div>
        )}

        <form onSubmit={submit} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="grid gap-5">
            <Card title={t("risk.identification")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("common.project")} htmlFor="field-project_id" required error={error("project_id")} className="sm:col-span-2">
                  <select className="input" value={values.project_id} onChange={(event) => set({ project_id: event.target.value })} {...field("project_id")}>
                    <option value="">{t("risk.chooseProject")}</option>
                    {(projects ?? [])
                      .filter((item) => item.active || item.id === values.project_id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.number} · {item.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label={t("common.title")} htmlFor="field-title" required error={error("title")} className="sm:col-span-2">
                  <textarea className="input min-h-[3.25rem]" rows={2} value={values.title} onChange={(event) => set({ title: event.target.value })} {...field("title")} />
                </Field>
                <Field
                  label={t("risk.kind")}
                  htmlFor="field-kind"
                  required={strict}
                  error={error("kind")}
                  hint={values.kind ? t(`kindHint.${values.kind}`) : undefined}
                >
                  <div id="field-kind">
                    <Choice name={t("risk.kind")} options={kinds} value={values.kind} onChange={(kind) => set({ kind })} disabled={disabled} />
                  </div>
                </Field>
                <Field label={t("common.status")} htmlFor="field-status">
                  <div id="field-status">
                    <Choice name={t("common.status")} options={statuses} value={values.status} onChange={(status) => set({ status })} disabled={disabled} />
                  </div>
                </Field>
                <Field label={t("risk.cause")} htmlFor="field-cause" required={strict} error={error("cause")} className="sm:col-span-2">
                  <select className="input" value={values.cause} onChange={(event) => set({ cause: event.target.value })} {...field("cause")}>
                    <option value="">{t("risk.chooseCause")}</option>
                    {causes.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="field-hint">{cause ? cause.hint : t("risk.causePlaceholder")}</p>
                    <button type="button" className="link shrink-0 text-xs" onClick={() => setShowCauses((open) => !open)} aria-expanded={showCauses}>
                      {showCauses ? t("risk.hideCauseGuide") : t("risk.causeGuide")}
                    </button>
                  </div>
                  {showCauses && (
                    <ul className="mt-1 grid gap-1.5 rounded-md bg-[var(--surface-2)] p-3 text-xs leading-relaxed">
                      {causes.map((item) => (
                        <li key={item.code}>
                          <span className="font-bold text-ink">{t("common.labelled", { label: item.label })}</span> {item.hint}
                        </li>
                      ))}
                    </ul>
                  )}
                  {risk?.legacy_type && !values.cause && <p className="field-hint">{t("risk.legacyType", { type: risk.legacy_type })}</p>}
                </Field>
                <Field label={t("risk.details")} htmlFor="field-details" className="sm:col-span-2">
                  <textarea className="input" rows={3} value={values.details} onChange={(event) => set({ details: event.target.value })} {...field("details")} />
                </Field>
              </div>
            </Card>

            <Card title={t("risk.assessment")} actions={<LevelBadge level={live.level} score={live.score} empty={t("common.notAssessed")} />}>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_13rem]">
                <RiskMatrix
                  value={{ probability: values.probability, impact: values.impact }}
                  onChange={(rating) => set(rating)}
                  lockProbability={values.kind === "enjeu"}
                  disabled={disabled}
                />
                <div className="grid content-start gap-4">
                  <Field
                    label={t("risk.probability")}
                    htmlFor="field-probability"
                    required={strict}
                    error={error("probability")}
                    hint={values.kind === "enjeu" ? t("risk.probabilityLocked") : undefined}
                  >
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
                          {item.value} - {labelOf("probability", item.value)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("risk.impact")} htmlFor="field-impact" required={strict} error={error("impact")} hint={t("risk.impactHint")}>
                    <select className="input" value={values.impact} onChange={(event) => set({ impact: event.target.value ? Number(event.target.value) : "" })} {...field("impact")}>
                      <option value="">—</option>
                      {IMPACTS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.value} - {labelOf("impact", item.value)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
              {!live.score && risk?.legacy_risk_index && (
                <div className="mt-4">
                  <Alert tone="info">{t("risk.legacyIndexNote", { index: risk.legacy_risk_index })}</Alert>
                </div>
              )}
              <div className="mt-4">
                <Guidance reference={reference} probability={values.probability} impact={values.impact} />
              </div>
            </Card>

            <Card title={t("risk.consequences")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("risk.cost")} htmlFor="field-cost" error={error("cost")} hint={t("risk.costHint")}>
                  <input className="input" type="number" min="0" step="1000" inputMode="numeric" value={values.cost} onChange={(event) => set({ cost: event.target.value })} {...field("cost")} />
                </Field>
                <Field label={t("risk.delay")} htmlFor="field-delay_days" error={error("delay_days")} hint={t("risk.delayHint")}>
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
                <Field label={t("risk.quality")} htmlFor="field-quality_impact">
                  <textarea className="input" rows={2} value={values.quality_impact} onChange={(event) => set({ quality_impact: event.target.value })} {...field("quality_impact")} />
                </Field>
                <Field label={t("risk.hs")} htmlFor="field-hs_impact">
                  <textarea className="input" rows={2} value={values.hs_impact} onChange={(event) => set({ hs_impact: event.target.value })} {...field("hs_impact")} />
                </Field>
                <Field label={t("risk.reputation")} htmlFor="field-reputation_impact" className="sm:col-span-2">
                  <textarea className="input" rows={2} value={values.reputation_impact} onChange={(event) => set({ reputation_impact: event.target.value })} {...field("reputation_impact")} />
                </Field>
              </div>
            </Card>

            <Card title={t("risk.response")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("common.owner")} htmlFor="field-owner_id" required={strict} error={error("owner_id")}>
                  <select className="input" value={values.owner_id} onChange={(event) => set({ owner_id: event.target.value })} {...field("owner_id")}>
                    <option value="">{t("common.choose")}</option>
                    {activePeople.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.full_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("risk.responseStrategy")} htmlFor="field-response_strategy" required={strict} error={error("response_strategy")}>
                  <div id="field-response_strategy">
                    <Choice
                      name={t("risk.responseStrategy")}
                      options={strategies}
                      value={values.response_strategy}
                      onChange={(response_strategy) => set({ response_strategy })}
                      disabled={disabled}
                    />
                  </div>
                </Field>
                <Field label={t("risk.strategyDetails")} htmlFor="field-strategy_details" className="sm:col-span-2">
                  <textarea className="input" rows={4} value={values.strategy_details} onChange={(event) => set({ strategy_details: event.target.value })} {...field("strategy_details")} />
                </Field>
                {live.exec_flag && (
                  <Field label={t("risk.execContact")} htmlFor="field-exec_contact_id" className="sm:col-span-2" hint={t("risk.execContactHint")}>
                    <select className="input" value={values.exec_contact_id} onChange={(event) => set({ exec_contact_id: event.target.value })} {...field("exec_contact_id")}>
                      <option value="">{t("common.none")}</option>
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

            <Card title={t("risk.followUp")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("risk.lastReview")} htmlFor="field-last_review" hint={t("risk.lastReviewHint")}>
                  <input className="input" type="date" value={values.last_review} onChange={(event) => set({ last_review: event.target.value })} {...field("last_review")} />
                </Field>
                <Field
                  label={t("common.nextReview")}
                  hint={
                    live.score
                      ? t("risk.nextReviewHint", { days: live.score >= settings.weekly_review_min_score ? 7 : 30, score: live.score })
                      : t("risk.nextReviewPending")
                  }
                >
                  <p className={`input flex items-center bg-[var(--surface-2)] ${live.review_overdue ? "font-semibold text-danger" : ""}`}>{formatDate(live.next_review)}</p>
                </Field>
                {values.status === "ferme" && (
                  <Field
                    label={t("risk.closedDate")}
                    htmlFor="field-closed_date"
                    required={!legacyClosed}
                    error={error("closed_date")}
                    hint={legacyClosed && !values.closed_date ? t("risk.closedDateLegacy") : undefined}
                  >
                    <input className="input" type="date" value={values.closed_date} onChange={(event) => set({ closed_date: event.target.value })} {...field("closed_date")} />
                  </Field>
                )}
                <div className="field sm:col-span-2">
                  <label className="check">
                    <input type="checkbox" checked={Boolean(values.committee_override)} onChange={(event) => set({ committee_override: event.target.checked })} disabled={disabled} />
                    {t("risk.committee")}
                  </label>
                  <p className="field-hint">{t("risk.committeeHint")}</p>
                </div>
              </div>
            </Card>

            {hasHistory && (
              <Card title={t("risk.history")}>
                <p className="mb-3 text-xs text-muted">{t("risk.historyNote")}</p>
                <dl className="dl">
                  {risk.legacy_sp_id && (
                    <>
                      <dt>{t("risk.spId")}</dt>
                      <dd>{risk.legacy_sp_id}</dd>
                    </>
                  )}
                  {risk.legacy_type && (
                    <>
                      <dt>{t("risk.type")}</dt>
                      <dd>{risk.legacy_type}</dd>
                    </>
                  )}
                  {risk.legacy_risk_index && (
                    <>
                      <dt>{t("risk.riskIndex")}</dt>
                      <dd>{risk.legacy_risk_index}</dd>
                    </>
                  )}
                  {risk.legacy_created_at && (
                    <>
                      <dt>{t("risk.createdLabel")}</dt>
                      <dd>
                        {formatDateTime(risk.legacy_created_at)}
                        {risk.legacy_created_by && ` · ${risk.legacy_created_by}`}
                      </dd>
                    </>
                  )}
                  {risk.legacy_modified_at && (
                    <>
                      <dt>{t("risk.modifiedLabel")}</dt>
                      <dd>
                        {formatDateTime(risk.legacy_modified_at)}
                        {risk.legacy_modified_by && ` · ${risk.legacy_modified_by}`}
                      </dd>
                    </>
                  )}
                  {risk.legacy_closed_record && (
                    <>
                      <dt>{t("risk.legacyException")}</dt>
                      <dd>{t("risk.legacyExceptionValue")}</dd>
                    </>
                  )}
                </dl>
                {risk.legacy_other_impacts && (
                  <div className="mt-4">
                    <p className="eyebrow">{t("risk.otherImpacts")}</p>
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
                    <span className="font-semibold text-danger">{t("risk.checkFields")}</span>
                  ) : (
                    <span className="text-muted">{isNew ? t("risk.unsavedNew") : t("risk.unsaved")}</span>
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
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={save.isPending}>
                    {save.isPending ? t("common.saving") : isNew ? t("risk.create") : t("common.save")}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="grid gap-5 lg:sticky lg:top-5">
            <Card title={t("risk.summary")}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">{t("common.level")}</p>
                  <p className="mt-1 text-[1.65rem] font-bold leading-none text-ink">{live.level ? labelOf("level", live.level) : t("common.notAssessed")}</p>
                </div>
                <div className="text-right">
                  <p className="eyebrow">{t("common.score")}</p>
                  <p className="mt-1 text-[1.65rem] font-bold leading-none tabular-nums text-ink">{live.score ?? "—"}</p>
                </div>
              </div>
              {live.level && <div className="mt-3 h-1.5 rounded-full" style={{ background: `var(--lvl-${live.level})` }}></div>}
              <dl className="dl mt-4">
                <dt>{t("risk.flag")}</dt>
                <dd className={live.exec_flag ? "text-danger" : ""}>{live.exec_flag ? t("common.yes") : t("common.no")}</dd>
                <dt>{t("risk.inCommittee")}</dt>
                <dd>{live.in_committee ? t("common.yes") : t("common.no")}</dd>
                <dt>{t("common.nextReview")}</dt>
                <dd className={live.review_overdue ? "text-danger" : ""}>{formatDate(live.next_review)}</dd>
                <dt>{t("common.project")}</dt>
                <dd className="truncate">{project ? project.number : "—"}</dd>
                <dt>{t("risk.estimatedCost")}</dt>
                <dd>{values.cost === "" ? t("risk.notEstimated") : formatMoney(values.cost)}</dd>
              </dl>
              {ratingChanged && <p className="mt-3 text-xs text-muted">{t("risk.preview")}</p>}
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
  const { t } = useI18n()
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
        <EmptyState
          icon="search"
          title={t("risk.notFoundTitle")}
          action={
            <Link to="/risques" className="btn btn-secondary">
              {t("risk.backToRegister")}
            </Link>
          }
        >
          {t("risk.notFoundText", { ref: riskRef(id) })}
        </EmptyState>
      </Page>
    )
  }
  return <RiskForm key={isNew ? "new" : risk.id} risk={risk} isNew={isNew} />
}
