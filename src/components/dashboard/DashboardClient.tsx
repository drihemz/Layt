"use client";

import { useSession } from "next-auth/react";
import { Ship, FileText, DollarSign, TrendingUp, Anchor, Navigation, BarChart3, Activity, Clock, Map, Compass } from "lucide-react";
import Link from "next/link";
import { Session } from "next-auth";

interface Stats {
  totalVoyages: number;
  totalClaims: number;
  activeClaims: number;
  totalAmount: number;
  recentVoyages: any[];
  recentClaims: any[];
}

interface DashboardClientProps {
  initialStats: Stats;
  session: Session | null;
}

export default function DashboardClient({ initialStats, session }: DashboardClientProps) {
  const statCards = [
    {
      title: "Voyages",
      value: initialStats.totalVoyages,
      icon: Ship,
      gradient: "from-[#123b7a] via-[#1a5fad] to-[#1f87c5]",
      border: "border-[#1f5da8]/40",
      iconBg: "bg-[#1f5da8]",
      iconColor: "text-white",
      change: "",
      changeColor: "text-white/70 bg-white/10",
      description: "Managed voyages",
    },
    {
      title: "Claims",
      value: initialStats.totalClaims,
      icon: FileText,
      gradient: "from-[#0f6d82] via-[#1294a6] to-[#16b5b9]",
      border: "border-[#1294a6]/40",
      iconBg: "bg-[#0f6d82]",
      iconColor: "text-white",
      change: "",
      changeColor: "text-white/70 bg-white/10",
      description: "All claims",
    },
    {
      title: "Active Claims",
      value: initialStats.activeClaims,
      icon: Navigation,
      gradient: "from-[#b45c1d] via-[#d8742b] to-[#f08b3c]",
      border: "border-[#d8742b]/40",
      iconBg: "bg-[#b45c1d]",
      iconColor: "text-white",
      change: "",
      changeColor: "text-white/70 bg-white/10",
      description: "In progress",
    },
    {
      title: "Amount in Discussion",
      value: `$${initialStats.totalAmount.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-[#17694c] via-[#1a8c64] to-[#1eb37f]",
      border: "border-[#1a8c64]/40",
      iconBg: "bg-[#17694c]",
      iconColor: "text-white",
      change: "",
      changeColor: "text-white/70 bg-white/10",
      description: "Total value",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1c3a] via-[#123b7a] to-[#0fa3c8] p-8 md:p-10 text-white shadow-2xl border border-white/10">
        <div className="absolute inset-0 opacity-10 wave-pattern"></div>
        <div className="relative z-10 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center space-x-3 mb-1">
              <Anchor className="w-8 h-8 drop-shadow" />
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow">Laytime Control</h1>
            </div>
            <p className="text-lg text-white/90">
              {session?.user?.tenant?.name || "Multi-tenant laytime & demurrage"}
            </p>
            <p className="text-sm text-white/70">Signed in as {session?.user?.name || session?.user?.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3 shadow-lg">
              <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                <span>Active claims</span>
                <Navigation className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{initialStats.activeClaims}</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3 shadow-lg">
              <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                <span>Open voyages</span>
                <Ship className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{initialStats.totalVoyages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`group p-5 rounded-2xl shadow-xl border ${stat.border} bg-gradient-to-br ${stat.gradient} relative overflow-hidden hover:-translate-y-1 transition-transform duration-300`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.iconBg} rounded-xl p-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full shadow-sm ${stat.changeColor} group-hover:scale-105 transition-transform`}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {stat.change || "Live"}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80 mb-1 tracking-wide drop-shadow">{stat.title}</p>
              <p className="text-3xl font-extrabold text-white mb-1 drop-shadow-lg">{stat.value}</p>
              <p className="text-xs text-white/70 font-medium">{stat.description}</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 text-white text-7xl font-black pointer-events-none select-none pr-4 pb-2">
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/voyages"
          className="p-5 rounded-2xl shadow-lg bg-white border border-[#1f5da8]/20 text-[#0b1c3a] flex items-center space-x-4 group hover:-translate-y-1 transition-all"
        >
          <div className="bg-[#1f5da8]/10 rounded-xl p-4">
            <Ship className="w-6 h-6 text-[#1f5da8] drop-shadow" />
          </div>
          <div>
            <h3 className="font-bold text-lg group-hover:text-[#1f5da8] transition-colors">Create Voyage</h3>
            <p className="text-sm text-slate-600">Add a new voyage</p>
          </div>
        </Link>

        <Link
          href="/claims"
          className="p-5 rounded-2xl shadow-lg bg-white border border-[#0f6d82]/20 text-[#0b1c3a] flex items-center space-x-4 group hover:-translate-y-1 transition-all"
        >
          <div className="bg-[#0f6d82]/10 rounded-xl p-4">
            <FileText className="w-6 h-6 text-[#0f6d82] drop-shadow" />
          </div>
          <div>
            <h3 className="font-bold text-lg group-hover:text-[#0f6d82] transition-colors">Create Claim</h3>
            <p className="text-sm text-slate-600">Start a new claim</p>
          </div>
        </Link>

        <Link
          href="/data"
          className="p-5 rounded-2xl shadow-lg bg-white border border-[#1294a6]/20 text-[#0b1c3a] flex items-center space-x-4 group hover:-translate-y-1 transition-all"
        >
          <div className="bg-[#1294a6]/10 rounded-xl p-4">
            <BarChart3 className="w-6 h-6 text-[#1294a6] drop-shadow" />
          </div>
          <div>
            <h3 className="font-bold text-lg group-hover:text-[#1294a6] transition-colors">Manage Data</h3>
            <p className="text-sm text-slate-600">Update lookup fields</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Voyages */}
        <div className="p-6 rounded-2xl shadow-lg bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Ship className="w-6 h-6 text-[#1f5da8]" />
              <h2 className="text-xl font-bold text-slate-900 tracking-wide">Recent Voyages</h2>
            </div>
            <Link 
              href="/voyages" 
              className="text-sm font-semibold text-[#1f5da8] hover:text-[#0f3c7a] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {initialStats.recentVoyages.length === 0 ? (
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
              initialStats.recentVoyages.map((voyage: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#1f5da8]/40 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-[#1f5da8]/10 rounded-lg p-2 group-hover:bg-[#1f5da8]/20 transition-colors">
                      <Ship className="w-5 h-5 text-[#1f5da8]" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900 group-hover:text-[#1f5da8] transition-colors">
                        {voyage.voyage_reference}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {voyage.vessels?.name || "No vessel assigned"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-600">
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
        <div className="p-6 rounded-2xl shadow-lg bg-white border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-[#0f6d82]" />
              <h2 className="text-xl font-bold text-slate-900 tracking-wide">Recent Claims</h2>
            </div>
            <Link 
              href="/claims" 
              className="text-sm font-semibold text-[#0f6d82] hover:text-[#0c3f5c] transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {initialStats.recentClaims.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base text-gray-500 mb-2">No claims yet</p>
                <Link
                  href="/claims"
                  className="text-base font-semibold text-[#0f6d82] hover:text-[#0c3f5c]"
                >
                  Create your first claim →
                </Link>
              </div>
            ) : (
              initialStats.recentClaims.map((claim: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl border transition-all group bg-slate-50 border-slate-200 hover:border-[#0f6d82]/40 hover:shadow-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="rounded-lg p-2 transition-colors bg-[#0f6d82]/10 group-hover:bg-[#0f6d82]/20">
                      <FileText className="w-5 h-5 text-[#0f6d82]" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900 group-hover:text-[#0f6d82] transition-colors">
                        {claim.claim_reference}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {claim.voyages?.voyage_reference || "No voyage"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">
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
