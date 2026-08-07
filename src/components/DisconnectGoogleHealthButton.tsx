"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DisconnectGoogleHealthButton() {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Google Health? You can reconnect any time.")) return;
    setDisconnecting(true);
    await fetch("/api/google-health/disconnect", { method: "POST" });
    setDisconnecting(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={disconnecting}
      className="text-sm font-medium disabled:opacity-50"
      style={{ color: "var(--danger)" }}
    >
      {disconnecting ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
