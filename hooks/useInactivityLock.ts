"use client";

import { useEffect, useRef } from "react";
import { useSessionStore } from "@/store/sessionStore";

export function useInactivityLock(timeoutMinutes = 15) {
  const lock = useSessionStore((s) => s.lock);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ms = timeoutMinutes * 60 * 1000;

    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(lock, ms);
    }

    function onVisibilityChange() {
      if (document.hidden) lock();
    }

    const events = ["mousemove", "keydown", "touchstart", "click"] as const;
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);

    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, reset));
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [lock, timeoutMinutes]);
}
