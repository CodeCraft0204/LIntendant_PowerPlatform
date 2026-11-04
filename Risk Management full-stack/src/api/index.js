import { configured } from "../lib/supabase.js"
import { demoBackend } from "./demoBackend.js"
import { supabaseBackend } from "./supabaseBackend.js"

// One interface, two implementations: Supabase when it is configured, the
// in-browser demo otherwise. Pages only talk to `api`.
export const api = configured ? supabaseBackend : demoBackend
export const isDemo = api.mode === "demo"
