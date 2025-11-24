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
import { MoreHorizontal, Ship, Search } from "lucide-react";
import { Session } from "next-auth";
import { CreateVoyageDialog } from "@/components/voyages/CreateVoyageDialog";

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

interface VoyagesClientPageProps {
  voyages: any[];
  lookups: Lookups;
  page: number;
  pageSize: number;
  search: string;
  session: Session;
}

export default function VoyagesClientPage({ voyages, lookups, page, pageSize, search, session }: VoyagesClientPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(search || "");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    const params = new URLSearchParams(searchParams);
    params.set("q", e.target.value);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handlePaginate = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-extrabold text-ocean-800 tracking-tight">Voyages</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ocean-100 text-ocean-700">{voyages.length}</span>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Input
              placeholder="Search by reference..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 rounded-xl border-2 border-ocean-200 focus:border-ocean-400 bg-white shadow-sm"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-ocean-400" />
          </div>
          <CreateVoyageDialog lookups={lookups} session={session} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border-2 border-ocean-100 overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-ocean-50/80 backdrop-blur">
            <TableRow>
              <TableHead className="text-ocean-700 font-bold">Reference</TableHead>
              <TableHead className="text-ocean-700 font-bold">Vessel</TableHead>
              <TableHead className="text-ocean-700 font-bold">Owner</TableHead>
              <TableHead className="text-ocean-700 font-bold">Charterer</TableHead>
              <TableHead className="text-ocean-700 font-bold">Cargo</TableHead>
              <TableHead className="text-ocean-700 font-bold">Voyage #</TableHead>
              <TableHead className="text-ocean-700 font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {voyages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState lookups={lookups} session={session} />
                </TableCell>
              </TableRow>
            ) : (
              voyages.map((voyage) => (
                <TableRow key={voyage.id} className="group hover:bg-ocean-50/60 transition">
                  <TableCell className="font-semibold text-ocean-800">{voyage.voyage_reference}</TableCell>
                  <TableCell>{voyage.vessels?.name || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>{voyage.owner?.name || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>{voyage.charterer?.name || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>{voyage.cargo_names?.name || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell>{voyage.voyage_number || <span className="text-ocean-300">—</span>}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Remove</DropdownMenuItem>
                        <DropdownMenuItem>Create Claim</DropdownMenuItem>
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
