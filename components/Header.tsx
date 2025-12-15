"use client";

import { Bell, ChevronDown, Menu, User, Lock, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const handleLogout = () => {
    try {

      localStorage.removeItem("token");
      localStorage.clear();
      toast.success("Logged out successfully");
      setTimeout(() => {
        router.replace("/");
      }, 800);
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Something went wrong during logout");
    }
  };


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

  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-[#1e2a5a] to-[#3d4f91] text-white backdrop-blur border-b border-white/10 shadow-sm">
      <div className="flex items-center justify-between px-5 h-[78px]">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuOpen}
            className="lg:hidden p-2 rounded-xl hover:bg-white/10 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            className="p-2 rounded-xl hover:bg-white/10 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6" />
          </button>

          {/* User dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/10 transition focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {/* User Icon */}
              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>

              {/* Static user name */}
              <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
                {role}
              </span>

              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            {/* Dropdown Menu */}
            {open && (
              <div className="absolute right-0 mt-2 w-56 bg-[#2a3570] text-white rounded-xl border border-white/10 shadow-lg p-2">
                {/* Change Password */}
                <Link
                  href="/change-password"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
