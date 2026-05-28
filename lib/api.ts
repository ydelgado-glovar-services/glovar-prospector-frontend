/**
 * lib/api.ts — Centralized fetch wrapper for the backend API.
 *
 * Encapsulates:
 * • Base URL resolution (NEXT_PUBLIC_API_URL)
 * • ngrok-skip-browser-warning header (always applied)
 * • Content-Type defaulting
 * • Authorization header injection when a token is provided
 * • Global 401 Unauthorized Interceptor (Stale Session Cleanup)
 */

import { createClient } from "@/utils/supabase/client"

// Inicializamos o reutilizamos el cliente singleton de Supabase para gestionar la destrucción de sesión
const supabase = createClient()

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

/**
 * Thin wrapper around `fetch()` that injects common headers and intercepts Auth errors.
 */
export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, headers: extraHeaders, ...rest } = options

  const mergedHeaders: Record<string, string> = {
    "ngrok-skip-browser-warning": "69420",
    ...(extraHeaders as Record<string, string>),
  }

  if (token) {
    mergedHeaders["Authorization"] = `Bearer ${token}`
  }

  if (rest.body && !mergedHeaders["Content-Type"]) {
    mergedHeaders["Content-Type"] = "application/json"
  }

  const url = `${API_BASE}${path}`
  console.log(`[Network Inspector] Triggering fetch -> URL: ${path} | Method: ${rest.method || 'GET'}`)

  try {
    const response = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
    })

    // --- INTERCEPTOR DE SESIÓN MUERTA (401) ---
    // Si el backend rechaza el token, dejamos que los componentes manejen el 401
    // de forma elegante a través de React/Next.js sin purgar síncronamente la sesión.
    if (response.status === 401) {
      console.warn(`[Security] Token rechazado por el backend (HTTP 401) en ${path}.`)
    }

    return response

  } catch (error) {
    console.error(`[Network Error] Fallo al ejecutar fetch a ${path}:`, error)
    throw error
  }
}