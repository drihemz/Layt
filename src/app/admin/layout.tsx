import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Super Admin
        </h1>
        <div className="bg-white/70 backdrop-blur rounded-2xl border border-slate-200 shadow p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
