"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Plus } from "lucide-react";

type Claim = {
  id: string;
  tenant_id: string;
  claim_reference: string;
  demurrage_rate?: number | null;
  demurrage_currency?: string | null;
  demurrage_after_hours?: number | null;
  demurrage_rate_after?: number | null;
  despatch_rate_value?: number | null;
  despatch_currency?: string | null;
  despatch_type?: string | null;
  operation_type?: string | null;
  port_name?: string | null;
  laycan_start?: string | null;
  laycan_end?: string | null;
  load_discharge_rate?: number | null;
  load_discharge_rate_unit?: string | null;
  fixed_rate_duration_hours?: number | null;
  reversible?: boolean | null;
  laytime_start?: string | null;
  laytime_end?: string | null;
  nor_tendered_at?: string | null;
  loading_start_at?: string | null;
  loading_end_at?: string | null;
  turn_time_method?: string | null;
  term_id?: string | null;
  voyages?: {
    cargo_quantity?: number | null;
    cargo_names?: { name?: string | null } | null;
    charter_parties?: { name?: string | null } | null;
  } | null;
  term_id?: string | null;
  terms?: { name?: string | null } | null;
};

type EventRow = {
  id: string;
  deduction_name: string;
  from_datetime: string;
  to_datetime: string;
  rate_of_calculation: number;
  time_used: number;
};

type Attachment = {
  id: string;
  claim_id: string;
  attachment_type: string;
  filename: string;
  file_url: string;
  file_size?: number;
  created_at?: string;
};

type AuditRow = {
  id: string;
  action: string;
  created_at: string;
  data: any;
};

type TimeFormat = "dhms" | "decimal";

const formatDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
};

function durationHours(from: string, to: string, rate: number) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  const hours = (end - start) / (1000 * 60 * 60);
  const multiplier = Number.isFinite(rate) ? rate / 100 : 1;
  return +(hours * multiplier).toFixed(2);
}

function formatHours(hours: number, mode: TimeFormat) {
  if (!Number.isFinite(hours)) return "—";
  if (mode === "decimal") {
    return `${(hours / 24).toFixed(3)} days`;
  }
  const totalSeconds = Math.round(hours * 3600);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

function currency(amount?: number | null, code = "USD") {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
}

const toInputValue = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function AddEventForm({
  onAdd,
  onUpdate,
  editing,
  clearEdit,
  loading,
}: {
  onAdd: (payload: Omit<EventRow, "id" | "time_used">) => Promise<void>;
  onUpdate: (id: string, payload: Omit<EventRow, "id" | "time_used">) => Promise<void>;
  editing: EventRow | null;
  clearEdit: () => void;
  loading: boolean;
}) {
  const [deduction, setDeduction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rate, setRate] = useState(100);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setDeduction(editing.deduction_name);
      setFrom(toInputValue(editing.from_datetime));
      setTo(toInputValue(editing.to_datetime));
      setRate(editing.rate_of_calculation);
    } else {
      setDeduction("");
      setFrom("");
      setTo("");
      setRate(100);
    }
  }, [editing]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!deduction || !from || !to) {
      setError("All fields are required.");
      return;
    }
    if (editing) {
      await onUpdate(editing.id, {
        deduction_name: deduction,
        from_datetime: from,
        to_datetime: to,
        rate_of_calculation: rate,
      });
    } else {
      await onAdd({
        deduction_name: deduction,
        from_datetime: from,
        to_datetime: to,
        rate_of_calculation: rate,
      });
    }
  };

  return (
    <div className="p-4 border border-blue-100 shadow-sm bg-white rounded-xl">
      <form onSubmit={handleSubmit} className="grid md:grid-cols-5 gap-3 items-end">
        <div className="space-y-1 md:col-span-2">
          <Label>Event</Label>
          <Input
            placeholder="Rain / Hoses connected / Gangway down"
            value={deduction}
            onChange={(e) => setDeduction(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Rate (%)</Label>
          <Input
            type="number"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            min={0}
            max={200}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={loading}>
            <Plus className="w-4 h-4 mr-1" />
            {editing ? "Update Event" : "Add Event"}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={clearEdit}>
              Cancel
            </Button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </form>
    </div>
  );
}

function Summary({
  events,
  claim,
  timeFormat,
}: {
  events: EventRow[];
  claim: Claim;
  timeFormat: TimeFormat;
}) {
  const deductions = events.reduce((sum, ev) => sum + (ev.time_used || 0), 0);

  const layHours =
    claim.laytime_start && claim.laytime_end
      ? (new Date(claim.laytime_end).getTime() - new Date(claim.laytime_start).getTime()) / (1000 * 60 * 60)
      : null;
  const usedHours = layHours !== null ? Math.max(0, layHours - deductions) : null;

  const cargoQty = claim.voyages?.cargo_quantity || 0;
  const allowedHours = (() => {
    if (!claim.load_discharge_rate || claim.load_discharge_rate <= 0) return null;
    if (claim.load_discharge_rate_unit === "per_hour") {
      return cargoQty / claim.load_discharge_rate;
    }
    if (claim.load_discharge_rate_unit === "fixed_duration") {
      return claim.fixed_rate_duration_hours || null;
    }
    return (cargoQty / claim.load_discharge_rate) * 24;
  })();

  const timeOver = allowedHours !== null && usedHours !== null ? allowedHours - usedHours : null;

  const demRate = claim.demurrage_rate || 0;
  const despatchRate =
    claim.despatch_type === "percent"
      ? demRate * ((claim.despatch_rate_value || 0) / 100)
      : claim.despatch_rate_value || 0;

  const demurrage =
    timeOver !== null && timeOver < 0 ? Math.abs(timeOver) * (demRate / 24) : 0;
  const despatch =
    timeOver !== null && timeOver > 0 ? timeOver * (despatchRate / 24) : 0;

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <div className="p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl shadow-sm">
        <p className="text-sm text-blue-700 font-semibold">Allowed Time</p>
        <p className="text-3xl font-bold text-blue-900">
          {allowedHours !== null ? formatHours(allowedHours, timeFormat) : "—"}
        </p>
      </div>
      <div className="p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl shadow-sm">
        <p className="text-sm text-indigo-700 font-semibold">Used (Laytime - Deductions)</p>
        <p className="text-3xl font-bold text-indigo-900">
          {usedHours !== null ? formatHours(usedHours, timeFormat) : "—"}
        </p>
      </div>
      <div className="p-4 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl shadow-sm">
        <p className="text-sm text-amber-700 font-semibold">Over / Under</p>
        <p
          className={`text-3xl font-bold ${
            timeOver !== null
              ? timeOver >= 0
                ? "text-emerald-700"
                : "text-red-700"
              : "text-slate-800"
          }`}
        >
          {timeOver !== null ? formatHours(timeOver, timeFormat) : "—"}
        </p>
      </div>
      <div className="p-4 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-xl shadow-sm">
        <p className="text-sm text-emerald-700 font-semibold">Result</p>
        <p className="text-lg font-semibold text-emerald-900">
          {timeOver === null
            ? "—"
            : timeOver > 0
            ? `Despatch ${currency(despatch, claim.despatch_currency || claim.demurrage_currency || "USD")}`
            : timeOver < 0
            ? `Demurrage ${currency(demurrage, claim.demurrage_currency || "USD")}`
            : "No demurrage/despatch"}
        </p>
      </div>
    </div>
  );
}

export default function CalculationPage({ params }: { params: { claimId: string } }) {
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [claimForm, setClaimForm] = useState<Partial<Claim>>({});
  const [events, setEvents] = useState<EventRow[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingClaim, setSavingClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("dhms");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/claims/${params.claimId}/events`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load claim");
        }
        setClaim(json.claim);
        setClaimForm(json.claim);
        setEvents(json.events || []);
        if (json.terms) setTerms(json.terms);
        if (json.audit) setAudit(json.audit);
        const aRes = await fetch(`/api/claims/${params.claimId}/attachments`);
        const aJson = await aRes.json();
        if (aRes.ok && aJson.attachments) setAttachments(aJson.attachments);
      } catch (e: any) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.claimId]);

  const handleAdd = async (payload: Omit<EventRow, "id" | "time_used">) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${params.claimId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add event");
      const ev = json.event as EventRow;
      setEvents((prev) => [
        ...prev,
        { ...ev, time_used: ev.time_used ?? durationHours(ev.from_datetime, ev.to_datetime, ev.rate_of_calculation) },
      ]);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to add event");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, payload: Omit<EventRow, "id" | "time_used">) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${params.claimId}/events`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update event");
      const ev = json.event as EventRow;
      setEvents((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...ev, time_used: ev.time_used ?? durationHours(ev.from_datetime, ev.to_datetime, ev.rate_of_calculation) } : p))
      );
      setEditingEvent(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${params.claimId}/events`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete event");
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setEditingEvent(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to delete event");
    } finally {
      setSaving(false);
    }
  };

  const enhancedEvents = useMemo(
    () =>
      events.map((ev) => ({
        ...ev,
        time_used:
          ev.time_used ??
          durationHours(ev.from_datetime, ev.to_datetime, ev.rate_of_calculation),
      })),
    [events]
  );

  const handleClaimFieldChange = (field: keyof Claim, value: any) => {
    setClaimForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadAttachment = async (file: File, attachment_type: string) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("attachment_type", attachment_type);
      const res = await fetch(`/api/claims/${params.claimId}/attachments`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setAttachments((prev) => [json.attachment, ...prev]);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (id: string) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      const res = await fetch(`/api/claims/${params.claimId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Delete failed");
      }
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  };

  const saveClaimDetails = async () => {
    if (!claim) return;
    setSavingClaim(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claimForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save claim");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to save claim");
    } finally {
      setSavingClaim(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">Loading claim...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-600">Claim not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Claim</p>
          <h1 className="text-3xl font-bold text-gray-900">
            {claim.claim_reference}
          </h1>
        </div>
        <div className="flex items-start gap-6 text-sm text-gray-700">
          <div className="text-right">
            <p>Demurrage rate: {currency(claim.demurrage_rate || 0, claim.demurrage_currency || "USD")}</p>
            <p>Despatch rate: {claim.despatch_type === "percent" ? `${claim.despatch_rate_value || 0}% of demurrage` : currency(claim.despatch_rate_value || 0, claim.despatch_currency || claim.demurrage_currency || "USD")}</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
            <Label className="text-slate-700 text-xs">Time Format</Label>
            <Select value={timeFormat} onValueChange={(v: any) => setTimeFormat(v)}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dhms">DD.HH.MM.SS</SelectItem>
                <SelectItem value="decimal">Decimal days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Summary events={enhancedEvents} claim={{ ...claim, ...claimForm } as Claim} timeFormat={timeFormat} />

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Claim Details</h2>
          <Button onClick={saveClaimDetails} disabled={savingClaim}>
            {savingClaim ? "Saving..." : "Save Details"}
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Operation</Label>
            <Select
              value={(claimForm.operation_type as any) || ""}
              onValueChange={(v: any) => handleClaimFieldChange("operation_type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Load or Discharge" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="load">Load</SelectItem>
                <SelectItem value="discharge">Discharge</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Port</Label>
            <Input
              value={claimForm.port_name || ""}
              onChange={(e) => handleClaimFieldChange("port_name", e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Term</Label>
            <Select
              value={(claimForm.term_id as any) || ""}
              onValueChange={(v: any) => handleClaimFieldChange("term_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Laycan Start</Label>
            <Input
              type="datetime-local"
              value={toInputValue(claimForm.laycan_start)}
              onChange={(e) => handleClaimFieldChange("laycan_start", e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Laycan End</Label>
            <Input
              type="datetime-local"
              value={toInputValue(claimForm.laycan_end)}
              onChange={(e) => handleClaimFieldChange("laycan_end", e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>NOR Tendered</Label>
            <Input
              type="datetime-local"
              value={toInputValue(claimForm.nor_tendered_at)}
              onChange={(e) => handleClaimFieldChange("nor_tendered_at", e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Loading/Discharge Start</Label>
            <Input
              type="datetime-local"
              value={toInputValue(claimForm.loading_start_at)}
              onChange={(e) => handleClaimFieldChange("loading_start_at", e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Loading/Discharge End</Label>
            <Input
              type="datetime-local"
              value={toInputValue(claimForm.loading_end_at)}
              onChange={(e) => handleClaimFieldChange("loading_end_at", e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Laytime Starts</Label>
            <Input
              type="datetime-local"
              value={toInputValue(claimForm.laytime_start)}
              onChange={(e) => handleClaimFieldChange("laytime_start", e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Laytime Ends</Label>
            <Input
              type="datetime-local"
              value={toInputValue(claimForm.laytime_end)}
              onChange={(e) => handleClaimFieldChange("laytime_end", e.target.value)}
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Load/Discharge Rate</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={claimForm.load_discharge_rate ?? ""}
                onChange={(e) =>
                  handleClaimFieldChange("load_discharge_rate", e.target.value ? Number(e.target.value) : null)
                }
              />
              <Select
                value={(claimForm.load_discharge_rate_unit as any) || "per_day"}
                onValueChange={(v: any) => handleClaimFieldChange("load_discharge_rate_unit", v)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_day">Per Day</SelectItem>
                  <SelectItem value="per_hour">Per Hour</SelectItem>
                  <SelectItem value="fixed_duration">Fixed Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {claimForm.load_discharge_rate_unit === "fixed_duration" && (
            <div className="col-span-12 md:col-span-4 space-y-1">
              <Label>Fixed Hours</Label>
              <Input
                type="number"
                value={claimForm.fixed_rate_duration_hours ?? ""}
                onChange={(e) =>
                  handleClaimFieldChange("fixed_rate_duration_hours", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
          )}
          <div className="col-span-12 md:col-span-4 space-y-1">
            <Label>Reversible?</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rev2"
                checked={!!claimForm.reversible}
                onCheckedChange={(c) => handleClaimFieldChange("reversible", !!c)}
              />
              <Label htmlFor="rev2" className="text-sm">Reversible laytime</Label>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 space-y-1">
            <Label>Demurrage Rate</Label>
            <div className="flex gap-2">
              <Select
                value={claimForm.demurrage_currency || "USD"}
                onValueChange={(v: any) => handleClaimFieldChange("demurrage_currency", v)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={claimForm.demurrage_rate ?? ""}
                onChange={(e) =>
                  handleClaimFieldChange("demurrage_rate", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="Per day"
              />
            </div>
          </div>
          <div className="col-span-12 md:col-span-6 space-y-1">
            <Label>Demurrage After</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={claimForm.demurrage_after_hours ?? ""}
                onChange={(e) =>
                  handleClaimFieldChange("demurrage_after_hours", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="Hours"
              />
              <Input
                type="number"
                value={claimForm.demurrage_rate_after ?? ""}
                onChange={(e) =>
                  handleClaimFieldChange("demurrage_rate_after", e.target.value ? Number(e.target.value) : null)
                }
                placeholder="New rate"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 space-y-1">
            <Label>Despatch</Label>
            <div className="flex gap-2 flex-wrap">
              <Select
                value={claimForm.despatch_type || "amount"}
                onValueChange={(v: any) => handleClaimFieldChange("despatch_type", v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="percent">Percent of Demurrage</SelectItem>
                </SelectContent>
              </Select>
              {claimForm.despatch_type === "amount" && (
                <Select
                  value={claimForm.despatch_currency || "USD"}
                  onValueChange={(v: any) => handleClaimFieldChange("despatch_currency", v)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Input
                type="number"
                value={claimForm.despatch_rate_value ?? ""}
                onChange={(e) =>
                  handleClaimFieldChange("despatch_rate_value", e.target.value ? Number(e.target.value) : null)
                }
                className="flex-1"
                placeholder={claimForm.despatch_type === "percent" ? "% of demurrage" : "Rate"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <AddEventForm
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          editing={editingEvent}
          clearEdit={() => setEditingEvent(null)}
          loading={saving}
        />

        <div className="border-t border-slate-200" />

        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Attachments</p>
              <p className="text-xs text-slate-500">Upload NOR or SOF files for this claim.</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById("nor-upload")?.click()}
              >
                Upload NOR
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById("sof-upload")?.click()}
              >
                Upload SOF
              </Button>
              <input
                id="nor-upload"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAttachment(f, "nor");
                  e.target.value = "";
                }}
              />
              <input
                id="sof-upload"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAttachment(f, "sof");
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <div
            className="mt-2 p-3 border-2 border-dashed border-slate-200 rounded-lg text-center text-sm text-slate-500"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) uploadAttachment(f, "other");
            }}
          >
            Drag & drop files here
          </div>
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No attachments yet.</p>
          ) : (
            <div className="divide-y">
              {attachments.map((a) => (
                <div key={a.id} className="py-2 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-800">{a.filename}</p>
                    <p className="text-xs text-slate-500 uppercase">{a.attachment_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={a.file_url} target="_blank" rel="noreferrer" className="text-ocean-700 text-sm">Download</a>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteAttachment(a.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">Statement of Facts Timeline</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Rate (%)</TableHead>
                  <TableHead>Adjusted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enhancedEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                      No events yet. Add your first SOF event.
                    </TableCell>
                  </TableRow>
                )}
                {enhancedEvents.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-semibold">{ev.deduction_name}</TableCell>
                    <TableCell>{formatDate(ev.from_datetime)}</TableCell>
                    <TableCell>{formatDate(ev.to_datetime)}</TableCell>
                    <TableCell>{ev.rate_of_calculation}%</TableCell>
                    <TableCell>{formatHours(ev.time_used || 0, timeFormat)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingEvent(ev)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(ev.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="p-4 border border-slate-200 bg-white shadow-sm rounded-xl">
          <p className="text-sm font-semibold text-slate-700 mb-2">Event Audit Trail</p>
          {audit.length === 0 ? (
            <p className="text-sm text-slate-500">No audit entries yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {audit.map((a) => (
                <div key={a.id} className="text-xs text-slate-600 border-b pb-2">
                  <p className="font-semibold text-slate-800">{a.action.toUpperCase()} · {formatDate(a.created_at)}</p>
                  <p className="break-words text-slate-500">{a.data?.deduction_name || ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
