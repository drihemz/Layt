"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Session } from "next-auth";

type RequestRow = {
  id: string;
  name: string;
  request_type: string;
  status: string;
  created_at: string;
};

export default function RequestsTabContent({ session }: { session: Session }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/requests");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load requests");
      setRows(json.requests || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      load();
    } catch (e: any) {
      alert(e.message || "Update failed");
    }
  };

  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Requests</h2>
        {loading && <p className="text-sm text-gray-300">Loading...</p>}
      </div>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-6">
                  No requests yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell className="capitalize">{r.request_type.replace("_", " ")}</TableCell>
                <TableCell className="capitalize">{r.status}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, "approved")}>Approve</Button>
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, "rejected")}>Reject</Button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Done</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
