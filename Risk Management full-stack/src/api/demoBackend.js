// Demo mode: the whole register runs in the browser on the SharePoint backup
// (src/demo/seed.generated.json, built by `npm run demo:seed`) or on the small
// fictional sample. Changes are kept in this browser's storage and can be
// reset from Administration. It applies the same rules as the database
// (src/domain/rules.js mirrors the migration), so a demo behaves like the
// real thing: refused saves, journal entries, role permissions.

import backupSeed from "virtual:demo-seed"
import { CAUSES, derive, DEFAULT_SETTINGS, todayISO, validateRisk } from "../domain/rules.js"
import sample from "../demo/sample.js"
import { t } from "../i18n/index.js"
import { saveBlob } from "../lib/files.js"
import { can } from "../lib/roles.js"
import { ApiError, toRecord } from "./shared.js"

// The backup seed is only bundled in demo builds (see vite.config.js), so the
// client data never ships with the Supabase version.
const seed = backupSeed ?? sample

const STORE = "lintendant-risques-demo-v1"
const SESSION = "lintendant-risques-demo-session"
const REFERENCE = [
  ...["Moins de 10 %", "10 à 30 %", "30 à 50 %", "50 à 80 %", "Plus de 80 % ou déjà survenu (enjeu)"].map((text, index) => ({
    scale: "probabilite",
    rating: index + 1,
    label: `${index + 1} - ${["Très improbable", "Improbable", "Modéré", "Probable", "Presque certain"][index]}`,
    description: `${text} (à valider)`,
  })),
  ...["Négligeable", "Mineur", "Modéré", "Majeur", "Sévère"].map((label, index) => ({
    scale: "impact",
    rating: index + 1,
    label: `${index + 1} - ${label}`,
    description: "",
    cost_guide: "À définir par la direction",
    delay_guide: "À définir par la direction",
    quality_guide: "À définir par la direction",
    hs_guide: "À définir par la direction",
    reputation_guide: "À définir par la direction",
  })),
]

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

const write = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: the demo keeps working for this visit.
  }
}

function initialState() {
  const reference = [
    ...REFERENCE,
    ...CAUSES.map((cause, index) => ({ scale: "cause", code: cause.code, label: cause.label, description: cause.hint, sort_order: index + 1 })),
  ].map((row, index) => ({
    id: `ref-${index + 1}`,
    rating: null,
    code: null,
    cost_guide: "",
    delay_guide: "",
    quality_guide: "",
    hs_guide: "",
    reputation_guide: "",
    sort_order: row.rating ?? 0,
    ...row,
  }))
  return {
    version: 1,
    seeded_at: new Date().toISOString(),
    seed_generated_at: seed.generated_at,
    settings: { ...DEFAULT_SETTINGS },
    profiles: seed.profiles,
    people: seed.people,
    projects: seed.projects,
    risks: seed.risks,
    events: [],
    attachments: [],
    reference,
    nextId: Math.max(0, ...seed.risks.map((risk) => risk.id)) + 1,
    nextEventId: 1,
  }
}

let state = null
const files = new Map() // attachment id → object URL (this visit only)
const listeners = new Set()

async function db() {
  if (!state) {
    const stored = read(STORE)
    // A stored demo built from another seed is replaced, so a rebuilt seed shows up.
    state = stored && stored.seed_generated_at === seed.generated_at ? stored : initialState()
  }
  return state
}

const save = () => write(STORE, state)
const pause = () => new Promise((resolve) => setTimeout(resolve, 120))

function currentProfile() {
  const id = read(SESSION)
  return state?.profiles.find((profile) => profile.id === id && profile.active) ?? null
}

function requireRole(check) {
  const profile = currentProfile()
  if (!profile || !check(profile.role)) throw new ApiError(t("errors.forbidden"))
  return profile
}

function registerRow(risk) {
  const project = state.projects.find((item) => item.id === risk.project_id)
  const owner = state.people.find((person) => person.id === risk.owner_id)
  const contact = state.people.find((person) => person.id === risk.exec_contact_id)
  return {
    ...risk,
    ...derive(risk, state.settings, todayISO()),
    project_number: project?.number ?? "",
    project_name: project?.name ?? "",
    owner_name: owner?.full_name ?? null,
    owner_profile_id: owner?.profile_id ?? null,
    exec_contact_name: contact?.full_name ?? null,
    attachment_count: state.attachments.filter((attachment) => attachment.risk_id === risk.id).length,
  }
}

function logEvent(riskId, kind, extra = {}) {
  const profile = currentProfile()
  const risk = state.risks.find((item) => item.id === riskId)
  const { score, level } = derive(risk, state.settings)
  state.events.push({
    id: state.nextEventId++,
    risk_id: riskId,
    kind,
    note_type: null,
    body: "",
    changes: {},
    score_snapshot: score,
    level_snapshot: level,
    author_id: profile?.id ?? null,
    author_name: profile?.full_name ?? "",
    created_at: new Date().toISOString(),
    ...extra,
  })
}

const TRACKED = [
  "project_id", "title", "kind", "cause", "details", "status", "probability", "impact", "cost", "delay_days", "quality_impact", "hs_impact",
  "reputation_impact", "owner_id", "response_strategy", "strategy_details", "exec_contact_id", "last_review", "closed_date", "committee_override",
]

export const demoBackend = {
  mode: "demo",

  auth: {
    async getSession() {
      await db()
      const profile = currentProfile()
      return profile ? { user: { id: profile.id, email: profile.email } } : null
    },
    onChange(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    async accounts() {
      return (await db()).profiles
    },
    async signInAs(profileId) {
      await db()
      write(SESSION, profileId)
      const profile = currentProfile()
      listeners.forEach((listener) => listener(profile ? { user: { id: profile.id, email: profile.email } } : null))
    },
    async signOut() {
      write(SESSION, null)
      listeners.forEach((listener) => listener(null))
    },
    async getProfile(userId) {
      return (await db()).profiles.find((profile) => profile.id === userId) ?? null
    },
  },

  async listRisks() {
    await db()
    await pause()
    return state.risks.map(registerRow)
  },

  async getRisk(id) {
    await db()
    const risk = state.risks.find((item) => item.id === Number(id))
    return risk ? registerRow(risk) : null
  },

  async createRisk(values) {
    await db()
    const profile = requireRole(can.editRisks)
    const record = toRecord(values)
    const errors = validateRisk(record, { isNew: true, settings: state.settings })
    if (Object.keys(errors).length) throw new ApiError(t(Object.values(errors)[0]))
    const now = new Date().toISOString()
    const risk = {
      kind: "risque",
      details: "",
      quality_impact: "",
      hs_impact: "",
      reputation_impact: "",
      strategy_details: "",
      committee_override: false,
      legacy_closed_record: false,
      legacy_sp_id: null,
      legacy_type: null,
      legacy_risk_index: null,
      legacy_other_impacts: null,
      legacy_created_by: null,
      legacy_created_at: null,
      legacy_modified_by: null,
      legacy_modified_at: null,
      last_review: todayISO(),
      ...record,
      id: state.nextId++,
      created_by: profile.id,
      created_at: now,
      updated_at: now,
    }
    if (risk.status === "actif") risk.closed_date = null
    state.risks.push(risk)
    logEvent(risk.id, "creation")
    save()
    return { id: risk.id }
  },

  async updateRisk(id, values) {
    await db()
    requireRole(can.editRisks)
    const risk = state.risks.find((item) => item.id === Number(id))
    if (!risk) throw new ApiError(t("errors.notFound"))
    const before = { ...risk }
    const next = { ...risk, ...toRecord(values) }

    // Same housekeeping as the database trigger.
    if (before.status === "ferme" && next.status === "actif") next.legacy_closed_record = false
    if ((next.probability !== before.probability || next.impact !== before.impact) && next.last_review === before.last_review) next.last_review = todayISO()
    if (next.status === "actif") next.closed_date = null

    const errors = validateRisk(next, { settings: state.settings, legacyClosed: next.legacy_closed_record })
    if (Object.keys(errors).length) throw new ApiError(t(Object.values(errors)[0]))

    const rating = {}
    const other = {}
    for (const key of TRACKED) {
      if ((before[key] ?? null) === (next[key] ?? null)) continue
      const change = { old: before[key] ?? null, new: next[key] ?? null }
      if (key === "probability" || key === "impact") rating[key] = change
      else other[key] = change
    }
    if (Object.keys(rating).length && other.last_review) {
      rating.last_review = other.last_review
      delete other.last_review
    }

    Object.assign(risk, next, { updated_at: new Date().toISOString(), updated_by: currentProfile()?.id ?? null })
    const statusKind = before.status === "actif" && next.status === "ferme" ? "fermeture" : before.status === "ferme" && next.status === "actif" ? "reouverture" : null
    if (Object.keys(rating).length) logEvent(risk.id, "cotation", { changes: rating })
    if (statusKind || Object.keys(other).length) logEvent(risk.id, statusKind ?? "modification", { changes: other })
    save()
  },

  async deleteRisk(id) {
    await db()
    requireRole(can.deleteRisks)
    state.risks = state.risks.filter((risk) => risk.id !== Number(id))
    state.events = state.events.filter((event) => event.risk_id !== Number(id))
    state.attachments = state.attachments.filter((attachment) => attachment.risk_id !== Number(id))
    save()
  },

  async listEvents(riskId) {
    await db()
    return state.events.filter((event) => event.risk_id === Number(riskId)).sort((a, b) => b.id - a.id)
  },

  async listRecentEvents(limit = 12) {
    await db()
    return [...state.events]
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
      .map((event) => {
        const risk = state.risks.find((item) => item.id === event.risk_id)
        const project = state.projects.find((item) => item.id === risk?.project_id)
        return { ...event, risk_title: risk?.title ?? "", project_number: project?.number ?? "", project_name: project?.name ?? "" }
      })
  },

  async addNote(riskId, noteType, body) {
    await db()
    requireRole(can.editRisks)
    if (!body.trim()) throw new ApiError(t("errors.emptyNote"))
    logEvent(Number(riskId), "note", { note_type: noteType, body: body.trim() })
    save()
  },

  async listAttachments(riskId) {
    await db()
    return state.attachments.filter((attachment) => attachment.risk_id === Number(riskId))
  },

  async uploadAttachment(riskId, file) {
    await db()
    const profile = requireRole(can.editRisks)
    const attachment = {
      id: crypto.randomUUID(),
      risk_id: Number(riskId),
      storage_path: `demo/${file.name}`,
      file_name: file.name,
      size_bytes: file.size,
      content_type: file.type || null,
      uploaded_by: profile.id,
      uploaded_at: new Date().toISOString(),
    }
    files.set(attachment.id, URL.createObjectURL(file))
    state.attachments.push(attachment)
    logEvent(Number(riskId), "piece_jointe", { body: file.name })
    save()
  },

  async attachmentUrl(attachment) {
    const url = files.get(attachment.id)
    if (!url) throw new ApiError(t("errors.demoFile"))
    return url
  },

  async downloadAttachment(attachment) {
    const url = files.get(attachment.id)
    if (!url) throw new ApiError(t("errors.demoFile"))
    saveBlob(await (await fetch(url)).blob(), attachment.file_name)
  },

  async deleteAttachment(attachment) {
    await db()
    requireRole(can.removeAttachments)
    state.attachments = state.attachments.filter((item) => item.id !== attachment.id)
    files.delete(attachment.id)
    save()
  },

  async listProjects() {
    return [...(await db()).projects].sort((a, b) => a.number.localeCompare(b.number))
  },

  async saveProject(project) {
    await db()
    requireRole(can.manageDirectory)
    const number = project.number.trim()
    if (!number) throw new ApiError(t("errors.projectNumberRequired"))
    if (state.projects.some((item) => item.number === number && item.id !== project.id)) throw new ApiError(t("errors.projectExists"))
    if (project.id) Object.assign(state.projects.find((item) => item.id === project.id), { number, name: project.name.trim(), active: project.active ?? true })
    else state.projects.push({ id: crypto.randomUUID(), number, name: project.name.trim(), active: true })
    save()
  },

  async listPeople() {
    return [...(await db()).people].sort((a, b) => a.full_name.localeCompare(b.full_name, "fr"))
  },

  async savePerson(person) {
    await db()
    requireRole(can.manageDirectory)
    const full_name = person.full_name.trim()
    if (!full_name) throw new ApiError(t("errors.nameRequired"))
    if (state.people.some((item) => item.full_name.toLowerCase() === full_name.toLowerCase() && item.id !== person.id)) throw new ApiError(t("errors.personExists"))
    const record = { full_name, email: person.email?.trim() || null, active: person.active ?? true }
    if (person.id) Object.assign(state.people.find((item) => item.id === person.id), record)
    else state.people.push({ id: crypto.randomUUID(), profile_id: null, ...record })
    save()
  },

  async listReference() {
    return (await db()).reference
  },

  async saveReference(row) {
    await db()
    requireRole(can.editReference)
    Object.assign(state.reference.find((item) => item.id === row.id), row)
    save()
  },

  async getSettings() {
    return (await db()).settings
  },

  async saveSettings(values) {
    await db()
    requireRole(can.changeSettings)
    state.settings = { ...state.settings, ...values }
    save()
  },

  async listMembers() {
    return (await db()).profiles
  },

  async setMemberAccess(id, role, active) {
    await db()
    const me = requireRole(can.manageTeam)
    if (id === me.id && (role !== "admin" || !active)) throw new ApiError(t("errors.ownAccess"))
    Object.assign(state.profiles.find((profile) => profile.id === id), { role, active })
    save()
  },

  // Demo only
  info: () => ({ seedGeneratedAt: seed.generated_at, fromBackup: Boolean(backupSeed) }),
  async reset() {
    write(STORE, null)
    state = null
    files.clear()
    await db()
  },
}
