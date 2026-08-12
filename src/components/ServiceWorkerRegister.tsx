"use client";

import { useEffect } from "react";

// Registers the service worker on every app open — required for PWA
// installability and to receive Web Push events. No UI; mirrors
// HealthAutoSync.tsx's "mount once, side effect only" pattern.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
