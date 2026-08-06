import { createClient } from "@supabase/supabase-js";

// Server-side client for API routes / cron jobs — uses the service role
// key, which bypasses row-level security. Never import this from
// client components, and never expose SUPABASE_SERVICE_ROLE_KEY to the
// browser (it deliberately has no NEXT_PUBLIC_ prefix).
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
