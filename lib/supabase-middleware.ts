/**
 * lib/supabase-middleware.ts — Supabase client for Next.js Edge Middleware.
 *
 * Refreshes the session token on every request and writes
 * the updated cookies to the response. This is the critical piece
 * that keeps the JWT alive across navigation.
 */

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Write cookies to the request (for downstream server components)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        // Write cookies to the response (for the browser)
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Do NOT call supabase.auth.getSession() here.
  // getUser() sends a request to Supabase to revalidate the Auth token.
  // getSession() does not — it reads from cookies which can be tampered with.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Route Guard: redirect unauthenticated users to /login ──
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login")

  if (!user && !isAuthRoute) {
    // Not logged in + trying to access a protected route → redirect to login
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    // Already logged in + on /login → redirect to dashboard
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
