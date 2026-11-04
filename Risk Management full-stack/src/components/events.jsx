import { Link } from "react-router"
import { useI18n } from "../i18n/index.js"
import { formatDateTime, formatRelative, riskRef } from "../lib/format.js"
import Icon from "./Icon.jsx"
import { LevelBadge } from "./risk.jsx"

export const NOTE_TYPES = ["mise_a_jour", "action", "decision_comite"]

const ICONS = {
  creation: "plus",
  modification: "pencil",
  cotation: "grid",
  fermeture: "check_circle",
  reouverture: "refresh",
  note: "message",
  piece_jointe: "paperclip",
}

function describe(event, t) {
  const changes = event.changes ?? {}
  if (event.kind === "cotation") {
    const part = (key, label) => (changes[key] ? `${label} ${changes[key].old ?? "—"} → ${changes[key].new ?? "—"}` : null)
    return [part("probability", t("event.probability")), part("impact", t("event.impact"))].filter(Boolean).join(" · ")
  }
  if (event.kind === "modification" || event.kind === "fermeture" || event.kind === "reouverture") {
    const fields = Object.keys(changes)
      .filter((key) => key !== "status")
      .map((key) => t(`field.${key}`))
    return fields.length ? t("event.fields", { list: fields.join(", ") }) : ""
  }
  return event.body
}

export function EventItem({ event, showRisk = false }) {
  const { t, labelOf } = useI18n()
  const kind = ICONS[event.kind] ? event.kind : "modification"
  const detail = describe(event, t)
  return (
    <li className="timeline-item">
      <span className="timeline-dot">
        <Icon name={ICONS[kind]} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[13px] leading-snug text-ink-2">
          <span className="font-semibold text-ink">{event.author_name || t("event.system")}</span> {t(`event.${kind}`)}
          {event.kind === "note" && event.note_type && <span className="tag ml-1.5">{labelOf("noteType", event.note_type)}</span>}
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
