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
import { CharterPartyDialog } from "./CharterPartyDialog";

interface CharterParty {
  id: string;
  name: string;
  charter_party_type: string;
  signed_date: string;
  document_url: string;
}

export default function CharterPartiesTabContent({ charterParties, session }: { charterParties: CharterParty[], session: Session }) {
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Charter Parties</h2>
        <CharterPartyDialog session={session}>
          <Button>Add Charter Party</Button>
        </CharterPartyDialog>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date Signed</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Document URL</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charterParties.map((cp) => (
              <TableRow key={cp.id}>
                <TableCell>{cp.name}</TableCell>
                <TableCell>{cp.charter_party_type}</TableCell>
                <TableCell>{cp.signed_date}</TableCell>
                <TableCell>{(cp as any).is_public ? 'Yes' : 'No'}</TableCell>
                <TableCell><a href={cp.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{cp.document_url}</a></TableCell>
                <TableCell className="text-right">
                  <CharterPartyDialog charterParty={cp} session={session}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </CharterPartyDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
