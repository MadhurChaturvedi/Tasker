import { createClient } from '@supabase/supabase-js'

// Service-role client for server-side operations (bypasses Row Level Security)
// ONLY use this in server-side code (API routes), never expose to the client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
