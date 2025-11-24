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
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">All Users</h2>
      </div>
      <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/40">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-white">Full Name</TableHead>
              <TableHead className="text-white">Email</TableHead>
              <TableHead className="text-white">Role</TableHead>
              <TableHead className="text-white">Tenant</TableHead>
              <TableHead className="text-white">Is Active</TableHead>
              <TableHead className="text-white">Actions</TableHead>
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
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-600 p-12 text-center mt-4">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-white">No users found</h3>
          </div>
        </div>
      )}
    </div>
  );
}
