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
import { PartyDialog } from "./PartyDialog";

interface Party {
  id: string;
  name: string;
  party_type: string;
  country: string;
  email: string;
  kyc_status: string;
}

export default function PartiesTabContent({ parties, session }: { parties: Party[], session: Session }) {
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Parties</h2>
        <PartyDialog session={session}>
          <Button>Add Party</Button>
        </PartyDialog>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>KYC Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parties.map((party) => (
              <TableRow key={party.id}>
                <TableCell>{party.name}</TableCell>
                <TableCell>{party.party_type}</TableCell>
                <TableCell>{party.country}</TableCell>
                <TableCell>{party.email}</TableCell>
                <TableCell>{party.kyc_status}</TableCell>
                <TableCell className="text-right">
                  <PartyDialog party={party} session={session}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </PartyDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
