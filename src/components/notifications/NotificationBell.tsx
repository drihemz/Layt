"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, Info, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Notification = {
  id: string;
  claim_id?: string;
  title: string;
  message: string;
  level: "info" | "success" | "warning";
  timestamp: string;
  read_at?: string | null;
};

export function NotificationBell() {
  const PAGE_SIZE = 5;
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const { status } = useSession();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const iconForLevel = (level: Notification["level"]) => {
    if (level === "success") return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (level === "warning") return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    return <Info className="w-4 h-4 text-blue-600" />;
  };

  const loadPage = async (nextOffset = 0) => {
    if (status !== "authenticated") return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${nextOffset}`);
      const json = await res.json();
      if (res.ok && json.notifications) {
        const mapped = json.notifications.map((n: any) => ({
          id: n.id,
          claim_id: n.claim_id,
          title: n.title,
          message: n.body,
          level: (n.level as Notification["level"]) || "info",
          timestamp: new Date(n.created_at || Date.now()).toLocaleString(),
          read_at: n.read_at,
        }));
        if (nextOffset === 0) {
          setNotifications(mapped);
        } else {
          setNotifications((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            mapped.forEach((m: Notification) => {
              if (!existing.has(m.id)) merged.push(m);
            });
            return merged;
          });
        }
        setHasMore(json.notifications.length === PAGE_SIZE);
        setOffset(nextOffset + PAGE_SIZE);
      } else if (!res.ok) {
        setError(json.error || "Failed to load notifications");
      }
    } catch {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } catch {
      // ignore
    } finally {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setOpen(false);
    }
  };

  const markOne = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // ignore
    } finally {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n))
      );
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
          ) : error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-slate-500">You’re all caught up.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "p-2 rounded-lg border flex gap-2 items-start",
                    n.read_at
                      ? "border-slate-200 bg-slate-50/70"
                      : n.level === "warning"
                      ? "border-amber-200 bg-amber-50/70"
                      : "border-blue-100 bg-slate-50"
                  )}
                >
                  <div className="mt-0.5">{iconForLevel(n.level)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <button
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                        onClick={() => markOne(n.id)}
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600">{n.message}</p>
                    {n.claim_id && (
                      <Link
                        href={`/claims/${n.claim_id}/calculation`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 underline"
                      >
                        View claim
                      </Link>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">{n.timestamp}</p>
                  </div>
                </div>
              ))}
              {hasMore && (
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    disabled={loading}
                    onClick={() => loadPage(offset)}
                  >
                    {loading ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
