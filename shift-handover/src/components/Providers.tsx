"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import IdleSessionWatcher from "@/components/IdleSessionWatcher";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <IdleSessionWatcher>{children}</IdleSessionWatcher>
    </SessionProvider>
  );
}
