import { useState } from "react"
import { useReference, useSaveReference, useSettings } from "../api/hooks.js"
import Icon from "../components/Icon.jsx"
import { LevelBadge } from "../components/risk.jsx"
import { Alert, Card, Field, Page, PageHeader, PageSpinner, toast } from "../components/ui.jsx"
import { LEVELS } from "../domain/rules.js"
import { useAuth } from "../lib/auth.jsx"
import { can } from "../lib/roles.js"

// Scores that can actually occur in each band (products of two ratings).
const SCORE_RANGES = { tres_faible: "1–3", faible: "4–6", moyen: "8–10", eleve: "12–16", critique: "20–25" }
const BAND_MAX = { tres_faible: 3, faible: 6, moyen: 10, eleve: 16, critique: 25 }

const IMPACT_GUIDES = [
  ["cost_guide", "Coût"],
  ["delay_guide", "Délai"],
  ["quality_guide", "Qualité"],
  ["hs_guide", "Santé et sécurité"],
  ["reputation_guide", "Réputation"],
]

function EditRow({ row, fields, onDone }) {
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
          toast("Grille de référence mise à jour")
          onDone()
        } catch (failure) {
          setError(failure.message)
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <Field key={key} label={label} htmlFor={`${row.id}-${key}`} className={key === "description" ? "sm:col-span-2" : ""}>
            <textarea id={`${row.id}-${key}`} className="input" rows={2} value={draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
          </Field>
        ))}
      </div>
      <Alert>{error}</Alert>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDone}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={save.isPending}>
          Enregistrer
        </button>
      </div>
    </form>
  )
}

function Scale({ title, rows, fields, editable, render }) {
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
                    Modifier
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
  const { role } = useAuth()
  const { data: reference, isLoading, error } = useReference()
  const { settings } = useSettings()
  const editable = can.editReference(role)

  if (isLoading) return <PageSpinner />
  const scale = (name) => (reference ?? []).filter((row) => row.scale === name).sort((a, b) => a.sort_order - b.sort_order)
  const pending = (text) => /à valider|à définir/i.test(text ?? "")

  return (
    <>
      <PageHeader
        eyebrow="Référence"
        title="Grille de référence"
        subtitle="Comment coter la probabilité et l'impact, et ce que couvre chaque cause. La direction tient ces descriptions à jour ici, sans modifier le formulaire."
      />
      <Page>
        <Alert>{error?.message}</Alert>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-5">
            <Scale
              title="Probabilité"
              rows={scale("probabilite")}
              editable={editable}
              fields={[
                ["label", "Libellé"],
                ["description", "Description"],
              ]}
              render={(row) => (
                <>
                  <p className="text-sm font-bold text-ink">{row.label}</p>
                  <p className={`mt-0.5 text-[13px] ${pending(row.description) ? "text-warn" : "text-ink-2"}`}>{row.description || "—"}</p>
                </>
              )}
            />

            <Scale
              title="Impact"
              rows={scale("impact")}
              editable={editable}
              fields={[["label", "Libellé"], ["description", "Description"], ...IMPACT_GUIDES]}
              render={(row) => (
                <>
                  <p className="text-sm font-bold text-ink">{row.label}</p>
                  {row.description && <p className="mt-0.5 text-[13px] text-ink-2">{row.description}</p>}
                  <dl className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                    {IMPACT_GUIDES.map(([key, label]) => (
                      <div key={key} className="contents">
                        <dt className="text-muted">{label}</dt>
                        <dd className={pending(row[key]) ? "text-warn" : "text-ink-2"}>{row[key] || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            />

            <Scale
              title="Causes"
              rows={scale("cause")}
              editable={editable}
              fields={[["description", "Description"]]}
              render={(row) => (
                <>
                  <p className="text-sm font-bold text-ink">{row.label}</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">{row.description}</p>
                </>
              )}
            />
          </div>

          <aside className="grid content-start gap-5">
            <Card title="Niveaux et révisions">
              <table className="table">
                <thead>
                  <tr>
                    <th>Score</th>
                    <th>Niveau</th>
                    <th>Révision</th>
                  </tr>
                </thead>
                <tbody>
                  {[...LEVELS].reverse().map((level) => {
                    const threshold = settings.weekly_review_min_score
                    const review =
                      level.min >= threshold ? "7 jours" : BAND_MAX[level.code] >= threshold ? `30 j · 7 j dès ${threshold}` : "30 jours"
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
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Score = probabilité × impact. Seuls les produits de deux cotes existent (7, 11, 13… sont impossibles). Révision hebdomadaire à partir d'un
                score de {settings.weekly_review_min_score}.
              </p>
            </Card>
            <Card title="Règles">
              <ul className="grid gap-3 text-[13px] leading-relaxed text-ink-2">
                <li>
                  <span className="font-bold text-ink">Signalement direction :</span> impact 5 toujours ; impact {settings.flag_impact4_always ? "4 toujours ; impact 3" : "3 et 4"} si
                  la probabilité est modérée (3) ou plus.
                </li>
                <li>
                  <span className="font-bold text-ink">Enjeu :</span> événement déjà survenu, probabilité fixée à 5.
                </li>
                <li>
                  <span className="font-bold text-ink">Comité d'opération :</span> éléments actifs Élevé et Critique, plus ceux cochés manuellement.
                </li>
                <li>
                  <span className="font-bold text-ink">Coût :</span> vide = non estimé ; 0 = estimé à zéro.
                </li>
              </ul>
            </Card>
          </aside>
        </div>
      </Page>
    </>
  )
}
