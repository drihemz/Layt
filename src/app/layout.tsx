import "@/styles/globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ModernSideNav } from "@/components/layout/ModernSideNav";
import { NotificationBell } from "@/components/notifications/NotificationBell";

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
      <body className="antialiased bg-gradient-to-br from-[#0b1c3a] via-[#0f2d63] to-[#0c466c] min-h-screen text-[color:hsl(var(--foreground))] font-sans">
        <Providers>
          <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
            <ModernSideNav />
            <div className="flex-grow md:overflow-y-auto bg-gradient-to-br from-[#f4f7fb] via-[#e7eef8] to-[#dfe8f5]">
              <div className="p-4 md:p-8 lg:p-10">
                <div className="flex justify-end mb-4">
                  <NotificationBell />
                </div>
                {children}
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
