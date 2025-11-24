"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "next-auth/react";
import { useTenant } from "@/lib/tenant-context";
import { getTenantClient } from "@/lib/db-helpers";
import { supabase } from "@/lib/supabase";

function useLookups() {
  const { data: session } = useSession();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [vessels, setVessels] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [charterers, setCharterers] = useState<any[]>([]);
  const [cargos, setCargos] = useState<any[]>([]);
  const [charterParties, setCharterParties] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [ports, setPorts] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  async function load() {
    if (!session) return;
    setLoading(true);
    try {
      const client = getTenantClient(session as any);
      const [vesselsData, ownersData, charterersData, cargosData, cpsData, cpss, portsData, termsData] = await Promise.all([
        client.lookup.vessels(),
        client.lookup.ownerNames(),
        client.lookup.chartererNames(),
        client.lookup.cargoNames(),
        client.lookup.charterParties(),
        client.lookup.counterparties(),
        client.lookup.ports(),
        client.lookup.terms(),
      ]);
      setVessels(vesselsData || []);
      setOwners(ownersData || []);
      setCharterers(charterersData || []);
      setCargos(cargosData || []);
      setCharterParties(cpsData || []);
      setCounterparties(cpss || []);
      setPorts(portsData || []);
      setTerms(termsData || []);
    } catch (err) {
      console.error("Failed loading lookups", err);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    vessels,
    owners,
    charterers,
    cargos,
    charterParties,
    counterparties,
    ports,
    terms,
    load,
  };
}

export default function DataPage() {
  const { data: session } = useSession();
  const { tenantId } = useTenant();
  const lookups = useLookups();
  const [newName, setNewName] = useState("");
  const [activeSection, setActiveSection] = useState<
    | "vessels"
    | "owners"
    | "charterers"
    | "cargo"
    | "charterParties"
    | "counterparties"
    | "ports"
    | "terms"
    
  >("vessels");

  useEffect(() => {
    lookups.load();
  }, [session]);

  if (!session) {
    return <div className="p-6">Please sign in to manage lookup data.</div>;
  }

  async function addItem(section: string) {
    if (!tenantId) return;
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: section, name: newName.trim(), tenant_id: tenantId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      setNewName("");
      await lookups.load();
    } catch (err: any) {
      console.error('Add item error', err);
      alert(err.message || 'Failed to add item');
    }
  }

  async function deleteItem(section: string, id: string) {
    if (!tenantId) return;
    if (!confirm("Delete this item?")) return;
    try {
      const tableMap: Record<string, string> = {
        vessels: "vessels",
        owners: "owner_names",
        charterers: "charterer_names",
        cargo: "cargo_names",
        charterParties: "charter_parties",
        counterparties: "counterparties",
        ports: "ports",
        terms: "terms",
      };
      const table = tableMap[section];
      const res = await fetch('/api/lookup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: section, id, tenant_id: tenantId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      await lookups.load();
    } catch (err: any) {
      console.error("Delete item error", err);
      alert(err.message || "Failed to delete item");
    }
  }

  async function editItem(section: string, id: string, currentName: string) {
    if (!tenantId) return;
    const newVal = prompt("Update name", currentName);
    if (!newVal) return;
    try {
      const tableMap: Record<string, string> = {
        vessels: "vessels",
        owners: "owner_names",
        charterers: "charterer_names",
        cargo: "cargo_names",
        charterParties: "charter_parties",
        counterparties: "counterparties",
        ports: "ports",
        terms: "terms",
      };
      const table = tableMap[section];
      const res = await fetch('/api/lookup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: section, id, name: newVal.trim(), tenant_id: tenantId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed');
      await lookups.load();
    } catch (err: any) {
      console.error("Edit item error", err);
      alert(err.message || "Failed to update item");
    }
  }

  const sectionData: Record<string, any[]> = {
    vessels: lookups.vessels,
    owners: lookups.owners,
    charterers: lookups.charterers,
    cargo: lookups.cargos,
    charterParties: lookups.charterParties,
    counterparties: lookups.counterparties,
    ports: lookups.ports,
    terms: lookups.terms,
  };

  const sections = [
    { key: "vessels", label: "Vessels" },
    { key: "owners", label: "Owners" },
    { key: "charterers", label: "Charterers" },
    { key: "cargo", label: "Cargo Names" },
    { key: "charterParties", label: "Charter Parties" },
    { key: "counterparties", label: "Counterparties" },
    { key: "ports", label: "Ports" },
    { key: "terms", label: "Terms" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Data Management</h1>
        <div className="text-sm text-muted-foreground">Tenant: {tenantId}</div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key as any)}
            className={`px-3 py-1 rounded-full ${activeSection === s.key ? 'bg-ocean-600 text-white' : 'bg-ocean-100 text-ocean-700'}`}
          >{s.label}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow">
        <div className="flex items-center gap-4 mb-4">
          <Input placeholder={`New ${sections.find(s=>s.key===activeSection)?.label}`} value={newName} onChange={e=>setNewName(e.target.value)} className="max-w-xl" />
          <Button onClick={()=>addItem(activeSection)}>Add</Button>
          <Button variant="ghost" onClick={()=>lookups.load()}>Reload</Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sectionData[activeSection] || []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={()=>editItem(activeSection, item.id, item.name)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={()=>deleteItem(activeSection, item.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
