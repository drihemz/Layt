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
import { VesselDialog } from "./VesselDialog";

interface Vessel {
  id: string;
  name: string;
  imo_number: number;
  call_sign: string;
  vessel_type: string;
  flag: string;
  dwt: number;
  tenants: { name: string } | null;
}

interface Party {
  id: string;
  name: string;
  party_type: string;
}

export default function VesselsTabContent({ vessels, parties, session }: { vessels: Vessel[], parties: Party[], session: Session }) {
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Vessels</h2>
        <VesselDialog parties={parties} session={session}>
          <Button>Add Vessel</Button>
        </VesselDialog>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>IMO Number</TableHead>
              <TableHead>Call Sign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Flag</TableHead>
              <TableHead>DWT</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vessels.map((vessel) => (
              <TableRow key={vessel.id}>
                <TableCell>{vessel.name}</TableCell>
                <TableCell>{vessel.imo_number}</TableCell>
                <TableCell>{vessel.call_sign}</TableCell>
                <TableCell>{vessel.vessel_type}</TableCell>
                <TableCell>{vessel.flag}</TableCell>
                <TableCell>{vessel.dwt}</TableCell>
                <TableCell>{vessel.tenants?.name || 'Public'}</TableCell>
                <TableCell className="text-right">
                  <VesselDialog vessel={vessel} parties={parties} session={session}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </VesselDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
