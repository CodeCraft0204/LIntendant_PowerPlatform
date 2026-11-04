import { getLocale, t } from "../i18n/index.js"

// Canadian formats in the interface language: "17 400 000 $" / "$17,400,000",
// "15 déc. 2026" / "Dec 15, 2026". Formatters are built once per locale.
const cache = new Map()
function formatter(kind) {
  const locale = getLocale()
  const key = `${locale}:${kind}`
  if (!cache.has(key)) {
    const options = {
      money: { style: "currency", currency: "CAD", maximumFractionDigits: 0 },
      int: {},
      date: { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
      dateTime: { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
    }[kind]
    cache.set(key, kind === "date" || kind === "dateTime" ? new Intl.DateTimeFormat(locale, options) : new Intl.NumberFormat(locale, options))
  }
  return cache.get(key)
}

export const formatMoney = (value) => (value == null || value === "" ? "—" : formatter("money").format(Number(value)))
export const formatInt = (value) => (value == null ? "—" : formatter("int").format(value))

// Calendar dates ("YYYY-MM-DD") are shown as stored, without time zone shifts.
export function formatDate(value) {
  if (!value) return "—"
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number)
  return formatter("date").format(new Date(Date.UTC(y, m - 1, d)))
}

export function formatDateTime(value) {
  if (!value) return "—"
  return formatter("dateTime").format(new Date(value))
}

export function formatRelative(value, now = Date.now()) {
  if (!value) return ""
  const minutes = Math.round((now - new Date(value).getTime()) / 60000)
  if (minutes < 1) return t("time.now")
  if (minutes < 60) return t("time.minutes", { n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t("time.hours", { n: hours })
  const days = Math.round(hours / 24)
  if (days < 30) return t("time.days", { n: days })
  return formatDateTime(value)
}

export const riskRef = (id) => `R-${String(id).padStart(4, "0")}`

export const initials = (name = "") =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?"
