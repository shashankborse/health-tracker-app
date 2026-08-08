-- Phase 3.7: separate Google Drive OAuth connection.
-- Run this in the Supabase dashboard's SQL Editor.
--
-- This is deliberately its own table, not an extension of
-- google_health_connection: confirmed live that health.googleapis.com
-- rejects any access token whose scope set also includes drive.file, so
-- Drive needs a fully separate authorization and its own stored token.
-- Same posture as every other Phase 2/3 table: RLS enabled, no policies,
-- server-only access via the service role key.

create table google_drive_connection (
  id text primary key default 'default',
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scopes text not null,
  connected_at timestamptz not null default now()
);
alter table google_drive_connection enable row level security;
