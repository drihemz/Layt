import { createServerClient } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const revalidate = 0; // Prevent caching

async function getAllTenants() {
  const supabase = createServerClient();
  const { data: tenants, error } = await supabase.from("tenants").select("*");

  if (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
  return tenants;
}

import { CreateTenantDialog } from "@/components/admin/CreateTenantDialog";

export default async function AdminDashboard() {
  const tenants = await getAllTenants();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Tenants</h2>
        <CreateTenantDialog />
      </div>
      <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/40">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-white">Name</TableHead>
              <TableHead className="text-white">Slug</TableHead>
              <TableHead className="text-white">Subscription Tier</TableHead>
              <TableHead className="text-white">Is Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id} className="border-gray-700">
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.slug}</TableCell>
                <TableCell>{tenant.subscription_tier}</TableCell>
                <TableCell>{tenant.is_active ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
       {tenants.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-600 p-12 text-center mt-4">
          <div className="text-center">
            <h3 className="mt-2 text-sm font-semibold text-white">No tenants found</h3>
            <p className="mt-1 text-sm text-gray-400">
              Get started by creating a new tenant.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
