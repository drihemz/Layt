"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, Ship, Search } from "lucide-react";
import { Session } from "next-auth";
import { CreateVoyageDialog } from "@/components/voyages/CreateVoyageDialog";
import { useEffect } from 'react';
import Link from "next/link";
import { EditVoyageDialog } from "./EditVoyageDialog";
import { PortCallsDialog } from "./PortCallsDialog";
import { PortCallFromSofButton } from "./PortCallFromSofButton";

type Lookups = {
  parties: any[];
  vessels: any[];
  cargoNames: any[];
  charterParties: any[];
};

function EmptyState({ lookups, session }: { lookups: Lookups, session: Session }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Ship className="w-16 h-16 text-ocean-300 mb-4" />
      <h2 className="text-2xl font-bold text-ocean-700 mb-2">No Voyages Found</h2>
      <p className="text-ocean-600 mb-4">Get started by creating your first voyage.</p>
      <CreateVoyageDialog lookups={lookups} session={session} />
    </div>
  );
}

function TenantSelector({ currentTenantId }: { currentTenantId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchTenants() {
      const res = await fetch('/api/admin/tenants');
      if (res.ok) {
        const json = await res.json();
        setTenants(json.tenants || []);
      }
    }
    fetchTenants();
  }, []);

  const handleSelect = (tenantId?: string) => {
    const params = new URLSearchParams(searchParams || undefined);
    if (tenantId && tenantId !== "all") params.set('tenantId', tenantId); else params.delete('tenantId');
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  return (
    <Select value={currentTenantId || 'all'} onValueChange={(v) => handleSelect(v || undefined)}>
      <SelectTrigger className="w-48 bg-white">
        <SelectValue placeholder="All tenants" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Tenants</SelectItem>
        {tenants.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

interface VoyagesClientPageProps {
  voyages: any[];
  lookups: Lookups;
  tenantIdFilter?: string;
  page: number;
  pageSize: number;
  search: string;
  session: Session;
}

export default function VoyagesClientPage({ voyages, lookups, tenantIdFilter, page, pageSize, search, session }: VoyagesClientPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(search || "");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    const params = new URLSearchParams(searchParams || undefined);
    params.set("q", e.target.value);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePaginate = (newPage: number) => {
    const params = new URLSearchParams(searchParams || undefined);
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 bg-white/60 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Voyages</h1>
          <p className="text-sm text-slate-500">Manage voyage legs, port calls, and linked claims.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {session.user.role === 'super_admin' && (
            <TenantSelector currentTenantId={tenantIdFilter} />
          )}
          <div className="relative flex-1">
            <Input
              placeholder="Search by reference..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-[#1f5da8] bg-white shadow-sm"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          </div>
          <CreateVoyageDialog lookups={lookups} session={session} defaultTenantId={tenantIdFilter} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur">
            <TableRow>
              <TableHead className="text-slate-700 font-bold">Reference</TableHead>
              <TableHead className="text-slate-700 font-bold">Vessel</TableHead>
              <TableHead className="text-slate-700 font-bold">Owner</TableHead>
              <TableHead className="text-slate-700 font-bold">Charterer</TableHead>
              <TableHead className="text-slate-700 font-bold">Cargo</TableHead>
              <TableHead className="text-slate-700 font-bold">Voyage #</TableHead>
              <TableHead className="text-slate-700 font-bold">Ports</TableHead>
              <TableHead className="text-slate-700 font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {voyages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState lookups={lookups} session={session} />
                </TableCell>
              </TableRow>
            ) : (
              voyages.map((voyage) => (
                <TableRow key={voyage.id} className="group hover:bg-ocean-50/60 transition">
                  <TableCell className="font-semibold text-ocean-800">
                    <Link href={`/voyages/${voyage.id}`} className="hover:underline">
                      {voyage.voyage_reference}
                    </Link>
                  </TableCell>
                  <TableCell>{voyage.vessels?.name || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>{voyage.owner?.name || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>{voyage.charterer?.name || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>{voyage.cargo_names?.name || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>{voyage.voyage_number || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>
                    {Array.isArray((voyage as any).port_calls) && (voyage as any).port_calls.length > 0 ? (
                      <div className="flex flex-wrap gap-1 text-xs">
                        {(voyage as any).port_calls
                          .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                          .map((p: any) => (
                            <DropdownMenu key={p.id}>
                              <DropdownMenuTrigger asChild>
                                <button className="px-2 py-1 rounded-full bg-ocean-50 text-ocean-700 border border-ocean-100 hover:bg-ocean-100">
                                  {p.sequence || ""} {p.port_name} ({p.activity})
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem asChild>
                          <Link href={`/claims?voyageId=${voyage.id}&portCallId=${p.id}&openCreate=1`}>Create Claim</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/port-calls/${p.id}`}>Open Port Call</Link>
                        </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <PortCallsDialog voyageId={voyage.id} onChange={() => router.refresh()} />
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ))}
                      </div>
                    ) : (
                      <span className="text-ocean-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <EditVoyageDialog voyage={voyage} lookups={lookups} onSaved={() => router.refresh()} />
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <PortCallsDialog voyageId={voyage.id} onChange={() => router.refresh()} />
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <PortCallFromSofButton voyageId={voyage.id} label="Create port call from SOF" variant="ghost" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            if (!confirm("Delete this voyage?")) return;
                            try {
                              const res = await fetch("/api/voyages", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: voyage.id }),
                              });
                              if (!res.ok) {
                                const j = await res.json().catch(() => ({}));
                                throw new Error(j.error || "Failed to delete");
                              }
                              router.refresh();
                            } catch (e: any) {
                              alert(e.message || "Delete failed");
                            }
                          }}
                        >
                          Remove
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/claims", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ voyage_id: voyage.id }),
                              });
                              const json = await res.json();
                              if (!res.ok) throw new Error(json.error || "Failed to create claim");
                              router.push(`/claims/${json.id || json?.data?.id || ""}/calculation`);
                            } catch (e: any) {
                              alert(e.message || "Failed to create claim");
                            }
                          }}
                        >
                          Create Claim
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-end items-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => handlePaginate(page - 1)}
        >
          Previous
        </Button>
        <span className="text-ocean-700 font-medium">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={voyages.length < pageSize}
          onClick={() => handlePaginate(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
