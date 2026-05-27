"use client"

/**
 * components/auth-provider.tsx — Proveedor de Contexto de Autenticación.
 *
 * Envuelve la aplicación para proveer:
 *   - Estado actual de la sesión y usuario
 *   - Rol del usuario (desde la tabla user_profiles, con degradación a 'client')
 *   - Estado de carga (isLoading) para evitar bloqueos en la hidratación
 *   - Función signOut para cerrar sesión
 *
 * Escucha los cambios de estado de autenticación de Supabase (login, logout, refresco)
 * y mantiene el árbol de React sincronizado de forma resiliente.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js"

// ── Tipos ──
interface AuthContextValue {
  session: Session | null
  user: User | null
  role: string | null
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  signOut: () => Promise<void>
}

// ── Contexto ──
const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  isLoading: true,
  setIsLoading: () => { },
  signOut: async () => { },
})

// ── Hook personalizado ──
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un <AuthProvider>")
  }
  return ctx
}

// ── Proveedor ──
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // createBrowserClient is naturally a singleton on the client
  const supabase = createClient()

  // Obtener el rol del usuario desde la tabla user_profiles
  const fetchRole = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", userId)
          .single()

        if (error) {
          console.warn("[Auth] No se pudo obtener el rol del usuario, asignando 'client':", error.message)
          setRole("client")
          return
        }

        setRole(data?.role ?? "client")
      } catch (err) {
        console.error("[Auth] Excepción al obtener el rol, asignando 'client':", err)
        setRole("client")
      }
    },
    [supabase]
  )

  useEffect(() => {
    // Bug Fix 1: `initialized` ref ensures the safety timeout only fires on first mount.
    // Without this, every time the tab resumes from sleep, Supabase emits TOKEN_REFRESHED
    // which triggers router.refresh() → remounts the provider → resets the timeout → loop.
    const initialized = { current: false }

    // Safety timeout: if session init hangs >6s on first load (cold start, offline, etc.),
    // force-resolve to unauthenticated to unblock the UI.
    const authTimeout = setTimeout(() => {
      if (!initialized.current) {
        console.warn("[Auth] Initialization timed out (6s). Resolving state to unauthenticated.")
        setIsLoading(false)
        setSession(null)
        setUser(null)
        setRole(null)
      }
    }, 6000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
      // Mark as initialized so the safety timeout no longer has any effect
      initialized.current = true
      clearTimeout(authTimeout)

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        await fetchRole(currentSession.user.id)
      } else {
        setRole(null)
      }

      setIsLoading(false)

      // Refresh Next.js router cache on meaningful auth transitions.
      // TOKEN_REFRESHED: flush old SSR cache so client-side fetches use the new JWT.
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        router.refresh()
      }
    })

    return () => {
      clearTimeout(authTimeout)
      subscription.unsubscribe()
    }
  }, [supabase, fetchRole, router])

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log("[Auth] Initiating resilient signOut. Purging Supabase cookies and local state...")
      
      // 1. Sign out from Supabase — clears cookies and local storage tokens
      await supabase.auth.signOut()
      
      // 2. Clear React state immediately
      setSession(null)
      setUser(null)
      setRole(null)
      
      // 3. Bug Fix 2: router.refresh() MUST run before router.push() to flush the
      // Next.js SSR cache. Without this, the middleware still sees the stale session
      // cookie and redirects back to /dashboard, creating a logout redirect loop.
      router.refresh()
      router.push("/login")
    } catch (err) {
      console.error("[Auth] Error during resilient signOut. Forcing redirect to /login anyway:", err)
      setSession(null)
      setUser(null)
      setRole(null)
      router.refresh()
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, router])


  return (
    <AuthContext.Provider value={{ session, user, role, isLoading, setIsLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
