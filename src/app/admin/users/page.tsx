import { createServerClient } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AllUsersTableRow from "@/components/admin/AllUsersTableRow";

export const revalidate = 0; // Prevent caching

async function getAllUsers() {
  const supabase = createServerClient();
  const { data: users, error } = await supabase
    .from("users")
    .select("*, tenants(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }
  return users;
}

function RoleBadge({ role }: { role: string }) {
  const roleClasses = {
    super_admin: "bg-red-500 hover:bg-red-600",
    customer_admin: "bg-blue-500 hover:bg-blue-600",
    operator: "bg-gray-500 hover:bg-gray-600",
  };
  
  const key = role as keyof typeof roleClasses;

  return (
    <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${roleClasses[key] || 'bg-gray-400'}`}>
      {role.replace('_', ' ')}
    </span>
  );
}

export default async function AllUsersPage() {
  const users = await getAllUsers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900">All Users</h2>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-slate-700">Full Name</TableHead>
              <TableHead className="text-slate-700">Email</TableHead>
              <TableHead className="text-slate-700">Role</TableHead>
              <TableHead className="text-slate-700">Tenant</TableHead>
              <TableHead className="text-slate-700">Is Active</TableHead>
              <TableHead className="text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <AllUsersTableRow
                key={user.id}
                user={user}
                roleBadge={<RoleBadge role={user.role} />}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {users.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-12 text-center mt-4">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-slate-700">No users found</h3>
          </div>
        </div>
      )}
    </div>
  );
}
