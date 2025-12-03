"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";

export function NotificationShell() {
  const pathname = usePathname();
  if (pathname?.startsWith("/auth")) return null;
  return (
    <div className="flex justify-end mb-4">
      <NotificationBell />
    </div>
  );
}
