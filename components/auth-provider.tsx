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
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"

// ── Tipos ──
interface AuthContextValue {
  session: Session | null
  user: User | null
  role: string | null
  isLoading: boolean
  signOut: () => Promise<void>
}

// ── Contexto ──
const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  isLoading: true,
  signOut: async () => {},
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
          setRole("client") // Rol por defecto según requerimiento
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
    let isMounted = true

    // Inicializar la sesión de forma robusta
    const initSession = async () => {
      try {
        setIsLoading(true)
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (isMounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)

          if (currentSession?.user) {
            await fetchRole(currentSession.user.id)
          } else {
            setRole(null)
          }
        }
      } catch (err) {
        console.error("[Auth] Error crítico al inicializar la sesión de Supabase:", err)
        if (isMounted) {
          setSession(null)
          setUser(null)
          setRole("client")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initSession()

    // Escuchar cambios de estado en la autenticación de Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return

      try {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await fetchRole(newSession.user.id)
        } else {
          setRole(null)
        }

        // Forzar la recarga del enrutador para reevaluar middlewares de protección
        router.refresh()
      } catch (err) {
        console.error("[Auth] Error en el listener de cambio de estado de autenticación:", err)
        setRole("client")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchRole, router])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error("[Auth] Error al cerrar sesión en Supabase:", err)
    } finally {
      setSession(null)
      setUser(null)
      setRole(null)
      router.push("/login")
    }
  }, [supabase, router])

  return (
    <AuthContext.Provider value={{ session, user, role, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
