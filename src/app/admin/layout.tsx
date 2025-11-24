import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Super Admin Dashboard
        </h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
