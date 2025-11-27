"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PortCall = {
  id: string;
  port_name: string;
  port_id?: string | null;
  activity?: string | null;
  eta?: string | null;
  etd?: string | null;
  sequence?: number | null;
  status?: string | null;
  notes?: string | null;
  allowed_hours?: number | null;
};

export function PortCallsDialog({ voyageId, onChange }: { voyageId: string; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [portCalls, setPortCalls] = useState<PortCall[]>([]);
  const [form, setForm] = useState<Partial<PortCall>>({ activity: "other", status: "planned", sequence: 1 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPortCalls = async () => {
    try {
      const res = await fetch(`/api/voyages/${voyageId}/port-calls`);
      const json = await res.json();
      if (res.ok) setPortCalls(json.portCalls || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (open) fetchPortCalls();
  }, [open]);

  const save = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!form.port_name) {
        setError("Port name is required");
        setLoading(false);
        return;
      }
      const method = form.id ? "PUT" : "POST";
      const payload = form.id ? form : { ...form, sequence: form.sequence || portCalls.length + 1 };
      const res = await fetch(`/api/voyages/${voyageId}/port-calls`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save port call");
      setForm({ activity: "other", status: "planned", sequence: 1 });
      fetchPortCalls();
      onChange();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const editRow = (pc: PortCall) => {
    setForm({ ...pc, eta: pc.eta ? pc.eta.slice(0,16) : "", etd: pc.etd ? pc.etd.slice(0,16) : "" });
  };

  const delRow = async (id: string) => {
    if (!confirm("Delete port call?")) return;
    try {
      const res = await fetch(`/api/voyages/${voyageId}/port-calls`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete");
      fetchPortCalls();
      onChange();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Port Calls</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Port Calls</DialogTitle>
          <DialogDescription>Manage ports, ETA/ETD, and activities for this voyage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Port Name</Label>
              <Input value={form.port_name || ""} onChange={(e) => setForm((p) => ({ ...p, port_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Activity</Label>
              <Select value={(form.activity as any) || "other"} onValueChange={(v) => setForm((p) => ({ ...p, activity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="load">Load</SelectItem>
                  <SelectItem value="discharge">Discharge</SelectItem>
                  <SelectItem value="bunker">Bunker</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={(form.status as any) || "planned"} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Allowed Hours</Label>
              <Input
                type="number"
                value={form.allowed_hours ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, allowed_hours: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div className="space-y-1">
              <Label>ETA</Label>
              <Input type="datetime-local" value={(form.eta as any) || ""} onChange={(e) => setForm((p) => ({ ...p, eta: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>ETD</Label>
              <Input type="datetime-local" value={(form.etd as any) || ""} onChange={(e) => setForm((p) => ({ ...p, etd: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Sequence</Label>
              <Input type="number" value={form.sequence ?? 1} onChange={(e) => setForm((p) => ({ ...p, sequence: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Notes</Label>
              <Input value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <Button onClick={save} disabled={loading}>{loading ? "Saving..." : form.id ? "Update" : "Add"}</Button>

          <div className="border-t pt-3 space-y-2">
            {portCalls.length === 0 ? (
              <p className="text-sm text-slate-600">No port calls yet.</p>
            ) : (
              portCalls.map((pc) => (
                <div key={pc.id} className="p-2 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{pc.port_name} · {pc.activity}</p>
                    <p className="text-xs text-slate-500">
                      ETA {pc.eta || "—"} · ETD {pc.etd || "—"} · Seq {pc.sequence || "—"} · Allowed {pc.allowed_hours ?? "—"} hrs
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { window.location.href = `/claims?voyageId=${voyageId}&portCallId=${pc.id}&openCreate=1`; }}>Create Claim</Button>
                    <Button size="sm" variant="ghost" onClick={() => editRow(pc)}>Edit</Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => delRow(pc.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
