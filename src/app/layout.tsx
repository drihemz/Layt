import "@/styles/globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ModernSideNav } from "@/components/layout/ModernSideNav";

export const metadata: Metadata = {
  title: "Laytime Platform",
  description: "Laytime and Demurrage Calculation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 min-h-screen text-[color:hsl(var(--foreground))] font-sans">
        <Providers>
          <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
            <ModernSideNav />
            <div className="flex-grow md:overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30">
              <div className="p-6 md:p-8 lg:p-12">
                {children}
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
