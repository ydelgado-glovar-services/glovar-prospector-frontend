/**
 * lib/api.ts — Centralized fetch wrapper for the backend API.
 *
 * Encapsulates:
 *   • Base URL resolution (NEXT_PUBLIC_API_URL)
 *   • ngrok-skip-browser-warning header (always applied)
 *   • Content-Type defaulting
 *   • Authorization header injection when a token is provided
 *
 * Usage:
 *   import { apiFetch } from "@/lib/api"
 *   const res = await apiFetch("/api/v1/queries", { token: session.access_token })
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

/**
 * Thin wrapper around `fetch()` that injects common headers.
 *
 * @param path     — API path (e.g. "/api/v1/prospect").
 * @param options  — Standard RequestInit plus an optional `token` shortcut.
 * @returns The raw `Response` object (caller handles status checks).
 */
export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, headers: extraHeaders, ...rest } = options

  const mergedHeaders: Record<string, string> = {
    // Always skip the ngrok interstitial during development tunnels
    "ngrok-skip-browser-warning": "69420",
    // Spread any caller-supplied headers
    ...(extraHeaders as Record<string, string>),
  }

  if (token) {
    mergedHeaders["Authorization"] = `Bearer ${token}`
  }

  // Default Content-Type for methods that typically carry a body
  if (rest.body && !mergedHeaders["Content-Type"]) {
    mergedHeaders["Content-Type"] = "application/json"
  }

  return fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: mergedHeaders,
  })
}
