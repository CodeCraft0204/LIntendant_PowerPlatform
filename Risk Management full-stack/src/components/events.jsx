import { Link } from "react-router"
import { formatDateTime, formatRelative, riskRef } from "../lib/format.js"
import Icon from "./Icon.jsx"
import { LevelBadge } from "./risk.jsx"

const FIELD_LABELS = {
  project_id: "projet",
  title: "titre",
  kind: "risque ou enjeu",
  cause: "cause",
  details: "détails",
  status: "statut",
  cost: "coût",
  delay_days: "délai",
  quality_impact: "qualité",
  hs_impact: "santé et sécurité",
  reputation_impact: "réputation",
  owner_id: "propriétaire",
  response_strategy: "stratégie de réponse",
  strategy_details: "détails de la stratégie",
  exec_contact_id: "répondant direction",
  last_review: "dernière révision",
  closed_date: "date de fermeture",
  committee_override: "comité (manuel)",
}

const NOTE_TYPES = { mise_a_jour: "Mise à jour", action: "Action", decision_comite: "Décision du comité" }
export const NOTE_TYPE_OPTIONS = Object.entries(NOTE_TYPES).map(([code, label]) => ({ code, label }))

const KIND = {
  creation: { icon: "plus", verb: "a créé l'élément" },
  modification: { icon: "pencil", verb: "a modifié" },
  cotation: { icon: "grid", verb: "a révisé la cote" },
  fermeture: { icon: "check_circle", verb: "a fermé l'élément" },
  reouverture: { icon: "refresh", verb: "a rouvert l'élément" },
  note: { icon: "message", verb: "a ajouté une note" },
  piece_jointe: { icon: "paperclip", verb: "a joint un fichier" },
}

function describe(event) {
  const changes = event.changes ?? {}
  if (event.kind === "cotation") {
    const part = (key, letter) => (changes[key] ? `${letter} ${changes[key].old ?? "—"} → ${changes[key].new ?? "—"}` : null)
    return [part("probability", "Probabilité"), part("impact", "Impact")].filter(Boolean).join(" · ")
  }
  if (event.kind === "modification" || event.kind === "fermeture" || event.kind === "reouverture") {
    const fields = Object.keys(changes)
      .filter((key) => key !== "status")
      .map((key) => FIELD_LABELS[key] ?? key)
    return fields.length ? `Champs : ${fields.join(", ")}` : ""
  }
  return event.body
}

export function EventItem({ event, showRisk = false }) {
  const kind = KIND[event.kind] ?? KIND.modification
  const detail = describe(event)
  return (
    <li className="timeline-item">
      <span className="timeline-dot">
        <Icon name={kind.icon} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[13px] leading-snug text-ink-2">
          <span className="font-semibold text-ink">{event.author_name || "Système"}</span> {kind.verb}
          {event.kind === "note" && event.note_type && <span className="tag ml-1.5">{NOTE_TYPES[event.note_type]}</span>}
        </p>
        {showRisk && (
          <Link to={`/risques/${event.risk_id}`} className="mt-0.5 block truncate text-[13px] font-medium text-link hover:underline">
            {riskRef(event.risk_id)} · {event.risk_title}
          </Link>
        )}
        {detail && <p className={`mt-1 text-[13px] leading-relaxed ${event.kind === "note" ? "whitespace-pre-line text-ink" : "text-muted"}`}>{detail}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <time dateTime={event.created_at} title={formatDateTime(event.created_at)}>
            {formatRelative(event.created_at)}
          </time>
          {(event.kind === "cotation" || event.kind === "note") && event.level_snapshot && (
            <LevelBadge level={event.level_snapshot} score={event.score_snapshot} />
          )}
        </p>
      </div>
    </li>
  )
}
