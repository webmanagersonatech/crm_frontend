"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Lock,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import clsx from "clsx";

import { getInstitutionName } from "@/app/lib/request/institutionRequest";

type HeaderProps = {
  onMenuOpen: () => void;
  tempAdmin: any;
};

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

const PLATFORM_NAME = "Hika CRM";
const PLATFORM_LOGO = "/sonastar-logo.png";

export default function Header({ onMenuOpen, tempAdmin }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [role, setRole] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [institutionName, setInstitutionName] = useState<string>("");
  const [institutionLogo, setInstitutionLogo] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* ---------- click outside ---------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------- decode token + fetch branding ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Not authorized: please log in.");
      return;
    }

    let decoded: any;
    try {
      decoded = JSON.parse(atob(token.split(".")[1]));
    } catch (error) {
      console.error("Failed to decode token:", error);
      toast.error("Session invalid, please log in again.");
      return;
    }

    const userRole = decoded?.role?.toLowerCase();
    const email = decoded?.email || decoded?.sub || "User";

    if (!userRole) {
      toast.error("Invalid user role.");
      return;
    }

    setRole(userRole);
    setUserEmail(email);

    // Superadmin → platform branding
    if (userRole === "superadmin") {
      setInstitutionName(PLATFORM_NAME);
      setInstitutionLogo(PLATFORM_LOGO);
      return;
    }

    // Admin / user → institute branding
    if (userRole === "admin" || userRole === "user") {
      getInstitutionName()
        .then((res) => {
        
          setInstitutionName(res?.name || "");
          setInstitutionLogo(res?.insuitelogo ?? null);
        })
        .catch((err) => {
          console.error("[Header] getInstitutionName failed:", err);
          // graceful fallback — Shield icon renders
          setInstitutionName("");
          setInstitutionLogo(null);
        });
    }
  }, []);

  /* ---------- logout ---------- */
  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.clear();
      const toastId = toast.loading("Logging out...");
      setTimeout(() => {
        toast.update(toastId, {
          render: "Logged out successfully",
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });
        setTimeout(() => router.replace("/"), 500);
      }, 500);
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Something went wrong during logout");
    }
  };

  /* ---------- helpers ---------- */
  const getRoleBadgeColor = () => {
    switch (role) {
      case "admin":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "user":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "superadmin":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const displayName = institutionName || "Institution";
  const displayRole = tempAdmin ? "User" : role;

  const notifications = [
    { id: 1, title: "New update available", time: "5 min ago", read: false },
    { id: 2, title: "System maintenance at 2 AM", time: "1 hour ago", read: false },
    { id: 3, title: "Your report is ready", time: "Yesterday", read: true },
  ];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="flex h-20 items-center justify-between px-4 sm:px-6">
        {/* ---------- Left ---------- */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onMenuOpen}
            className={clsx(
              "rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden",
              focusRing
            )}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <div className="flex items-center gap-3">
            {/* Logo (institute or platform) → Shield fallback */}
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-blue-50 ring-1 ring-blue-100">
              {institutionLogo ? (
                <img
                  src={institutionLogo}
                  alt={displayName}
                  className="h-full w-full object-contain"
                  onError={() => setInstitutionLogo(null)}
                />
              ) : (
                <Shield
                  className="h-4 w-4 text-blue-600"
                  strokeWidth={1.75}
                />
              )}
            </div>

            <div className="hidden sm:block leading-tight">
              <h1 className="max-w-[220px] truncate text-[13.5px] font-semibold tracking-wide text-slate-900">
                {displayName}
              </h1>
              <p className="text-[12px] capitalize text-slate-500">
                {displayRole} Portal
              </p>
            </div>
          </div>
        </div>

        {/* ---------- Right ---------- */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((o) => !o)}
              className={clsx(
                "relative grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
                focusRing
              )}
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-900/10 sm:w-96">
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13.5px] font-semibold">
                      Notifications
                    </h3>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                      {unreadCount} new
                    </span>
                  </div>
                </div>
                <div className="thin-scroll max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={clsx(
                          "cursor-pointer border-b border-slate-100 p-4 transition-colors hover:bg-slate-50",
                          !n.read && "bg-blue-50/50"
                        )}
                      >
                        <p className="text-[13.5px] font-medium text-slate-900">
                          {n.title}
                        </p>
                        <p className="mt-1 text-[11.5px] text-slate-500">
                          {n.time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <Bell
                        className="mx-auto mb-2 h-8 w-8 opacity-50"
                        strokeWidth={1.75}
                      />
                      <p className="text-sm">No notifications</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-200 p-3 text-center">
                  <button
                    type="button"
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((o) => !o)}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100 sm:gap-3 sm:px-3",
                focusRing
              )}
            >
              <div className="relative">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-semibold uppercase text-white">
                  {userEmail.charAt(0) || "U"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
              </div>

              <div className="hidden text-left leading-tight md:block">
                <p className="max-w-[150px] truncate text-[13.5px] font-medium text-slate-900">
                  {userEmail.split("@")[0] || "User"}
                </p>
                <span
                  className={clsx(
                    "mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize",
                    getRoleBadgeColor()
                  )}
                >
                  {displayRole}
                </span>
              </div>

              <ChevronDown
                className={clsx(
                  "h-4 w-4 text-slate-400 transition-transform duration-200",
                  isDropdownOpen && "rotate-180"
                )}
                strokeWidth={1.75}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-900/10">
                <div className="border-b border-slate-200 bg-slate-50 p-4">
                  <p className="truncate text-[13.5px] font-medium text-slate-900">
                    {userEmail}
                  </p>
                  <p className="mt-1 text-[11.5px] capitalize text-slate-500">
                    {displayRole} Account
                  </p>
                </div>

                <div className="p-2">
                  <Link
                    href="/change-password"
                    className={clsx(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900",
                      focusRing
                    )}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Lock
                      className="h-[16px] w-[16px] text-slate-400 group-hover:text-slate-600"
                      strokeWidth={1.75}
                    />
                    <span>Change Password</span>
                  </Link>

                  {role === "admin" && (
                    <Link
                      href="/settings"
                      className={clsx(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900",
                        focusRing
                      )}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings
                        className="h-[16px] w-[16px] text-slate-400 group-hover:text-slate-600"
                        strokeWidth={1.75}
                      />
                      <span>Settings</span>
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-200 p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={clsx(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium text-red-600 transition-colors hover:bg-red-50",
                      focusRing
                    )}
                  >
                    <LogOut
                      className="h-[16px] w-[16px] transition-transform duration-300 group-hover:rotate-180"
                      strokeWidth={1.75}
                    />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile institution name */}
      <div className="-mt-2 px-4 pb-3 sm:hidden">
        <h1 className="truncate text-[13.5px] font-semibold text-slate-900">
          {displayName}
        </h1>
        <p className="text-[11.5px] capitalize text-slate-500">
          {displayRole} Portal
        </p>
      </div>
    </header>
  );
}