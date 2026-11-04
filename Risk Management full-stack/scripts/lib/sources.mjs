import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { readCsv } from "./legacy.mjs"

// Default backup files, in ../Risk Management:
//   full  the largest export (every record); prefers one that has the ID column
//   ids   "Sauvegarde complète_with ID.csv" when present
export function defaultSources(root) {
  const folder = join(root, "..", "Risk Management")
  if (!existsSync(folder)) return { full: join(folder, "Sauvegarde complète.csv"), ids: undefined }

  const files = readdirSync(folder)
    .filter((name) => name.toLowerCase().endsWith(".csv"))
    .map((name) => {
      const path = join(folder, name)
      const rows = readCsv(path)
      return { path, name, rows: rows.length, hasId: rows.length > 0 && "ID" in rows[0] }
    })

  const largest = Math.max(0, ...files.map((file) => file.rows))
  const complete = files.filter((file) => file.rows === largest)
  const full = (complete.find((file) => file.hasId) ?? complete[0])?.path
  const ids = files.find((file) => /with id/i.test(file.name) && file.path !== full)?.path

  return { full, ids }
}
