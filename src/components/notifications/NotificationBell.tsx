"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

type Notification = {
  id: string;
  title: string;
  message: string;
  level: "info" | "success" | "warning";
  timestamp: string;
  read_at?: string | null;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { status } = useSession();

  const unreadCount = notifications.length;

  const iconForLevel = (level: Notification["level"]) => {
    if (level === "success") return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (level === "warning") return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    return <Info className="w-4 h-4 text-blue-600" />;
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        if (res.ok && json.notifications) {
          const mapped = json.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.body,
            level: (n.level as Notification["level"]) || "info",
            timestamp: new Date(n.created_at || Date.now()).toLocaleString(),
            read_at: n.read_at,
          }));
          setNotifications(mapped.filter((n: any) => !n.read_at));
        }
      } catch {
        // ignore fetch errors for now
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } catch {
      // ignore
    } finally {
      setNotifications([]);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="relative bg-white/80 backdrop-blur border-blue-200 text-blue-900"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
            {unreadCount}
          </span>
        )}
        <span className="ml-2 text-xs font-semibold">Notifications</span>
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-blue-100 shadow-xl rounded-xl p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-blue-900">Notifications</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          </div>
          {loading ? (
            <p className="text-xs text-slate-500">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-slate-500">You’re all caught up.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "p-2 rounded-lg border flex gap-2 items-start",
                    n.level === "warning" ? "border-amber-200 bg-amber-50/70" : "border-blue-100 bg-slate-50"
                  )}
                >
                  <div className="mt-0.5">{iconForLevel(n.level)}</div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-600">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{n.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
