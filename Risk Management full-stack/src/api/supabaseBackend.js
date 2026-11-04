import { supabase } from "../lib/supabase.js"
import { explain, toRecord } from "./shared.js"

const run = async (promise) => {
  const { data, error } = await promise
  if (error) throw explain(error)
  return data
}

// PostgREST returns at most 1000 rows per request.
async function selectAll(build) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const data = await run(build().range(from, from + 999))
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

const safeName = (name) => name.normalize("NFC").replace(/[^\w.\- ()À-ÿ]/g, "_")

export const supabaseBackend = {
  mode: "supabase",

  auth: {
    async getSession() {
      const { data } = await supabase.auth.getSession()
      return data.session
    },
    onChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
      return () => data.subscription.unsubscribe()
    },
    async signInWithPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw explain(error.message === "Invalid login credentials" ? { message: "Courriel ou mot de passe invalide." } : error)
    },
    async signInWithLink(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
      })
      if (error) throw explain(error)
    },
    async signInWithMicrosoft() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: { scopes: "email", redirectTo: window.location.origin },
      })
      if (error) throw explain(error)
    },
    async signOut() {
      await supabase.auth.signOut()
    },
    async getProfile(userId) {
      return run(supabase.from("profiles").select("id, email, full_name, role, active").eq("id", userId).maybeSingle())
    },
  },

  listRisks: () => selectAll(() => supabase.from("risk_register").select("*").order("id")),

  getRisk: (id) => run(supabase.from("risk_register").select("*").eq("id", id).maybeSingle()),

  async createRisk(values) {
    return run(supabase.from("risks").insert(toRecord(values)).select("id").single())
  },

  async updateRisk(id, values) {
    await run(supabase.from("risks").update(toRecord(values)).eq("id", id))
  },

  async deleteRisk(id) {
    await run(supabase.from("risks").delete().eq("id", id))
  },

  listEvents: (riskId) =>
    run(supabase.from("risk_events").select("*").eq("risk_id", riskId).order("created_at", { ascending: false }).order("id", { ascending: false })),

  listRecentEvents: (limit = 12) =>
    run(
      supabase
        .from("risk_events")
        .select("*, risks(title, projects(number, name))")
        .order("created_at", { ascending: false })
        .limit(limit)
    ).then((rows) =>
      rows.map(({ risks, ...event }) => ({
        ...event,
        risk_title: risks?.title ?? "",
        project_number: risks?.projects?.number ?? "",
        project_name: risks?.projects?.name ?? "",
      }))
    ),

  async addNote(riskId, noteType, body) {
    await run(supabase.from("risk_events").insert({ risk_id: riskId, kind: "note", note_type: noteType, body }))
  },

  listAttachments: (riskId) => run(supabase.from("risk_attachments").select("*").eq("risk_id", riskId).order("uploaded_at", { ascending: false })),

  async uploadAttachment(riskId, file) {
    const path = `${riskId}/${crypto.randomUUID()}-${safeName(file.name)}`
    const { error: uploadError } = await supabase.storage.from("risk-attachments").upload(path, file, { contentType: file.type || undefined })
    if (uploadError) throw explain(uploadError)
    const { error } = await supabase
      .from("risk_attachments")
      .insert({ risk_id: riskId, storage_path: path, file_name: file.name, size_bytes: file.size, content_type: file.type || null })
    if (error) {
      await supabase.storage.from("risk-attachments").remove([path])
      throw explain(error)
    }
  },

  async attachmentUrl(attachment) {
    const data = await run(supabase.storage.from("risk-attachments").createSignedUrl(attachment.storage_path, 300, { download: attachment.file_name }))
    return data.signedUrl
  },

  async deleteAttachment(attachment) {
    await run(supabase.from("risk_attachments").delete().eq("id", attachment.id))
    await supabase.storage.from("risk-attachments").remove([attachment.storage_path])
  },

  listProjects: () => selectAll(() => supabase.from("projects").select("*").order("number")),
  async saveProject(project) {
    const record = { number: project.number.trim(), name: project.name.trim(), active: project.active ?? true }
    if (project.id) await run(supabase.from("projects").update(record).eq("id", project.id))
    else await run(supabase.from("projects").insert(record))
  },

  listPeople: () => selectAll(() => supabase.from("people").select("*").order("full_name")),
  async savePerson(person) {
    const record = { full_name: person.full_name.trim(), email: person.email?.trim() || null, active: person.active ?? true }
    if (person.id) await run(supabase.from("people").update(record).eq("id", person.id))
    else await run(supabase.from("people").insert(record))
  },

  listReference: () => run(supabase.from("reference_guides").select("*").order("scale").order("sort_order")),
  async saveReference(row) {
    const { id, label, description, cost_guide, delay_guide, quality_guide, hs_guide, reputation_guide } = row
    await run(
      supabase.from("reference_guides").update({ label, description, cost_guide, delay_guide, quality_guide, hs_guide, reputation_guide }).eq("id", id)
    )
  },

  getSettings: () => run(supabase.from("settings").select("*").single()),
  async saveSettings(values) {
    const { weekly_review_min_score, flag_impact4_always, require_complete_active } = values
    await run(supabase.from("settings").update({ weekly_review_min_score, flag_impact4_always, require_complete_active }).eq("id", true))
  },

  listMembers: () => run(supabase.from("profiles").select("id, email, full_name, role, active, created_at").order("created_at")),
  async setMemberAccess(id, role, active) {
    await run(supabase.rpc("set_member_access", { member: id, new_role: role, is_active: active }))
  },
}
