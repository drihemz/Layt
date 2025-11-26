"use client";

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
import { TermDialog } from "./TermDialog";

interface Term {
  id: string;
  name: string;
  window_start_day?: string | null;
  window_start_time?: string | null;
  window_end_day?: string | null;
  window_end_time?: string | null;
  notes?: string | null;
  is_public?: boolean;
  tenantName?: string | null;
  include_holidays?: boolean | null;
  holiday_name?: string | null;
  holiday_start?: string | null;
  holiday_end?: string | null;
}

export default function TermsTabContent({ terms, session }: { terms: Term[], session: Session }) {
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Terms</h2>
        <TermDialog session={session}>
          <Button>Add Term</Button>
        </TermDialog>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Holidays</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.map((term) => (
              <TableRow key={term.id}>
                <TableCell>{term.name}</TableCell>
                <TableCell className="text-sm text-gray-300">
                  {term.window_start_day && term.window_end_day
                    ? `${term.window_start_day} ${term.window_start_time || ""} → ${term.window_end_day} ${term.window_end_time || ""}`
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-gray-300">{term.notes || "—"}</TableCell>
                <TableCell>{term.is_public ? "Yes" : "No"}</TableCell>
                <TableCell className="text-sm text-gray-300">
                  {term.include_holidays
                    ? `${term.holiday_name || "Holiday"} ${term.holiday_start || ""} ${term.holiday_end ? "→ " + term.holiday_end : ""}`
                    : "No"}
                </TableCell>
                <TableCell>{term.tenantName || (term.is_public ? "Public" : "")}</TableCell>
                <TableCell className="text-right">
                  <TermDialog term={term} session={session}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TermDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
