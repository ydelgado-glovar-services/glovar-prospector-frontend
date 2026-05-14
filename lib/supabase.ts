/**
 * lib/supabase.ts — Supabase browser client singleton.
 *
 * Used in Client Components ("use client") for auth operations
 * and real-time subscriptions. Creates one client per browser tab.
 */

import { createBrowserClient } from "@supabase/ssr"

// These MUST be prefixed with NEXT_PUBLIC_ to be exposed to the browser
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
