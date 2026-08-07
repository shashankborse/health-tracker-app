"use client";

import { useEffect, useState } from "react";
import { flushQueue, queuedCount } from "@/lib/offlineQueue";

export default function OfflineQueueIndicator() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(queuedCount());
    const tryFlush = () => {
      flushQueue().then(refresh);
    };

    refresh();
    tryFlush();

    window.addEventListener("offline-queue-changed", refresh);
    window.addEventListener("online", tryFlush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") tryFlush();
    });

    return () => {
      window.removeEventListener("offline-queue-changed", refresh);
      window.removeEventListener("online", tryFlush);
    };
  }, []);

  if (count === 0) return null;

  return (
    <div
      className="mx-4 mb-2 rounded-xl px-3 py-2 text-center text-xs font-medium"
      style={{ backgroundColor: "color-mix(in srgb, #ff9500 15%, transparent)", color: "#ff9500" }}
    >
      {count} set{count === 1 ? "" : "s"} waiting to sync — will send automatically when back online
    </div>
  );
}
