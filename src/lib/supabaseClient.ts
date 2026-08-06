import { createClient } from "@supabase/supabase-js";

// Client-side client — safe to use in components, scoped by the anon key.
// (No end-user auth beyond the shared password gate, so this talks to
// Supabase directly; row-level security should still be enabled on every
// table as a defence-in-depth measure.)
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set."
    );
  }
  return createClient(url, anonKey);
}
