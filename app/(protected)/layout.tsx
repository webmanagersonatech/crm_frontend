"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTempAdminAccessRequest } from "@/app/lib/request/authRequest";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tempAdmin, setTempAdmin] = useState(false);

  useEffect(() => {
    const fetchTempAccess = async () => {
      try {
        const res = await getTempAdminAccessRequest();

        if (res?.tempAdminAccess) {
          setTempAdmin(true);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchTempAccess();
  }, []);
  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-neutral-950">
      {/* Mobile overlay */}

      <div
        className={`fixed inset-0 bg-black/40 z-30 lg:hidden transition ${sidebarOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} tempAdmin={tempAdmin} />
      <div className="lg:pl-72">
        <Header onMenuOpen={() => setSidebarOpen(true)} tempAdmin={tempAdmin} />
        <main className="p-4 md:p-6">{children}</main>
        <Footer /> 
      </div>
    </div>
  );
}
