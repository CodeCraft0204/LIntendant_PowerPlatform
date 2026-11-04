import { useState } from "react"
import { useReference, useSaveReference, useSettings } from "../api/hooks.js"
import Icon from "../components/Icon.jsx"
import { LevelBadge } from "../components/risk.jsx"
import { Alert, Card, Field, Page, PageHeader, PageSpinner, toast } from "../components/ui.jsx"
import { LEVELS } from "../domain/rules.js"
import { causeDescription, useI18n } from "../i18n/index.js"
import { useAuth } from "../lib/auth.jsx"
import { can } from "../lib/roles.js"

// Scores that can actually occur in each band (products of two ratings).
const SCORE_RANGES = { tres_faible: "1–3", faible: "4–6", moyen: "8–10", eleve: "12–16", critique: "20–25" }
const BAND_MAX = { tres_faible: 3, faible: 6, moyen: 10, eleve: 16, critique: 25 }

const IMPACT_GUIDES = ["cost_guide", "delay_guide", "quality_guide", "hs_guide", "reputation_guide"]
const GUIDE_LABEL = { cost_guide: "guide.cost", delay_guide: "guide.delay", quality_guide: "guide.quality", hs_guide: "guide.hs", reputation_guide: "guide.reputation" }

// Row titles follow the interface language; the descriptions are the grid's
// content, shown and edited as management wrote them.
function rowTitle(row, labelOf) {
  if (row.scale === "probabilite") return `${row.rating} - ${labelOf("probability", row.rating)}`
  if (row.scale === "impact") return `${row.rating} - ${labelOf("impact", row.rating)}`
  return labelOf("cause", row.code)
}

function EditRow({ row, fields, onDone }) {
  const { t } = useI18n()
  const save = useSaveReference()
  const [draft, setDraft] = useState(row)
  const [error, setError] = useState(null)

  return (
    <form
      className="grid gap-3 rounded-md border border-line bg-[var(--surface-2)] p-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setError(null)
        try {
          await save.mutateAsync(draft)
          toast(t("reference.updated"))
          onDone()
        } catch (failure) {
          setError(failure.message)
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((key) => (
          <Field
            key={key}
            label={key === "description" ? t("reference.description") : t(GUIDE_LABEL[key])}
            htmlFor={`${row.id}-${key}`}
            className={key === "description" ? "sm:col-span-2" : ""}
          >
            <textarea id={`${row.id}-${key}`} className="input" rows={2} value={draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
          </Field>
        ))}
      </div>
      <Alert>{error}</Alert>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={save.isPending}>
          {t("common.save")}
        </button>
      </div>
    </form>
  )
}

function Scale({ title, rows, fields, editable, render }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(null)
  return (
    <Card title={title} bodyClassName="">
      <ul>
        {rows.map((row) => (
          <li key={row.id} className="border-b border-line px-5 py-4 last:border-b-0">
            {editing === row.id ? (
              <EditRow row={row} fields={fields} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">{render(row)}</div>
                {editable && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(row.id)}>
                    <Icon name="pencil" />
                    {t("common.edit")}
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Reference() {
  const { t, labelOf } = useI18n()
  const { role } = useAuth()
  const { data: reference, isLoading, error } = useReference()
  const { settings } = useSettings()
  const editable = can.editReference(role)

  if (isLoading) return <PageSpinner />
  const scale = (name) => (reference ?? []).filter((row) => row.scale === name).sort((a, b) => a.sort_order - b.sort_order)
  const pending = (text) => /à valider|à définir/i.test(text ?? "")
  const threshold = settings.weekly_review_min_score

  return (
    <>
      <PageHeader eyebrow={t("reference.eyebrow")} title={t("reference.title")} subtitle={t("reference.subtitle")} />
      <Page>
        <Alert>{error?.message}</Alert>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-5">
            <Scale
              title={t("risk.probability")}
              rows={scale("probabilite")}
              editable={editable}
              fields={["description"]}
              render={(row) => (
                <>
                  <p className="text-sm font-bold text-ink">{rowTitle(row, labelOf)}</p>
                  <p className={`mt-0.5 text-[13px] ${pending(row.description) ? "text-warn" : "text-ink-2"}`}>{row.description || "—"}</p>
                </>
              )}
            />

            <Scale
              title={t("risk.impact")}
              rows={scale("impact")}
              editable={editable}
              fields={["description", ...IMPACT_GUIDES]}
              render={(row) => (
                <>
                  <p className="text-sm font-bold text-ink">{rowTitle(row, labelOf)}</p>
                  {row.description && <p className="mt-0.5 text-[13px] text-ink-2">{row.description}</p>}
                  <dl className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                    {IMPACT_GUIDES.map((key) => (
                      <div key={key} className="contents">
                        <dt className="text-muted">{t(GUIDE_LABEL[key])}</dt>
                        <dd className={pending(row[key]) ? "text-warn" : "text-ink-2"}>{row[key] || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            />

            <Scale
              title={t("reference.causes")}
              rows={scale("cause")}
              editable={editable}
              fields={["description"]}
              render={(row) => (
                <>
                  <p className="text-sm font-bold text-ink">{rowTitle(row, labelOf)}</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">{causeDescription(row.description, row.code, t)}</p>
                </>
              )}
            />
          </div>

          <aside className="grid content-start gap-5">
            <Card title={t("reference.levels")}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("common.score")}</th>
                    <th>{t("common.level")}</th>
                    <th>{t("reference.review")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...LEVELS].reverse().map((level) => {
                    const review =
                      level.min >= threshold
                        ? t("common.days", { count: 7 })
                        : BAND_MAX[level.code] >= threshold
                          ? t("reference.reviewMixed", { threshold })
                          : t("common.days", { count: 30 })
                    return (
                      <tr key={level.code}>
                        <td className="whitespace-nowrap tabular-nums">{SCORE_RANGES[level.code]}</td>
                        <td>
                          <LevelBadge level={level.code} />
                        </td>
                        <td className="whitespace-nowrap">{review}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-xs leading-relaxed text-muted">{t("reference.note", { threshold })}</p>
            </Card>
            <Card title={t("reference.rules")}>
              <ul className="grid gap-3 text-[13px] leading-relaxed text-ink-2">
                <li>
                  <span className="font-bold text-ink">{t("reference.ruleFlagTitle")}</span>{" "}
                  {settings.flag_impact4_always ? t("reference.ruleFlag4") : t("reference.ruleFlag")}
                </li>
                <li>
                  <span className="font-bold text-ink">{t("reference.ruleEnjeuTitle")}</span> {t("reference.ruleEnjeu")}
                </li>
                <li>
                  <span className="font-bold text-ink">{t("reference.ruleCommitteeTitle")}</span> {t("reference.ruleCommittee")}
                </li>
                <li>
                  <span className="font-bold text-ink">{t("reference.ruleCostTitle")}</span> {t("reference.ruleCost")}
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </Page>
    </>
  )
}
