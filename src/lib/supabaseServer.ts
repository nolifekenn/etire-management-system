// server-only: this module accesses cookies() and the service role key — never import from client components
import 'server-only';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './supabaseClient'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

const INVALID_REFRESH_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'invalid_refresh_token'
]);

export async function getUserSafe(supabase: { auth: { getUser: () => Promise<any>; signOut: (options?: { scope?: 'local' | 'global' }) => Promise<any> } }) {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code && INVALID_REFRESH_CODES.has(code)) {
      await supabase.auth.signOut({ scope: 'local' });
    }

    return { user: null, error };
  }

  return { user, error: null };
}

// Admin client for server-side operations requiring service role
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
