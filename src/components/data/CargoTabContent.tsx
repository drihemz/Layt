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
import { CargoDialog } from "./CargoDialog";

interface Cargo {
  id: string;
  name: string;
}

export default function CargoTabContent({ cargoNames, session }: { cargoNames: Cargo[], session: Session }) {
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Cargo Names</h2>
        <CargoDialog session={session}>
          <Button>Add Cargo</Button>
        </CargoDialog>
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
            {cargoNames.map((cargo) => (
              <TableRow key={cargo.id}>
                <TableCell>{cargo.name}</TableCell>
                <TableCell className="text-right">
                  <CargoDialog cargo={cargo} session={session}>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </CargoDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
