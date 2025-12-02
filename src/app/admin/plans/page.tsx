import { createServerClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlansManager from "@/components/admin/PlansManager";

export const revalidate = 0;

export default async function PlansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/auth/login");
  }

  const supabase = createServerClient();
  const { data: plans } = await supabase.from("plans").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Plans</h1>
          <p className="text-sm text-slate-600">Create and manage plans and limits.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <PlansManager initialPlans={plans || []} />
      </div>
    </div>
  );
}
