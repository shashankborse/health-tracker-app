"use client";

import { useEffect, useState } from "react";
import Card from "./Card";

type Status = "checking" | "unsupported" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export default function EnableRemindersCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const existing = await registration?.pushManager.getSubscription();
      setStatus(existing ? "on" : "off");
    }
    check();
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured.");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      setStatus("on");
    } catch {
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        });
        await subscription.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  return (
    <Card className="flex items-center justify-between p-4">
      <div>
        <p className="text-base font-semibold">Daily reminder</p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {status === "denied"
            ? "Notifications are blocked — enable them for this app in Settings."
            : status === "on"
              ? "You'll get a 7:30am nudge to log your weight."
              : "Get a 7:30am nudge to log your weight."}
        </p>
      </div>
      {status !== "denied" && (
        <button
          onClick={status === "on" ? handleDisable : handleEnable}
          disabled={busy}
          className="shrink-0 rounded-[14px] px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={
            status === "on"
              ? { backgroundColor: "color-mix(in srgb, var(--muted) 15%, transparent)" }
              : { backgroundColor: "var(--accent)", color: "white" }
          }
        >
          {status === "on" ? "Disable" : "Enable"}
        </button>
      )}
    </Card>
  );
}
