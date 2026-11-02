"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
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
  const [collapsed, setCollapsed] = useState(false); // 👈 NEW
  const [tempAdmin, setTempAdmin] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const fetchTempAccess = async () => {
      try {
        const res = await getTempAdminAccessRequest();
        if (res?.tempAdminAccess) setTempAdmin(true);
        if (res?.permissions) setPermissions(res.permissions);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTempAccess();
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-neutral-950">
      {/* Mobile overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden",
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tempAdmin={tempAdmin}
        permissions={permissions}
        collapsed={collapsed}                        // 👈 NEW
        onToggleCollapse={() => setCollapsed((c) => !c)} // 👈 NEW
      />

      {/* Main content — padding shifts when collapsed */}
      <div
        className={clsx(
          "transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-72"
        )}
      >
        <Header onMenuOpen={() => setSidebarOpen(true)} tempAdmin={tempAdmin} />
        <main className="p-4 md:p-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}