// French (Canada) formatting, as in the ERP: "17 400 000 $", "15 déc. 2026".

const money = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
const compactMoney = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", notation: "compact", maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat("fr-CA")
const shortDate = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
const dateTime = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export const formatMoney = (value) => (value == null || value === "" ? "—" : money.format(Number(value)))
export const formatMoneyCompact = (value) => (value == null ? "—" : compactMoney.format(Number(value)))
export const formatInt = (value) => (value == null ? "—" : integer.format(value))

// Calendar dates ("YYYY-MM-DD") are shown as stored, without time zone shifts.
export function formatDate(value) {
  if (!value) return "—"
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number)
  return shortDate.format(new Date(Date.UTC(y, m - 1, d)))
}

export function formatDateTime(value) {
  if (!value) return "—"
  return dateTime.format(new Date(value))
}

export function formatRelative(value, now = Date.now()) {
  if (!value) return ""
  const minutes = Math.round((now - new Date(value).getTime()) / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 30) return `il y a ${days} j`
  return formatDateTime(value)
}

export const riskRef = (id) => `R-${String(id).padStart(4, "0")}`

export const projectLabel = (risk) => [risk.project_number, risk.project_name].filter(Boolean).join(" · ")

export const initials = (name = "") =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?"
