"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  X,
  LayoutDashboard,
  Building,
  Users,
  Key,
  FileText,
  UserPlus,
  MessageCircle,
  BarChart3,
  History,
  CalendarDays,
  Settings,
  Settings2,
} from "lucide-react";
import clsx from "clsx";

const allItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/institution", label: "Institution", icon: Building },
  { href: "/users", label: "Users", icon: Users },
  { href: "/permissions", label: "Permissions", icon: Key },
  { href: "/applications", label: "Applications", icon: FileText },
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/communications", label: "Communications", icon: MessageCircle },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/login-history", label: "Login History", icon: History },
  // { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/application-settings", label: "Application Settings", icon: Settings2 },
];

const roleMenus = {
  superadmin: allItems,
  admin: allItems.filter(item =>
    [
      "/dashboard",
      "/applications",
      "/leads",
      "/reports",
      "/login-history",
      "/communications",
    ].includes(item.href)
  ),
  user: allItems.filter(item =>
    ["/dashboard", "/applications", "/leads", "/communications", ,].includes(item.href)
  ),
};

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Not authorized: please log in.");
      return;
    }

    try {
      const payload = token.split(".")[1];
      const decoded: any = JSON.parse(atob(payload));
   

      const userRole = decoded?.role?.toLowerCase();
      if (!userRole) {
        toast.error("Invalid user role.");
        return;
      }

      setRole(userRole);
    } catch (error) {
      console.error("Failed to decode token:", error);
      toast.error("Session invalid, please log in again.");
    }
  }, []);

  const items =
    roleMenus[role as keyof typeof roleMenus] || []; // fallback empty if role unknown

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 w-72 z-40 shadow-lg transition-transform duration-300",
        "bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/sonastar-logo.png"
            alt="Logo"
            width={52}
            height={52}
            className="rounded-lg"
          />
          <span className="text-xl font-semibold tracking-wide">HIKA</span>
        </div>

        <button
          onClick={onClose}
          className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-70px)]">
        {items.length > 0 ? (
          items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href as any}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-all",
                  active
                    ? "bg-white/20 text-white font-semibold shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })
        ) : (
          <p className="text-white/70 px-4 py-3 text-sm">
            No menu available for this role.
          </p>
        )}
      </nav>
    </aside>
  );
}
