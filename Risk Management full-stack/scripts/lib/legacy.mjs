// Reads the SharePoint backup exports of "Risques et enjeux" and turns them
// into rows for the new schema. Shared by the Supabase import
// (import-legacy.mjs) and the offline demo seed (build-demo-seed.mjs).
//
// Inputs (CSV, UTF-8, exported from SharePoint):
//   full   every record ("Tous les éléments" or "Sauvegarde complète"): all
//          columns, ideally with ID and Comité opération
//   ids    optional, a later export with ID and Comité opération (the active
//          view); it adds the SharePoint ID, the committee checkbox and any
//          newer values to the matching records, and brings in records
//          created after the full export
//
// Nothing is inferred that management hasn't approved: kind, cause, ratings,
// response strategy and last review stay empty until the project managers
// reassess (À recoter). Closed records are marked legacy_closed_record.

import Papa from "papaparse"
import { readFileSync } from "node:fs"
import { LEGACY_TYPE_TO_CAUSE } from "../../src/domain/rules.js"

export function readCsv(path) {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "")
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (errors.length) throw new Error(`${path}: ${errors[0].message} (row ${errors[0].row})`)
  return data
}

const clean = (value) => (value ?? "").replace(/\r\n/g, "\n").trim()

// "25009-L'Horizon" → { number: "25009", name: "L'Horizon" }
export function parseProject(value) {
  const text = clean(value)
  const match = text.match(/^(\d+)\s*-\s*(.*)$/)
  return match ? { number: match[1], name: match[2].trim() } : { number: text, name: "" }
}

// SharePoint exports local time as "dd/mm/yyyy HH:MM" (Québec). Converted to
// an ISO timestamp with the America/Toronto offset of that date.
export function parseLocalDate(value, timeZone = "America/Toronto") {
  const match = clean(value).match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/)
  if (!match) return null
  const [, d, m, y, hh = "00", mm = "00"] = match
  const asUtc = Date.UTC(+y, +m - 1, +d, +hh, +mm)
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(asUtc))
      .map((part) => [part.type, part.value])
  )
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute)
  const offsetMinutes = Math.round((shown - asUtc) / 60000)
  const sign = offsetMinutes <= 0 ? "-" : "+"
  const abs = Math.abs(offsetMinutes)
  const offset = `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`
  return `${y}-${m}-${d}T${hh}:${mm}:00${offset}`
}

const number = (value) => {
  const text = clean(value).replace(/\s/g, "").replace(",", ".")
  if (text === "") return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const bool = (value) => /^(true|oui|yes|1)$/i.test(clean(value))

// Column names vary slightly between exports (display names were renamed in
// Phase 1 of the SharePoint plan), so each field accepts several headers.
const COLUMNS = {
  id: ["ID"],
  project: ["25014 - Costco", "Projet", "Projets"],
  title: ["Description", "Titre"],
  status: ["Statut"],
  type: ["Type"],
  cost: ["Impact - Coût ($)", "Impact – Coût ($)", "Coût ($)"],
  delay: ["Impact - Échéancier (jours)", "Impact – Échéancier (jours)", "Délai (jours)"],
  index: ["Indice de risque"],
  strategy: ["Stratégie", "Détails de la stratégie"],
  otherImpacts: ["Autres impacts"],
  owner: ["Propriétaire"],
  attachments: ["Pièces jointes"],
  created: ["Créé"],
  createdBy: ["Créé par"],
  modified: ["Modifié"],
  modifiedBy: ["Modifié par"],
  committee: ["Comité opération"],
}

function field(row, key) {
  for (const header of COLUMNS[key]) if (header in row) return row[header]
  return undefined
}

const has = (rows, key) => rows.length > 0 && COLUMNS[key].some((header) => header in rows[0])

function toRecord(row) {
  const project = parseProject(field(row, "project"))
  const status = /ferm/i.test(clean(field(row, "status"))) ? "ferme" : "actif"
  const id = number(field(row, "id"))
  return {
    legacy_sp_id: id == null ? null : Math.trunc(id),
    project,
    title: clean(field(row, "title")),
    status,
    legacy_type: clean(field(row, "type")) || null,
    cost: number(field(row, "cost")),
    delay_days: number(field(row, "delay")) == null ? null : Math.trunc(number(field(row, "delay"))),
    legacy_risk_index: clean(field(row, "index")) || null,
    strategy_details: clean(field(row, "strategy")),
    legacy_other_impacts: clean(field(row, "otherImpacts")) || null,
    owner_name: clean(field(row, "owner")) || null,
    has_attachments: clean(field(row, "attachments")) === "1" || bool(field(row, "attachments")),
    legacy_created_at: parseLocalDate(field(row, "created")),
    legacy_created_by: clean(field(row, "createdBy")) || null,
    legacy_modified_at: parseLocalDate(field(row, "modified")),
    legacy_modified_by: clean(field(row, "modifiedBy")) || null,
    committee_override: field(row, "committee") === undefined ? null : bool(field(row, "committee")),
    legacy_closed_record: status === "ferme",
  }
}

// Same record in two exports: same project, description and author. Every
// record of the 3 Nov backup is unique on this key.
const keyOf = (record) => [record.project.number, record.title.toLowerCase(), (record.legacy_created_by ?? "").toLowerCase()].join("|")

// Fields an export with wrongly picked columns can leave blank (seen on
// 3 Nov: Stratégie, Autres impacts and Créé), so they never overwrite.
const SAFE_TO_REFRESH = ["title", "status", "legacy_type", "cost", "delay_days", "legacy_risk_index", "owner_name", "legacy_modified_at", "legacy_modified_by", "legacy_closed_record"]

export function loadLegacy({ full, ids, mapCauses = false }) {
  const fullRows = readCsv(full)
  const records = fullRows.map(toRecord)
  const report = {
    full: { file: full, rows: fullRows.length, hasId: has(fullRows, "id"), hasCommittee: has(fullRows, "committee") },
    ids: null,
    matched: 0,
    refreshed: 0,
    added: [],
    unmatched: 0,
  }

  if (ids) {
    const idRows = readCsv(ids)
    const byKey = new Map(records.map((record) => [keyOf(record), record]))
    report.ids = { file: ids, rows: idRows.length, hasId: has(idRows, "id"), hasCommittee: has(idRows, "committee") }

    for (const update of idRows.map(toRecord)) {
      const target = byKey.get(keyOf(update))
      if (!target) {
        // Created after the full export. If that export also lost the Créé
        // column, the last modification date stands in.
        update.legacy_created_at ??= update.legacy_modified_at
        records.push(update)
        report.added.push(`${update.project.number} · ${update.title.slice(0, 60)}`)
        continue
      }
      report.matched += 1
      if (update.legacy_sp_id != null) target.legacy_sp_id = update.legacy_sp_id
      if (update.committee_override != null) target.committee_override = update.committee_override
      if (update.legacy_modified_at && (!target.legacy_modified_at || update.legacy_modified_at > target.legacy_modified_at)) {
        for (const key of SAFE_TO_REFRESH) if (update[key] != null && update[key] !== "") target[key] = update[key]
        report.refreshed += 1
      }
    }
  }

  report.unmatched = records.filter((record) => record.legacy_sp_id == null).length

  for (const record of records) {
    record.committee_override = Boolean(record.committee_override)
    record.legacy_created_at ??= record.legacy_modified_at ?? new Date().toISOString()
    // Optional pre-fill of the approved standard mapping only (D5).
    const mapping = LEGACY_TYPE_TO_CAUSE[record.legacy_type ?? ""]
    record.cause = mapCauses && mapping && !mapping.review ? mapping.cause : null
  }

  // One project per number. The list has spelling variants of a few names
  // ("TNO" / "Tno", "Utile" / "Utile Québec"); the most frequent one wins.
  const names = new Map()
  for (const { project } of records) {
    const counts = names.get(project.number) ?? new Map()
    counts.set(project.name, (counts.get(project.name) ?? 0) + 1)
    names.set(project.number, counts)
  }
  const projects = [...names.entries()]
    .map(([projectNumber, counts]) => ({ number: projectNumber, name: [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => a.number.localeCompare(b.number))
  const people = [...new Set(records.map((record) => record.owner_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"))

  const counts = {
    total: records.length,
    active: records.filter((record) => record.status === "actif").length,
    closed: records.filter((record) => record.status === "ferme").length,
    projects: projects.length,
    people: people.length,
    activeWithoutOwner: records.filter((record) => record.status === "actif" && !record.owner_name).length,
    committee: records.filter((record) => record.status === "actif" && record.committee_override).length,
    withAttachments: records.filter((record) => record.has_attachments).length,
  }

  return { records, projects, people, counts, report }
}

export function printReport({ counts, report }) {
  const line = (label, value) => console.log(`  ${label.padEnd(34)} ${value}`)
  console.log(`\nSource: ${report.full.file}`)
  line("rows", report.full.rows)
  line("has ID / Comité opération", `${report.full.hasId ? "yes" : "no"} / ${report.full.hasCommittee ? "yes" : "no"}`)
  if (report.ids) {
    console.log(`Enriched with: ${report.ids.file}`)
    line("rows", report.ids.rows)
    line("matched / refreshed with newer values", `${report.matched} / ${report.refreshed}`)
    line("added (created after the full export)", report.added.length)
    for (const added of report.added) console.log(`    + ${added}`)
  }
  console.log("Result")
  line("records", `${counts.total} (${counts.active} actifs, ${counts.closed} fermés)`)
  line("projects / owners", `${counts.projects} / ${counts.people}`)
  line("active without owner", counts.activeWithoutOwner)
  line("active on the committee checkbox", counts.committee)
  line("records with attachments", counts.withAttachments)
  line("records without SharePoint ID", report.unmatched)
}
