"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const THRESHOLD = 70;
const MAX_PULL = 90;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = window.scrollY === 0 ? e.touches[0].clientY : null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(delta * 0.5, MAX_PULL));
    }
  }

  function handleTouchEnd() {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      router.refresh();
      window.setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 600);
    } else {
      setPullDistance(0);
    }
    startY.current = null;
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: refreshing ? 36 : pullDistance,
          transition: refreshing ? "height 150ms ease-out" : undefined,
        }}
      >
        <div
          aria-hidden
          className="h-5 w-5 rounded-full border-2"
          style={{
            borderColor: "var(--border)",
            borderTopColor: "var(--accent)",
            transform: refreshing ? undefined : `rotate(${pullDistance * 3.6}deg)`,
            animation: refreshing ? "spin 0.6s linear infinite" : undefined,
          }}
        />
      </div>
      {children}
    </div>
  );
}
