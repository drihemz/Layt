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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900">Users</h2>
        <div className="flex items-center gap-3">
          {usage && (
            <p className="text-xs text-slate-500">
              Admins {usage.usage.admins}/{adminLimit ?? "∞"} · Operators {usage.usage.operators}/{operatorLimit ?? "∞"}
            </p>
          )}
          <InviteUserDialog adminFull={adminFull} operatorFull={operatorFull} />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-slate-700">Full Name</TableHead>
              <TableHead className="text-slate-700">Email</TableHead>
              <TableHead className="text-slate-700">Role</TableHead>
              <TableHead className="text-slate-700">Is Active</TableHead>
              <TableHead className="text-slate-700">Actions</TableHead>
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
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-12 text-center mt-4">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-slate-700">No users found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Get started by inviting a new user.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
