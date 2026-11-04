import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// The browser only ever gets the publishable (anon) key; row level security in
// supabase/migrations decides what each signed-in member can read and change.
// Without these variables (or with VITE_DEMO=1) the app runs in demo mode on
// local data, so it can be shown before the Supabase project exists.
export const configured = Boolean(url && key) && import.meta.env.VITE_DEMO !== "1"
export const supabase = configured ? createClient(url, key) : null
export const microsoftSignIn = import.meta.env.VITE_AUTH_MICROSOFT === "1"
