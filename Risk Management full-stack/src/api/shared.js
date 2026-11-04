import { DB_ERRORS } from "../domain/rules.js"

// Columns a person edits; the database grants writes on these only.
export const EDITABLE = [
  "project_id",
  "title",
  "kind",
  "cause",
  "details",
  "status",
  "probability",
  "impact",
  "cost",
  "delay_days",
  "quality_impact",
  "hs_impact",
  "reputation_impact",
  "owner_id",
  "response_strategy",
  "strategy_details",
  "exec_contact_id",
  "last_review",
  "closed_date",
  "committee_override",
]

const TEXT = new Set(["title", "details", "quality_impact", "hs_impact", "reputation_impact", "strategy_details"])
const NUMBER = new Set(["probability", "impact", "cost", "delay_days"])

// Form values (strings from inputs) to database values.
export function toRecord(values) {
  const record = {}
  for (const key of EDITABLE) {
    if (!(key in values)) continue
    const value = values[key]
    if (TEXT.has(key)) record[key] = String(value ?? "").trim()
    else if (NUMBER.has(key)) record[key] = value === "" || value == null ? null : Number(value)
    else if (key === "committee_override") record[key] = Boolean(value)
    else record[key] = value === "" || value === undefined ? null : value
  }
  return record
}

export class ApiError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = "ApiError"
    this.cause = cause
  }
}

// Supabase / PostgREST errors to a readable French message.
export function explain(error) {
  if (!error) return null
  const text = `${error.message ?? ""} ${error.hint ?? ""} ${error.details ?? ""}`
  for (const [code, message] of Object.entries(DB_ERRORS)) if (text.includes(code)) return new ApiError(message, error)
  if (error.code === "42501" || /row-level security|permission denied/i.test(text)) {
    return new ApiError("Action non permise pour votre rôle.", error)
  }
  if (/Failed to fetch|NetworkError/i.test(text)) return new ApiError("Connexion au serveur impossible. Vérifiez votre réseau.", error)
  return new ApiError(error.message || "Une erreur est survenue.", error)
}
