// Imports the SharePoint backup into Supabase (projects, people, risks and,
// optionally, attachments). Uses the service-role key, so run it from a
// trusted machine only; the key never goes to the browser.
//
//   npm run import:legacy                      dry run: reads the CSVs, prints the counts
//   npm run import:legacy -- --apply           writes to Supabase
//   npm run import:legacy -- --apply --map-causes
//                                              also pre-fills Cause from the standard
//                                              Type mapping (only once Simon approved it)
//   npm run import:legacy -- --attachments-template
//                                              writes attachments-map.csv to fill in
//   npm run import:legacy -- --apply --attachments attachments-map.csv
//                                              uploads the mapped attachment files
//
// Options --full "<file.csv>" and --ids "<file.csv>" override the default
// backup files in ../Risk Management. Re-running is safe: records already
// imported (same project, title and creation date) are skipped.
//
// Environment (.env.local or the shell): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import Papa from "papaparse"
import { contentTypeOf, storageSafeName } from "../src/lib/files.js"
import { loadLegacy, printReport, readCsv } from "./lib/legacy.mjs"
import { defaultSources } from "./lib/sources.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const args = process.argv.slice(2)
// Windows PowerShell drops the "--" in `npm run import:legacy -- --apply`, so
// npm keeps the flag for itself (npm_config_apply=true) instead of passing it
// on. Both forms are accepted.
const flag = (name) => args.includes(`--${name}`) || process.env[`npm_config_${name.replace(/-/g, "_")}`] === "true"
const option = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

// .env.local, without a dependency
for (const file of [".env.local", ".env"]) {
  const path = join(root, file)
  if (!existsSync(path)) continue
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
  }
}

const sources = defaultSources(root)
const full = resolve(option("full") ?? sources.full)
const ids = option("ids") ? resolve(option("ids")) : sources.ids
const attachmentsFolder = resolve(option("attachments-folder") ?? join(root, "..", "Risk Management", "Backup_2026-11-03_attachments"))

const legacy = loadLegacy({ full, ids, mapCauses: flag("map-causes") })
printReport(legacy)

// --- Attachment mapping template ---------------------------------------------------
if (flag("attachments-template")) {
  const files = existsSync(attachmentsFolder) ? readdirSync(attachmentsFolder).sort((a, b) => a.localeCompare(b, "fr")) : []
  const withFiles = legacy.records.filter((record) => record.has_attachments)
  writeFileSync(
    join(root, "attachments-map.csv"),
    "﻿" +
      Papa.unparse(files.map((file) => ({ file, project_number: (file.match(/^(\d{5,6})\b/) ?? [])[1] ?? "", title_starts_with: "" })))
  )
  writeFileSync(
    join(root, "records-with-attachments.csv"),
    "﻿" +
      Papa.unparse(
        withFiles.map((record) => ({
          project_number: record.project.number,
          project: record.project.name,
          status: record.status,
          title: record.title,
          sharepoint_id: record.legacy_sp_id ?? "",
        }))
      )
  )
  console.log(`\nWrote attachments-map.csv (${files.length} files) and records-with-attachments.csv (${withFiles.length} records).`)
  console.log("For each file, fill in project_number and the first words of the record's title (title_starts_with).")
  process.exit(0)
}

if (!flag("apply")) {
  console.log("\nDry run: nothing written. Add --apply to import.")
  process.exit(0)
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("\nSet SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local) to import.")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const fail = (step, error) => {
  console.error(`\n${step} failed: ${error.message}`)
  process.exit(1)
}

async function selectAll(table, columns, filter = (query) => query) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(supabase.from(table).select(columns)).range(from, from + 999)
    if (error) fail(`Reading ${table}`, error)
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

// Projects
{
  const { error } = await supabase.from("projects").upsert(legacy.projects, { onConflict: "number", ignoreDuplicates: true })
  if (error) fail("Projects", error)
}
const projectId = new Map((await selectAll("projects", "id, number")).map((project) => [project.number, project.id]))

// People
{
  const existing = new Set((await selectAll("people", "full_name")).map((person) => person.full_name.toLowerCase()))
  const missing = legacy.people.filter((name) => !existing.has(name.toLowerCase())).map((full_name) => ({ full_name }))
  if (missing.length) {
    const { error } = await supabase.from("people").insert(missing)
    if (error) fail("People", error)
  }
}
const personId = new Map((await selectAll("people", "id, full_name")).map((person) => [person.full_name.toLowerCase(), person.id]))

// Risks
const keyOf = (number, title, createdAt) => `${number}|${title}|${new Date(createdAt).toISOString()}`
const imported = new Set(
  (await selectAll("risks", "title, legacy_created_at, projects(number)", (query) => query.not("legacy_created_at", "is", null))).map((risk) =>
    keyOf(risk.projects.number, risk.title, risk.legacy_created_at)
  )
)

const rows = legacy.records
  .filter((record) => !imported.has(keyOf(record.project.number, record.title, record.legacy_created_at)))
  .map((record) => ({
    project_id: projectId.get(record.project.number),
    title: record.title,
    kind: null,
    cause: record.cause,
    status: record.status,
    cost: record.cost,
    delay_days: record.delay_days,
    owner_id: record.owner_name ? personId.get(record.owner_name.toLowerCase()) ?? null : null,
    strategy_details: record.strategy_details,
    last_review: null,
    committee_override: record.committee_override,
    legacy_closed_record: record.legacy_closed_record,
    legacy_sp_id: record.legacy_sp_id,
    legacy_type: record.legacy_type,
    legacy_risk_index: record.legacy_risk_index,
    legacy_other_impacts: record.legacy_other_impacts,
    legacy_created_by: record.legacy_created_by,
    legacy_created_at: record.legacy_created_at,
    legacy_modified_by: record.legacy_modified_by,
    legacy_modified_at: record.legacy_modified_at,
    created_at: record.legacy_created_at,
  }))

for (let from = 0; from < rows.length; from += 200) {
  const { error } = await supabase.from("risks").insert(rows.slice(from, from + 200))
  if (error) fail(`Risks ${from + 1}–${from + 200}`, error)
}
console.log(`\nImported ${rows.length} risks (${legacy.records.length - rows.length} already present).`)

// Attachments
const mapFile = option("attachments")
if (mapFile) {
  const mapping = readCsv(resolve(mapFile)).filter((row) => row.file && row.project_number && row.title_starts_with)
  const risks = await selectAll("risks", "id, title, projects(number)", (query) => query.not("legacy_created_at", "is", null))
  const existing = new Set((await selectAll("risk_attachments", "file_name, risk_id")).map((row) => `${row.risk_id}|${row.file_name}`))
  let uploaded = 0
  const problems = []

  for (const row of mapping) {
    const prefix = row.title_starts_with.trim().toLowerCase()
    const matches = risks.filter((risk) => risk.projects.number === row.project_number.trim() && risk.title.toLowerCase().startsWith(prefix))
    if (matches.length !== 1) {
      problems.push(`${row.file}: ${matches.length} matching records`)
      continue
    }
    const risk = matches[0]
    const fileName = basename(row.file)
    if (existing.has(`${risk.id}|${fileName}`)) continue

    const path = `${risk.id}/${randomUUID()}-${storageSafeName(fileName)}`
    const body = readFileSync(join(attachmentsFolder, row.file))
    const contentType = contentTypeOf(fileName)
    const { error: uploadError } = await supabase.storage.from("risk-attachments").upload(path, body, { upsert: false, contentType })
    if (uploadError) {
      problems.push(`${row.file}: ${uploadError.message}`)
      continue
    }
    const { error } = await supabase
      .from("risk_attachments")
      .insert({ risk_id: risk.id, storage_path: path, file_name: fileName, size_bytes: body.length, content_type: contentType })
    if (error) problems.push(`${row.file}: ${error.message}`)
    else uploaded += 1
  }

  console.log(`Uploaded ${uploaded} attachments.`)
  for (const problem of problems) console.log(`  ! ${problem}`)
}
