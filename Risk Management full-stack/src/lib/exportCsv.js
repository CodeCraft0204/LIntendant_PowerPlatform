import Papa from "papaparse"
import { labelOf, t } from "../i18n/index.js"
import { riskRef } from "./format.js"

const rating = (group, value) => (value ? `${value} - ${labelOf(group, value)}` : "")
const yesNo = (value) => (value ? t("common.yes") : t("common.no"))

// The register as a spreadsheet, with headers and labels in the interface
// language (UTF-8 with BOM so Excel shows accents).
export function exportRisks(rows, viewId) {
  const data = rows.map((risk) => ({
    [t("csv.ref")]: riskRef(risk.id),
    [t("csv.spId")]: risk.legacy_sp_id ?? "",
    [t("csv.project")]: risk.project_number,
    [t("csv.projectName")]: risk.project_name,
    [t("csv.title")]: risk.title,
    [t("csv.kind")]: labelOf("kind", risk.kind),
    [t("csv.cause")]: labelOf("cause", risk.cause),
    [t("csv.status")]: labelOf("status", risk.status),
    [t("csv.probability")]: rating("probability", risk.probability),
    [t("csv.impact")]: rating("impact", risk.impact),
    [t("csv.score")]: risk.score ?? "",
    [t("csv.level")]: labelOf("level", risk.level),
    [t("csv.flag")]: yesNo(risk.exec_flag),
    [t("csv.cost")]: risk.cost ?? "",
    [t("csv.delay")]: risk.delay_days ?? "",
    [t("csv.owner")]: risk.owner_name ?? "",
    [t("csv.strategy")]: labelOf("strategy", risk.response_strategy),
    [t("csv.strategyDetails")]: risk.strategy_details,
    [t("csv.execContact")]: risk.exec_contact_name ?? "",
    [t("csv.lastReview")]: risk.last_review ?? "",
    [t("csv.nextReview")]: risk.next_review ?? "",
    [t("csv.closedDate")]: risk.closed_date ?? "",
    [t("csv.committee")]: yesNo(risk.committee_override),
    [t("csv.legacyType")]: risk.legacy_type ?? "",
    [t("csv.legacyIndex")]: risk.legacy_risk_index ?? "",
  }))
  const blob = new Blob(["﻿" + Papa.unparse(data)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${t("register.fileName")}-${viewId}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
