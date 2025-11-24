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
import { PortDialog } from "./PortDialog";

interface Port {
  id: string;
  name: string;
  un_locode: string;
  country: string;
  latitude: number;
  longitude: number;
}

export default function PortsTabContent({ ports, session }: { ports: Port[], session: Session }) {
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Ports</h2>
        <PortDialog session={session}>
          <Button>Add Port</Button>
        </PortDialog>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>UN/LOCODE</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Latitude</TableHead>
              <TableHead>Longitude</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ports.map((port) => (
              <TableRow key={port.id}>
                <TableCell>{port.name}</TableCell>
                <TableCell>{port.un_locode}</TableCell>
                <TableCell>{port.country}</TableCell>
                <TableCell>{port.latitude}</TableCell>
                <TableCell>{port.longitude}</TableCell>
                <TableCell className="text-right">
                  <PortDialog port={port} session={session}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </PortDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
