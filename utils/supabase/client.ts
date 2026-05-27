import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: (url, init) => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 8000)
            return fetch(url, {
              ...init,
              signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId))
          },
        },
      }
    )
  }
  return client
}
