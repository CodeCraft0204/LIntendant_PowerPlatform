// Interface language (Canadian French by default, English on demand).
//
// A tiny store rather than a library: `t()` can be called anywhere (React
// components, the demo backend, error messages, CSV export), and components
// re-render on a change through `useI18n()`. The choice is remembered in this
// browser. Only the interface is translated: what people type (titles, notes,
// the reference-grid wording management maintains) stays as written.

import { useSyncExternalStore } from "react"
import { CAUSES } from "../domain/rules.js"
import en from "./en.js"
import fr from "./fr.js"

const DICTIONARIES = { fr, en }
const LOCALES = { fr: "fr-CA", en: "en-CA" }
const KEY = "lintendant-lang"

export const LANGUAGES = [
  { code: "fr", short: "FR", name: "Français" },
  { code: "en", short: "EN", name: "English" },
]

function initial() {
  try {
    const saved = globalThis.localStorage?.getItem(KEY)
    if (saved && saved in DICTIONARIES) return saved
  } catch {
    // Storage blocked: fall back to French.
  }
  return "fr"
}

let current = initial()
const listeners = new Set()

const lookup = (dictionary, key) => key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dictionary)

// t("risk.created", { date }) → string. A value can be a string with {name}
// placeholders or a function of the parameters (for plurals). A key missing
// in English falls back to French, then to the key itself.
export function t(key, params = {}) {
  const value = lookup(DICTIONARIES[current], key) ?? lookup(fr, key)
  if (typeof value === "function") return value(params)
  if (typeof value !== "string") return key
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
}

// Labels of coded values: labelOf("level", "eleve") → "Élevé" / "High".
export const labelOf = (group, code) => (code == null || code === "" ? "" : t(`${group}.${code}`))

// A cause's description from the reference grid. While management hasn't
// changed Simon's original (French) definition, the built-in translation is
// shown; once they edit it, their wording is shown as written.
const ORIGINAL_CAUSE_HINTS = Object.fromEntries(CAUSES.map((cause) => [cause.code, cause.hint]))
export function causeDescription(stored, code, translate = t) {
  const text = (stored ?? "").trim()
  if (!text || text === ORIGINAL_CAUSE_HINTS[code]) return translate(`causeHint.${code}`)
  return text
}

export const getLang = () => current
export const getLocale = () => LOCALES[current]

function apply() {
  if (typeof document === "undefined") return
  document.documentElement.lang = LOCALES[current]
  document.title = t("app.title")
}

export function setLang(lang) {
  if (!(lang in DICTIONARIES) || lang === current) return
  current = lang
  try {
    globalThis.localStorage?.setItem(KEY, lang)
  } catch {
    // Not remembered in private mode; still applies for this visit.
  }
  apply()
  listeners.forEach((listener) => listener())
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang)
  return { lang, locale: LOCALES[lang], t, labelOf, setLang }
}

apply()
