"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 64;
const MAX_PULL = 100;

// Elastic rubber-band curve — diminishing returns the further you pull,
// like iOS's own UIRefreshControl, rather than a raw linear drag.
function damp(distance: number): number {
  return MAX_PULL * (1 - Math.exp(-distance / (MAX_PULL * 1.2)));
}

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [snapping, setSnapping] = useState(false);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshingRef.current) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null || refreshingRef.current) return;
      const rawDelta = e.touches[0].clientY - startY.current;
      if (rawDelta <= 0 || window.scrollY > 0) return;
      setSnapping(false);
      const damped = damp(rawDelta);
      pullRef.current = damped;
      setPullDistance(damped);
      // Only a non-passive native listener (not React's onTouchMove, which
      // is attached passive by default) can actually stop Safari's native
      // scroll/bounce from fighting this gesture.
      e.preventDefault();
    }

    function onTouchEnd() {
      if (startY.current === null) return;
      startY.current = null;
      setSnapping(true);
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        router.refresh();
        window.setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
          pullRef.current = 0;
        }, 700);
      } else {
        setPullDistance(0);
        pullRef.current = 0;
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [router]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const height = refreshing ? 44 : pullDistance;

  return (
    <div ref={containerRef}>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height,
          // A little overshoot on the snap-back, like a native control
          // settling into place, rather than an instant/linear collapse.
          transition: snapping || refreshing ? "height 280ms cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "2px solid var(--border)",
            borderTopColor: "var(--accent)",
            opacity: refreshing ? 1 : progress,
            transform: refreshing ? undefined : `scale(${0.6 + progress * 0.4}) rotate(${progress * 360}deg)`,
            transition: snapping && !refreshing ? "opacity 200ms, transform 200ms" : undefined,
            animation: refreshing ? "spin 0.6s linear infinite" : undefined,
          }}
        />
      </div>
      {children}
    </div>
  );
}
