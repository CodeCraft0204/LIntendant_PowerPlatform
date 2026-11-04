import Papa from "papaparse"
import { CAUSES, IMPACTS, KINDS, LEVEL_BY_CODE, PROBABILITIES, STATUSES, STRATEGIES, labelOf } from "../domain/rules.js"
import { riskRef } from "./format.js"

// The register as a spreadsheet (UTF-8 with BOM so Excel shows accents).
export function exportRisks(rows, fileName = "risques-et-enjeux.csv") {
  const data = rows.map((risk) => ({
    Réf: riskRef(risk.id),
    "ID SharePoint": risk.legacy_sp_id ?? "",
    Projet: risk.project_number,
    "Nom du projet": risk.project_name,
    Titre: risk.title,
    "Risque ou enjeu": labelOf(KINDS, risk.kind),
    Cause: labelOf(CAUSES, risk.cause),
    Statut: labelOf(STATUSES, risk.status),
    Probabilité: risk.probability ? `${risk.probability} - ${labelOf(PROBABILITIES, risk.probability)}` : "",
    Impact: risk.impact ? `${risk.impact} - ${labelOf(IMPACTS, risk.impact)}` : "",
    Score: risk.score ?? "",
    Niveau: risk.level ? LEVEL_BY_CODE[risk.level].label : "",
    "Signalement direction": risk.exec_flag ? "Oui" : "Non",
    "Coût ($)": risk.cost ?? "",
    "Délai (jours)": risk.delay_days ?? "",
    Propriétaire: risk.owner_name ?? "",
    "Stratégie de réponse": labelOf(STRATEGIES, risk.response_strategy),
    "Détails de la stratégie": risk.strategy_details,
    "Répondant direction": risk.exec_contact_name ?? "",
    "Dernière révision": risk.last_review ?? "",
    "Prochaine révision": risk.next_review ?? "",
    "Date de fermeture": risk.closed_date ?? "",
    "Comité (manuel)": risk.committee_override ? "Oui" : "Non",
    "Type (historique)": risk.legacy_type ?? "",
    "Indice de risque (historique)": risk.legacy_risk_index ?? "",
  }))
  const blob = new Blob(["﻿" + Papa.unparse(data)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
