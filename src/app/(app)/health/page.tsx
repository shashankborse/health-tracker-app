import { getSupabaseServerClient } from "@/lib/supabaseServer";
import DisconnectGoogleHealthButton from "@/components/DisconnectGoogleHealthButton";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Something went wrong starting the connection. Please try again.",
  no_refresh_token: "Google didn't return a long-lived connection. Try disconnecting access in your Google Account and reconnecting.",
  token_exchange_failed: "Couldn't complete the connection with Google. Please try again.",
  access_denied: "Google Health connection was cancelled.",
};

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = getSupabaseServerClient();
  const { data: connection } = await supabase
    .from("google_health_connection")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  return (
    <main className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-3xl font-bold tracking-tight px-1">Health</h1>

      {params.connected && (
        <div
          className="rounded-2xl p-4 text-sm font-medium shadow-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
        >
          Connected to Google Health.
        </div>
      )}
      {params.error && (
        <div
          className="rounded-2xl p-4 text-sm font-medium shadow-sm"
          style={{ backgroundColor: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)" }}
        >
          {ERROR_MESSAGES[params.error] ?? "Something went wrong."}
        </div>
      )}

      {connection ? (
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">Connected</p>
            <DisconnectGoogleHealthButton />
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Since {new Date(connection.connected_at).toLocaleDateString("en-IE", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            Backfill status: {connection.backfill_status.replace("_", " ")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm">
          <p className="text-base font-semibold">Connect Google Health</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Syncs steps, resting heart rate, HRV, respiratory rate, skin
            temperature, SpO2, sleep stages, and weight from your Fitbit via
            Google Health. Also grants the narrow Drive access needed for
            progress photos, exercise recordings, and database backups.
          </p>
          <a
            href="/api/google-health/connect"
            className="mt-1 rounded-xl py-3 text-center text-base font-semibold text-white active:opacity-80"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Connect Google Health
          </a>
        </div>
      )}
    </main>
  );
}
