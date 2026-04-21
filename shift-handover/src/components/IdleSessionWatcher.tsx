"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { IDLE_LOGOUT_MS } from "@/lib/idle-session";

/**
 * Signs the user out after IDLE_LOGOUT_MS with no user activity (idle = no interaction with
 * the page: mouse, keyboard, scroll, touch, wheel, or returning focus to the window/tab).
 * Each activity resets the timer. Must sit under SessionProvider.
 */
export default function IdleSessionWatcher({ children }: { children?: ReactNode }) {
  const { status } = useSession();
  const throttleRef = useRef(0);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current != null) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const scheduleLogout = useCallback(() => {
    clearLogoutTimer();
    logoutTimerRef.current = setTimeout(() => {
      logoutTimerRef.current = null;
      signOut({ callbackUrl: "/login" });
    }, IDLE_LOGOUT_MS);
  }, [clearLogoutTimer]);

  const bumpActivity = useCallback(() => {
    const now = Date.now();
    if (now - throttleRef.current < 500) return;
    throttleRef.current = now;
    scheduleLogout();
  }, [scheduleLogout]);

  useEffect(() => {
    if (status !== "authenticated") return;

    throttleRef.current = Date.now();
    scheduleLogout();

    const events: (keyof WindowEventMap)[] = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ];
    const listenerOpts: AddEventListenerOptions = { capture: true, passive: true };

    for (const ev of events) {
      window.addEventListener(ev, bumpActivity, listenerOpts);
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") bumpActivity();
    };
    document.addEventListener("visibilitychange", onVisibility);

    /** User switched back to this browser window / tab (counts as activity). */
    const onWindowFocus = () => bumpActivity();
    window.addEventListener("focus", onWindowFocus);

    return () => {
      clearLogoutTimer();
      for (const ev of events) {
        window.removeEventListener(ev, bumpActivity, listenerOpts);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [status, bumpActivity, scheduleLogout, clearLogoutTimer]);

  return <>{children}</>;
}
