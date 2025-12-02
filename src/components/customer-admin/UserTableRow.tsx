"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableRow, TableCell } from "@/components/ui/table";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface UserTableRowProps {
  user: User;
}

function UserTableRow({ user }: UserTableRowProps) {
  const router = useRouter();

  const handleDeactivate = async () => {
    if (!confirm(`Are you sure you want to deactivate user ${user.full_name}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/customer-admin/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isActive: false }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate user');
      }

      router.refresh();
      alert('User deactivated successfully!');

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <TableRow key={user.id} className="border-slate-200 hover:bg-slate-50">
      <TableCell className="text-slate-900">{user.full_name}</TableCell>
      <TableCell className="text-slate-700">{user.email}</TableCell>
      <TableCell className="text-slate-700 capitalize">{user.role.replace("_", " ")}</TableCell>
      <TableCell className="text-slate-700">{user.is_active ? "Yes" : "No"}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleDeactivate} disabled={!user.is_active}>
              Deactivate
            </DropdownMenuItem>
             {/* Add other actions like Edit here */}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default UserTableRow;
