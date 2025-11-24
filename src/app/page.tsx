"use client";

import { useSession } from "next-auth/react";
import { useTenant } from "@/lib/tenant-context";
import { 
  Ship, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Waves,
  Anchor,
  Navigation,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { tenantId } = useTenant();
  const [stats, setStats] = useState({
    totalVoyages: 0,
    totalClaims: 0,
    activeClaims: 0,
    totalAmount: 0,
    recentVoyages: [] as any[],
    recentClaims: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    async function loadStats() {
      try {
        const { count: voyagesCount } = await supabase
          .from("voyages")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId);

        const { count: claimsCount } = await supabase
          .from("claims")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId);

        const { count: activeClaimsCount } = await supabase
          .from("claims")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("claim_status", "in_progress");

        const { data: claimsData } = await supabase
          .from("claims")
          .select("amount_in_discussion")
          .eq("tenant_id", tenantId);

        const totalAmount = claimsData?.reduce(
          (sum, claim) => sum + (claim.amount_in_discussion || 0),
          0
        ) || 0;

        const { data: recentVoyages } = await supabase
          .from("voyages")
          .select("voyage_reference, vessel_id, created_at, vessels(name)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(5);

        const { data: recentClaims } = await supabase
          .from("claims")
          .select("claim_reference, claim_status, amount_in_discussion, amount_type, created_at, voyages(voyage_reference)")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(5);

        setStats({
          totalVoyages: voyagesCount || 0,
          totalClaims: claimsCount || 0,
          activeClaims: activeClaimsCount || 0,
          totalAmount,
          recentVoyages: recentVoyages || [],
          recentClaims: recentClaims || [],
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [tenantId]);

  const statCards = [
    {
      title: "Total Voyages",
      value: stats.totalVoyages,
      icon: Ship,
      gradient: "from-ocean-400 via-ocean-500 to-cyan-500",
      border: "border-ocean-200",
      iconBg: "bg-ocean-500/90",
      iconColor: "text-white",
      change: "+12%",
      changeColor: "text-cyan-600 bg-cyan-50",
      description: "Active voyages",
    },
    {
      title: "Total Claims",
      value: stats.totalClaims,
      icon: FileText,
      gradient: "from-teal-400 via-teal-500 to-emerald-400",
      border: "border-teal-200",
      iconBg: "bg-teal-500/90",
      iconColor: "text-white",
      change: "+8%",
      changeColor: "text-emerald-600 bg-emerald-50",
      description: "All claims",
    },
    {
      title: "Active Claims",
      value: stats.activeClaims,
      icon: Navigation,
      gradient: "from-amber-400 via-amber-500 to-orange-400",
      border: "border-amber-200",
      iconBg: "bg-amber-500/90",
      iconColor: "text-white",
      change: "+5%",
      changeColor: "text-orange-600 bg-orange-50",
      description: "In progress",
    },
    {
      title: "Amount in Discussion",
      value: `$${stats.totalAmount.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-green-400 via-green-500 to-emerald-400",
      border: "border-green-200",
      iconBg: "bg-green-500/90",
      iconColor: "text-white",
      change: "+15%",
      changeColor: "text-green-600 bg-green-50",
      description: "Total value",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <div className="relative">
            <Waves className="w-16 h-16 text-ocean-500 animate-wave mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-ocean-200 border-t-ocean-500 rounded-full animate-spin"></div>
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 p-4 md:p-8 bg-gradient-to-br from-ocean-50 via-white to-cyan-50 min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ocean-700 via-cyan-600 to-teal-500 p-10 text-white shadow-2xl border-2 border-ocean-200">
        <div className="absolute inset-0 wave-pattern opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-5">
            <Anchor className="w-10 h-10 drop-shadow-lg" />
            <h1 className="text-5xl font-extrabold tracking-tight drop-shadow">Welcome Aboard</h1>
          </div>
          <p className="text-2xl text-white/90 mb-2 font-semibold drop-shadow">
            {session?.user?.name || session?.user?.email}
          </p>
          <p className="text-lg text-white/80">
            {session?.user?.tenant?.name || "Laytime & Demurrage Management Platform"}
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-teal-300/20 rounded-full blur-2xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`group p-6 rounded-2xl shadow-xl border-2 ${stat.border} bg-gradient-to-br ${stat.gradient} relative overflow-hidden hover:scale-[1.03] transition-transform duration-300`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.iconBg} rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-7 h-7 ${stat.iconColor}`} />
              </div>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full shadow-sm ${stat.changeColor} group-hover:scale-105 transition-transform`}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-white/80 mb-1 tracking-wide drop-shadow">{stat.title}</p>
              <p className="text-4xl font-extrabold text-white mb-1 drop-shadow-lg">{stat.value}</p>
              <p className="text-xs text-white/70 font-medium">{stat.description}</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 text-white text-7xl font-black pointer-events-none select-none pr-4 pb-2">
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/voyages"
          className="p-6 rounded-2xl shadow-lg bg-gradient-to-br from-ocean-500 to-cyan-500 text-white flex items-center space-x-4 group border-2 border-ocean-200 hover:scale-105 hover:shadow-2xl transition-all"
        >
          <div className="bg-white/20 rounded-xl p-4">
            <Ship className="w-7 h-7 text-white drop-shadow" />
          </div>
          <div>
            <h3 className="font-bold text-lg group-hover:text-ocean-100 transition-colors">Create Voyage</h3>
            <p className="text-sm text-white/80">Add a new voyage</p>
          </div>
        </Link>

        <Link
          href="/claims"
          className="p-6 rounded-2xl shadow-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center space-x-4 group border-2 border-teal-200 hover:scale-105 hover:shadow-2xl transition-all"
        >
          <div className="bg-white/20 rounded-xl p-4">
            <FileText className="w-7 h-7 text-white drop-shadow" />
          </div>
          <div>
            <h3 className="font-bold text-lg group-hover:text-emerald-100 transition-colors">Create Claim</h3>
            <p className="text-sm text-white/80">Start a new claim</p>
          </div>
        </Link>

        <Link
          href="/data"
          className="p-6 rounded-2xl shadow-lg bg-gradient-to-br from-cyan-500 to-ocean-500 text-white flex items-center space-x-4 group border-2 border-cyan-200 hover:scale-105 hover:shadow-2xl transition-all"
        >
          <div className="bg-white/20 rounded-xl p-4">
            <BarChart3 className="w-7 h-7 text-white drop-shadow" />
          </div>
          <div>
            <h3 className="font-bold text-lg group-hover:text-cyan-100 transition-colors">Manage Data</h3>
            <p className="text-sm text-white/80">Update lookup fields</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Voyages */}
        <div className="p-6 rounded-2xl shadow-lg bg-gradient-to-br from-ocean-100/80 to-cyan-50 border-2 border-ocean-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Ship className="w-6 h-6 text-ocean-600" />
              <h2 className="text-xl font-bold text-ocean-900 tracking-wide">Recent Voyages</h2>
            </div>
            <Link 
              href="/voyages" 
              className="text-sm font-semibold text-ocean-600 hover:text-ocean-800 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentVoyages.length === 0 ? (
              <div className="text-center py-12">
                <Ship className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base text-gray-500 mb-2">No voyages yet</p>
                <Link
                  href="/voyages"
                  className="text-base font-semibold text-ocean-600 hover:text-ocean-800"
                >
                  Create your first voyage →
                </Link>
              </div>
            ) : (
              stats.recentVoyages.map((voyage: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-ocean-50/80 to-cyan-50/80 border border-ocean-100 hover:border-ocean-300 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-ocean-200 rounded-lg p-2 group-hover:bg-ocean-300 transition-colors">
                      <Ship className="w-5 h-5 text-ocean-700" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-ocean-900 group-hover:text-ocean-700 transition-colors">
                        {voyage.voyage_reference}
                      </p>
                      <p className="text-xs text-ocean-600 mt-0.5">
                        {voyage.vessels?.name || "No vessel assigned"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-ocean-700">
                      {new Date(voyage.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Claims */}
        <div className="p-6 rounded-2xl shadow-lg bg-gradient-to-br from-teal-100/80 to-emerald-50 border-2 border-teal-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-teal-900 tracking-wide">Recent Claims</h2>
            </div>
            <Link 
              href="/claims" 
              className="text-sm font-semibold text-teal-600 hover:text-teal-800 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentClaims.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base text-gray-500 mb-2">No claims yet</p>
                <Link
                  href="/claims"
                  className="text-base font-semibold text-teal-600 hover:text-teal-800"
                >
                  Create your first claim →
                </Link>
              </div>
            ) : (
              stats.recentClaims.map((claim: any, index: number) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                    claim.amount_type === "demurrage"
                      ? "bg-gradient-to-r from-red-100/80 to-pink-50/80 border-red-200 hover:border-red-400"
                      : "bg-gradient-to-r from-green-100/80 to-emerald-50/80 border-green-200 hover:border-green-400"
                  } hover:shadow-lg`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`rounded-lg p-2 transition-colors ${
                        claim.amount_type === "demurrage"
                          ? "bg-red-200 group-hover:bg-red-300"
                          : "bg-green-200 group-hover:bg-green-300"
                      }`}
                    >
                      <FileText
                        className={`w-5 h-5 ${
                          claim.amount_type === "demurrage"
                            ? "text-red-700"
                            : "text-green-700"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-base font-bold text-emerald-900">
                        {claim.claim_reference}
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {claim.voyages?.voyage_reference || "No voyage"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-extrabold ${
                        claim.amount_type === "demurrage"
                          ? "text-red-700"
                          : "text-green-700"
                      }`}
                    >
                      ${claim.amount_in_discussion?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {claim.claim_status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
