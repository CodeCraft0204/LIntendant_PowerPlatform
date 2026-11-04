import { describe, expect, it } from "vitest"
import { derive, execFlagOf, levelOf, nextReviewOf, scoreOf, validateRisk } from "./rules.js"

// Expected results for all 25 ratings (SharePoint plan, table 5.5).
// [impact][probability] = [score, level, flagged, weekly]
const EXPECTED = {
  1: [[1, "tres_faible", false, false], [2, "tres_faible", false, false], [3, "tres_faible", false, false], [4, "faible", false, false], [5, "faible", false, false]],
  2: [[2, "tres_faible", false, false], [4, "faible", false, false], [6, "faible", false, false], [8, "moyen", false, true], [10, "moyen", false, true]],
  3: [[3, "tres_faible", false, false], [6, "faible", false, false], [9, "moyen", true, true], [12, "eleve", true, true], [15, "eleve", true, true]],
  4: [[4, "faible", false, false], [8, "moyen", false, true], [12, "eleve", true, true], [16, "eleve", true, true], [20, "critique", true, true]],
  5: [[5, "faible", true, false], [10, "moyen", true, true], [15, "eleve", true, true], [20, "critique", true, true], [25, "critique", true, true]],
}

describe("the 25 rating combinations", () => {
  for (const impact of [1, 2, 3, 4, 5]) {
    for (const probability of [1, 2, 3, 4, 5]) {
      const [score, level, flagged, weekly] = EXPECTED[impact][probability - 1]
      it(`P${probability} × I${impact}`, () => {
        expect(scoreOf(probability, impact)).toBe(score)
        expect(levelOf(score)).toBe(level)
        expect(execFlagOf(probability, impact)).toBe(flagged)
        expect(nextReviewOf("2026-11-04", score)).toBe(weekly ? "2026-11-11" : "2026-12-04")
      })
    }
  }
})

describe("open decisions as settings", () => {
  it("impact 4 can be always flagged (D2)", () => {
    expect(execFlagOf(1, 4)).toBe(false)
    expect(execFlagOf(1, 4, { flag_impact4_always: true, weekly_review_min_score: 8 })).toBe(true)
  })

  it("the weekly threshold can move to 9 (D4)", () => {
    expect(nextReviewOf("2026-11-04", 8, { weekly_review_min_score: 9 })).toBe("2026-12-04")
    expect(nextReviewOf("2026-11-04", 9, { weekly_review_min_score: 9 })).toBe("2026-11-11")
  })
})

describe("missing ratings", () => {
  it("leave score, level and next review blank, and the item needs rating", () => {
    const result = derive({ status: "actif", probability: 3, impact: null, last_review: "2026-11-04" })
    expect(result).toMatchObject({ score: null, level: null, next_review: null, exec_flag: false, needs_rating: true })
  })
})

describe("committee and review views", () => {
  it("selects active Élevé and Critique items, or the manual override", () => {
    expect(derive({ status: "actif", probability: 3, impact: 4 }).in_committee).toBe(true)
    expect(derive({ status: "actif", probability: 2, impact: 4 }).in_committee).toBe(false)
    expect(derive({ status: "actif", probability: 2, impact: 4, committee_override: true }).in_committee).toBe(true)
    expect(derive({ status: "ferme", probability: 5, impact: 5 }).in_committee).toBe(false)
  })

  it("flags overdue reviews on or before today", () => {
    const risk = { status: "actif", probability: 2, impact: 2, last_review: "2026-10-01" }
    expect(derive(risk, undefined, "2026-10-31").review_overdue).toBe(true)
    expect(derive(risk, undefined, "2026-10-30").review_overdue).toBe(false)
  })
})

describe("validation", () => {
  const base = { project_id: "p", title: "Retard livraison", status: "actif" }

  it("rejects an enjeu with probability 3 and accepts it with 5", () => {
    expect(validateRisk({ ...base, kind: "enjeu", probability: 3 })).toHaveProperty("probability")
    expect(validateRisk({ ...base, kind: "enjeu", probability: 5 })).not.toHaveProperty("probability")
  })

  it("requires a closure date, except on historical records", () => {
    expect(validateRisk({ ...base, status: "ferme" })).toHaveProperty("closed_date")
    expect(validateRisk({ ...base, status: "ferme" }, { legacyClosed: true })).not.toHaveProperty("closed_date")
  })

  it("rejects negative or fractional delays, and keeps blank cost apart from zero", () => {
    expect(validateRisk({ ...base, delay_days: -1 })).toHaveProperty("delay_days")
    expect(validateRisk({ ...base, delay_days: 2.5 })).toHaveProperty("delay_days")
    expect(validateRisk({ ...base, delay_days: 0, cost: 0 })).toEqual({})
    expect(validateRisk({ ...base, cost: "" })).toEqual({})
  })

  it("requires a complete assessment on new active records", () => {
    const errors = validateRisk(base, { isNew: true })
    expect(Object.keys(errors).sort()).toEqual(["cause", "impact", "kind", "owner_id", "probability", "response_strategy"])
  })

  it("lets imported active records be edited before the campaign ends", () => {
    expect(validateRisk(base)).toEqual({})
    expect(validateRisk(base, { settings: { require_complete_active: true } })).toHaveProperty("cause")
  })
})
