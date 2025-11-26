import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantClient } from "@/lib/db-helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const revalidate = 0; // Prevent caching

import { InviteUserDialog } from "@/components/customer-admin/InviteUserDialog";

import UserTableRow from "@/components/customer-admin/UserTableRow";
import { getTenantPlanUsage } from "@/lib/tenant-plan";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null; // Should be handled by middleware

  const tenantClient = getTenantClient(session);
  const users = await tenantClient.users.list();
  const usage = session.user.tenantId ? await getTenantPlanUsage(session.user.tenantId) : null;
  const adminLimit = usage?.seats_admins ?? null;
  const operatorLimit = usage?.seats_operators ?? null;
  const adminFull = adminLimit !== null && (usage?.usage.admins || 0) >= adminLimit;
  const operatorFull = operatorLimit !== null && (usage?.usage.operators || 0) >= operatorLimit;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Users</h2>
        <div className="flex items-center gap-3">
          {usage && (
            <p className="text-xs text-gray-300">
              Admins {usage.usage.admins}/{adminLimit ?? "∞"} · Operators {usage.usage.operators}/{operatorLimit ?? "∞"}
            </p>
          )}
          <InviteUserDialog adminFull={adminFull} operatorFull={operatorFull} />
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/40">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-white">Full Name</TableHead>
              <TableHead className="text-white">Email</TableHead>
              <TableHead className="text-white">Role</TableHead>
              <TableHead className="text-white">Is Active</TableHead>
              <TableHead className="text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserTableRow key={user.id} user={user} />
            ))}
          </TableBody>
        </Table>
      </div>
      {users.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-600 p-12 text-center mt-4">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-white">No users found</h3>
            <p className="mt-1 text-sm text-gray-400">
              Get started by inviting a new user.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
