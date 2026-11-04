// Runs supabase/migrations against an in-memory Postgres (PGlite) with small
// stand-ins for Supabase's auth and storage schemas, then checks the rules,
// triggers, journal and access policies. No Supabase project or Docker needed.
//
//   npm run test:db

import { PGlite } from "@electric-sql/pglite"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { execFlagOf, levelOf, nextReviewOf, scoreOf, todayISO } from "../src/domain/rules.js"

const root = fileURLToPath(new URL("..", import.meta.url))
const db = new PGlite()

let passed = 0
let failed = 0
const check = (label, condition, detail = "") => {
  if (condition) {
    passed += 1
    console.log(`  ok  ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL ${label}${detail ? ` (${detail})` : ""}`)
  }
}

async function expectError(label, run, pattern) {
  try {
    await run()
    check(label, false, "no error raised")
  } catch (error) {
    const text = `${error.message} ${error.hint ?? ""} ${error.constraint ?? ""}`
    check(label, pattern.test(text), text)
  }
}

// --- Supabase stand-ins -----------------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create schema storage;
  grant usage on schema storage to anon, authenticated, service_role;
  create table storage.buckets (id text primary key, name text not null, public boolean default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  grant all on storage.objects to authenticated;
`)

// --- Migrations ---------------------------------------------------------------
const dir = join(root, "supabase", "migrations")
for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(join(dir, file), "utf8"))
  console.log(`applied ${file}`)
}

// --- Helpers --------------------------------------------------------------------
const ids = {
  admin: "00000000-0000-0000-0000-0000000000a1",
  pm: "00000000-0000-0000-0000-0000000000b2",
  reader: "00000000-0000-0000-0000-0000000000c3",
  pending: "00000000-0000-0000-0000-0000000000d4",
}

async function asSuperuser() {
  await db.exec("reset role")
  await db.query("select set_config('request.jwt.claim.sub', '', false)")
}

async function as(who) {
  await db.exec("reset role")
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [ids[who]])
  await db.exec("set role authenticated")
}

const one = async (sql, params) => (await db.query(sql, params)).rows[0]
const today = todayISO()

// --- Setup: people, users, a project and an imported record ----------------------
console.log("\nsetup")
await db.query("insert into public.people (full_name, email) values ('Isabelle Leboeuf', 'isabelle@example.com'), ('Simon Tremblay', null)")
for (const [who, email, name] of [
  ["admin", "admin@example.com", "Admin"],
  ["pm", "isabelle@example.com", "Isabelle Leboeuf"],
  ["reader", "lecteur@example.com", "Lecteur"],
  ["pending", "nouveau@example.com", "Nouveau"],
]) {
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [ids[who], email, { full_name: name }])
}
await db.query("update public.profiles set role = 'admin' where id = $1", [ids.admin])
await db.query("update public.profiles set role = 'gestion' where id = $1", [ids.pm])
await db.query("update public.profiles set role = 'lecteur' where id = $1", [ids.reader])

const linked = await one("select profile_id from public.people where full_name = 'Isabelle Leboeuf'")
check("a new account is linked to the person with the same email", linked.profile_id === ids.pm)

const { id: projectId } = await one("insert into public.projects (number, name) values ('25009', 'L''Horizon') returning id")
const { id: ownerId } = await one("select id from public.people where full_name = 'Isabelle Leboeuf'")

const legacyActive = await one(
  `insert into public.risks (project_id, title, status, legacy_type, legacy_created_at, last_review)
   values ($1, 'Délais de réponses des professionnels', 'actif', 'Échéancier', '2026-08-10T08:57:00-04:00', null) returning id`,
  [projectId]
)
const legacyClosed = await one(
  `insert into public.risks (project_id, title, status, legacy_closed_record, legacy_created_at, last_review)
   values ($1, 'Retards coordination architecture/structure', 'ferme', true, '2023-03-01T10:00:00-05:00', null) returning id`,
  [projectId]
)
check("the import can load incomplete active and undated closed records", Boolean(legacyActive.id && legacyClosed.id))
const importEvents = await one("select count(*)::int as n from public.risk_events")
check("imported records add no journal event", importEvents.n === 0)

// --- The 25 ratings: database = browser ------------------------------------------
console.log("\n25 rating combinations (database vs src/domain/rules.js)")
let mismatches = 0
for (let impact = 1; impact <= 5; impact += 1) {
  for (let probability = 1; probability <= 5; probability += 1) {
    const inserted = await one(
      `insert into public.risks (project_id, title, kind, cause, probability, impact, response_strategy, owner_id, last_review)
       values ($1, $2, 'risque', 'technique', $3, $4, 'attenuer', $5, '2026-11-04') returning id`,
      [projectId, `Combinaison P${probability} I${impact}`, probability, impact, ownerId]
    )
    const row = await one("select score, level, exec_flag, next_review::text as next_review from public.risk_register where id = $1", [inserted.id])
    const score = scoreOf(probability, impact)
    const expected = { score, level: levelOf(score), exec_flag: execFlagOf(probability, impact), next_review: nextReviewOf("2026-11-04", score) }
    if (row.score !== expected.score || row.level !== expected.level || row.exec_flag !== expected.exec_flag || row.next_review !== expected.next_review) {
      mismatches += 1
      console.log(`  mismatch P${probability} I${impact}`, row, expected)
    }
  }
}
check("all 25 combinations match", mismatches === 0, `${mismatches} mismatches`)
await db.exec("delete from public.risks where title like 'Combinaison %'")

// --- Project manager -----------------------------------------------------------
console.log("\nproject manager (gestion)")
await as("pm")

await expectError(
  "a new active record must be complete",
  () => db.query("insert into public.risks (project_id, title) values ($1, 'Incomplet')", [projectId]),
  /incomplete_active/
)

const created = await one(
  `insert into public.risks (project_id, title, kind, cause, probability, impact, response_strategy, owner_id)
   values ($1, 'Béton non conforme', 'risque', 'construction', 2, 3, 'attenuer', $2) returning id`,
  [projectId, ownerId]
)
let view = await one("select score, level, exec_flag, next_review::text, created_by from public.risk_register where id = $1", [created.id])
check("P2 × I3 = 6 Faible, not flagged", view.score === 6 && view.level === "faible" && view.exec_flag === false)
check("next review = today + 30", view.next_review === nextReviewOf(today, 6))
check("created_by is the signed-in member", view.created_by === ids.pm)

await db.query("update public.risks set last_review = '2026-10-01' where id = $1", [created.id])
await db.query("update public.risks set probability = 3 where id = $1", [created.id])
view = await one("select score, level, exec_flag, last_review::text from public.risk_register where id = $1", [created.id])
check("P3 × I3 = 9 Moyen, flagged", view.score === 9 && view.level === "moyen" && view.exec_flag === true)
check("a rating change resets the last review to today", view.last_review === today)

let events = (await db.query("select kind, author_name from public.risk_events where risk_id = $1 order by id", [created.id])).rows
check("journal: creation, then modification, then rating", events.map((e) => e.kind).join(",") === "creation,modification,cotation")
check("journal events carry the author's name", events.every((e) => e.author_name === "Isabelle Leboeuf"))

await expectError(
  "an enjeu with probability 3 is refused",
  () => db.query("update public.risks set kind = 'enjeu' where id = $1", [created.id]),
  /enjeu_probability/
)
await db.query("update public.risks set kind = 'enjeu', probability = 5 where id = $1", [created.id])
check("an enjeu with probability 5 saves", (await one("select kind from public.risks where id = $1", [created.id])).kind === "enjeu")

await expectError(
  "closing without a closure date is refused",
  () => db.query("update public.risks set status = 'ferme' where id = $1", [created.id]),
  /closed_needs_date/
)

await db.query("update public.risks set status = 'ferme', closed_date = current_date, impact = 4 where id = $1", [created.id])
events = (await db.query("select kind from public.risk_events where risk_id = $1 order by id desc limit 2", [created.id])).rows
check("rating change + closure in one save = two events", events.map((e) => e.kind).sort().join(",") === "cotation,fermeture")

await db.query("update public.risks set title = 'Retards coordination architecture / structure' where id = $1", [legacyClosed.id])
check("an old closed record (no rating, no date) can be edited", true)

await db.query("update public.risks set status = 'actif' where id = $1", [legacyClosed.id])
const reopened = await one("select legacy_closed_record from public.risks where id = $1", [legacyClosed.id])
check("reopening lifts the historical exemption", reopened.legacy_closed_record === false)
await expectError(
  "closing it again needs a date",
  () => db.query("update public.risks set status = 'ferme' where id = $1", [legacyClosed.id]),
  /closed_needs_date/
)

await db.query("update public.risks set details = 'Relance envoyée' where id = $1", [legacyActive.id])
check("an imported active record can be edited before the campaign ends", true)

await expectError(
  "historical columns are read-only",
  () => db.query("update public.risks set legacy_type = 'Autre' where id = $1", [legacyActive.id]),
  /permission denied/
)

await db.query("insert into public.risk_events (risk_id, kind, note_type, body) values ($1, 'note', 'action', 'Appel au fournisseur')", [created.id])
const note = await one("select author_id, author_name, score_snapshot from public.risk_events where kind = 'note' and risk_id = $1", [created.id])
check("notes record their author and the rating at the time", note.author_id === ids.pm && note.author_name === "Isabelle Leboeuf" && note.score_snapshot === 20)

await expectError(
  "members cannot write automatic events themselves",
  () => db.query("insert into public.risk_events (risk_id, kind) values ($1, 'fermeture')", [created.id]),
  /row-level security/
)

const deleted = await db.query("delete from public.risks where id = $1", [created.id])
check("project managers cannot delete risks", deleted.affectedRows === 0)

await expectError(
  "project managers cannot change settings",
  async () => {
    const result = await db.query("update public.settings set flag_impact4_always = true")
    if (result.affectedRows === 0) throw new Error("row-level security: no row updated")
  },
  /row-level security/
)

// --- Reader and pending account -------------------------------------------------
console.log("\nreader and pending account")
await as("reader")
check("readers see the register", (await one("select count(*)::int as n from public.risk_register")).n > 0)
await expectError(
  "readers cannot add risks",
  () =>
    db.query(
      `insert into public.risks (project_id, title, kind, cause, probability, impact, response_strategy, owner_id)
       values ($1, 'Test', 'risque', 'technique', 1, 1, 'accepter', $2)`,
      [projectId, ownerId]
    ),
  /row-level security/
)

await as("pending")
check("an account without a role sees nothing", (await one("select count(*)::int as n from public.risk_register")).n === 0)

// --- Admin settings (open decisions) -------------------------------------------
console.log("\nadmin settings")
await as("admin")
const probe = await one(
  `insert into public.risks (project_id, title, kind, cause, probability, impact, response_strategy, owner_id, last_review)
   values ($1, 'Sonde', 'risque', 'technique', 1, 4, 'accepter', $2, '2026-11-04') returning id`,
  [projectId, ownerId]
)
check("P1 × I4 is not flagged by default", (await one("select exec_flag from public.risk_register where id = $1", [probe.id])).exec_flag === false)
await db.query("update public.settings set flag_impact4_always = true, weekly_review_min_score = 9")
const probed = await one("select exec_flag from public.risk_register where id = $1", [probe.id])
check("D2 setting: impact 4 always flagged", probed.exec_flag === true)
await db.query("update public.risks set probability = 2 where id = $1", [probe.id])
const eight = await one("select score, next_review::text from public.risk_register where id = $1", [probe.id])
check("D4 setting: score 8 is monthly when the threshold is 9", eight.score === 8 && eight.next_review === nextReviewOf(today, 8, { weekly_review_min_score: 9 }))

await db.query("update public.settings set require_complete_active = true")
await as("pm")
await expectError(
  "after the campaign, an incomplete active record can no longer be saved",
  () => db.query("update public.risks set details = 'Nouvelle relance' where id = $1", [legacyActive.id]),
  /incomplete_active/
)

await asSuperuser()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
