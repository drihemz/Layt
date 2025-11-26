"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { CreateClaimDialog } from "./CreateClaimDialog";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Search } from "lucide-react";

type Claim = {
  id: string;
  claim_reference: string;
  claim_status: string;
  operation_type?: string | null;
  port_name?: string | null;
  laycan_start?: string | null;
  laycan_end?: string | null;
  created_at: string;
  voyages: { voyage_reference: string | null } | null;
  tenant_id?: string;
};

type Voyage = { id: string; voyage_reference: string; tenant_id?: string | null; cargo_quantity?: number | null; cargo_names?: { name: string | null } | null; charter_parties?: { name: string | null } | null };
type Tenant = { id: string; name: string };
type Term = { id: string; name: string };

export default function ClaimsClient({
  claims,
  voyages,
  search,
  isSuperAdmin,
  tenantIdFilter,
  terms,
}: {
  claims: Claim[];
  voyages: Voyage[];
  search: string;
  isSuperAdmin: boolean;
  tenantIdFilter?: string;
  terms: Term[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(search || "");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantValue, setTenantValue] = useState(tenantIdFilter || "");

  useEffect(() => {
    if (isSuperAdmin) {
      fetch("/api/admin/tenants")
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data) => setTenants(data.tenants || []))
        .catch(() => setTenants([]));
    }
  }, [isSuperAdmin]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    const params = new URLSearchParams(searchParams);
    params.set("q", e.target.value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleTenantChange = (value: string) => {
    setTenantValue(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set("tenantId", value); else params.delete("tenantId");
    router.push(`${pathname}?${params.toString()}`);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }).format(d);
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ocean-800">Claims</h1>
          <p className="text-sm text-ocean-600">Track laytime/demurrage claims and jump into calculators.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          {isSuperAdmin && (
            <Select value={tenantValue} onValueChange={handleTenantChange}>
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="All tenants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Tenants</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1">
            <Input
              placeholder="Search by claim reference..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 rounded-xl border-2 border-ocean-200 focus:border-ocean-400 bg-white shadow-sm"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-ocean-400" />
          </div>
          <CreateClaimDialog voyages={voyages} tenantId={tenantValue} isSuperAdmin={isSuperAdmin} terms={terms} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border-2 border-ocean-100 overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-ocean-50/80 backdrop-blur">
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Voyage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Operation / Port</TableHead>
              <TableHead>Laycan</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                  No claims yet. Create your first claim.
                </TableCell>
              </TableRow>
            )}
            {claims.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell className="font-semibold text-ocean-800">{claim.claim_reference}</TableCell>
                <TableCell>{claim.voyages?.voyage_reference || "—"}</TableCell>
                <TableCell className="capitalize">{claim.claim_status.replace("_", " ")}</TableCell>
                <TableCell className="text-sm text-gray-700">
                  {claim.operation_type || "—"} {claim.port_name ? ` / ${claim.port_name}` : ""}
                </TableCell>
                <TableCell className="text-sm text-gray-700">
                  {formatDate(claim.laycan_start)}
                  {claim.laycan_end ? ` → ${formatDate(claim.laycan_end)}` : ""}
                </TableCell>
                <TableCell>
                  {formatDate(claim.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/claims/${claim.id}/calculation`} className="text-ocean-700 hover:text-ocean-900 font-semibold flex items-center gap-1 justify-end">
                    <CalendarIcon className="w-4 h-4" />
                    Calculator
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                    onClick={async () => {
                      if (!confirm("Delete this claim?")) return;
                      try {
                        const res = await fetch(`/api/claims/${claim.id}`, { method: "DELETE" });
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
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
