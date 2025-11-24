"use client";

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
  tenants: { name: string } | null;
}

interface AllUsersTableRowProps {
  user: User;
  roleBadge: React.ReactNode;
}

function AllUsersTableRow({ user, roleBadge }: AllUsersTableRowProps) {
  const router = useRouter();

  const handleUpdateUser = async (isActive: boolean, newRole?: string) => {
    const action = newRole ? 'update role' : (isActive ? 'activate' : 'deactivate');
    if (!confirm(`Are you sure you want to ${action} user ${user.full_name}?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          isActive: isActive,
          role: newRole || user.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} user`);
      }

      router.refresh();
      alert(`User ${action}d successfully!`);

    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <TableRow key={user.id} className="border-gray-700">
      <TableCell>{user.full_name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>{roleBadge}</TableCell>
      <TableCell>{user.tenants?.name || 'N/A'}</TableCell>
      <TableCell>{user.is_active ? "Yes" : "No"}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-800 text-white">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => handleUpdateUser(false)} 
              disabled={!user.is_active}
            >
              Deactivate
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleUpdateUser(true)} 
              disabled={user.is_active}
            >
              Activate
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleUpdateUser(user.is_active, 'customer_admin')}
              disabled={user.role === 'customer_admin'}
            >
              Promote to Customer Admin
            </DropdownMenuItem>
             <DropdownMenuItem 
              onClick={() => handleUpdateUser(user.is_active, 'operator')}
              disabled={user.role === 'operator'}
            >
              Demote to Operator
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default AllUsersTableRow;
