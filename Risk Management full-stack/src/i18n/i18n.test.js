import { afterEach, describe, expect, it } from "vitest"
import { CAUSES, IMPACTS, KINDS, LEVELS, PROBABILITIES, STATUSES, STRATEGIES } from "../domain/rules.js"
import { VIEWS } from "../domain/views.js"
import { ROLES, SECTIONS } from "../lib/roles.js"
import en from "./en.js"
import fr from "./fr.js"
import { causeDescription, getLang, labelOf, setLang, t } from "./index.js"

// Every key path with the kind of value ("string" or "function").
function shape(node, prefix = "") {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === "object" ? shape(value, path) : [[path, typeof value]]
  })
}

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

afterEach(() => setLang("fr"))

describe("dictionaries", () => {
  it("French and English have exactly the same keys", () => {
    const frKeys = shape(fr)
    const enKeys = shape(en)
    expect(enKeys.map(([path]) => path).sort()).toEqual(frKeys.map(([path]) => path).sort())
    expect(Object.fromEntries(enKeys)).toEqual(Object.fromEntries(frKeys))
  })

  it("use the same {placeholders} in both languages", () => {
    for (const [path, kind] of shape(fr)) {
      if (kind !== "string") continue
      expect(placeholders(t(path)), path).toEqual(placeholders(path.split(".").reduce((node, part) => node[part], en)))
    }
  })

  it("label every coded value of the rules, views, roles and sections", () => {
    for (const lang of ["fr", "en"]) {
      setLang(lang)
      const missing = [
        ...PROBABILITIES.map(({ value }) => `probability.${value}`),
        ...IMPACTS.map(({ value }) => `impact.${value}`),
        ...LEVELS.map(({ code }) => `level.${code}`),
        ...KINDS.flatMap(({ code }) => [`kind.${code}`, `kindHint.${code}`]),
        ...STATUSES.map(({ code }) => `status.${code}`),
        ...STRATEGIES.map(({ code }) => `strategy.${code}`),
        ...CAUSES.flatMap(({ code }) => [`cause.${code}`, `causeHint.${code}`]),
        ...VIEWS.flatMap((view) => [`view.${view.id}`, ...(view.hint ? [`viewHint.${view.id}`] : [])]),
        ...ROLES.flatMap((role) => [`role.${role}`, `roleDescription.${role}`]),
        ...SECTIONS.map((section) => `section.${section.path}`),
      ].filter((key) => t(key) === key)
      expect(missing, lang).toEqual([])
    }
  })
})

describe("t()", () => {
  it("switches language, interpolates and pluralizes", () => {
    expect(getLang()).toBe("fr")
    expect(labelOf("level", "eleve")).toBe("Élevé")
    expect(t("nav.toRate", { count: 1 })).toBe("1 élément à recoter")
    expect(t("nav.toRate", { count: 3 })).toBe("3 éléments à recoter")

    setLang("en")
    expect(labelOf("level", "eleve")).toBe("High")
    expect(t("nav.toRate", { count: 1 })).toBe("1 item to re-rate")
    expect(t("nav.toRate", { count: 0 })).toBe("0 items to re-rate")
    expect(t("register.cellChip", { p: 3, i: 4 })).toBe("Cell P3 × I4")
  })

  it("translates an unchanged cause description, but keeps management's edits as written", () => {
    const original = CAUSES.find((cause) => cause.code === "externe").hint
    setLang("en")
    expect(causeDescription(original, "externe")).toBe("Weather, environmental conditions, regulations, utility capacity, etc.")
    expect(causeDescription("", "externe")).toBe("Weather, environmental conditions, regulations, utility capacity, etc.")
    expect(causeDescription("Météo et crues printanières", "externe")).toBe("Météo et crues printanières")
    setLang("fr")
    expect(causeDescription(original, "externe")).toBe(original)
  })

  it("returns the key for unknown keys and ignores unknown languages", () => {
    expect(t("nope.missing")).toBe("nope.missing")
    setLang("de")
    expect(getLang()).toBe("fr")
  })
})
