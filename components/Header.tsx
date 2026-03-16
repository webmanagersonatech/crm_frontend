"use client";

import { Bell, ChevronDown, Menu, User, Lock, LogOut, Settings, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { getInstitutionName } from "@/app/lib/request/institutionRequest";
type HeaderProps = {
  onMenuOpen: () => void;
  tempAdmin: any; // you can replace with proper type
};

export default function Header({ onMenuOpen, tempAdmin }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [role, setRole] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [institutionName, setInstitutionName] = useState<string>("");

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.clear();

      // Show loading toast
      const toastId = toast.loading("Logging out...");

      setTimeout(() => {
        toast.update(toastId, {
          render: "Logged out successfully",
          type: "success",
          isLoading: false,
          autoClose: 2000
        });

        setTimeout(() => {
          router.replace("/");
        }, 500);
      }, 500);
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
      const email = decoded?.email || decoded?.sub || "User";

      if (!userRole) {
        toast.error("Invalid user role.");
        return;
      }

      setRole(userRole);
      setUserEmail(email);

      // Call API only for admin and user
      if (userRole === "admin" || userRole === "user") {
        getInstitutionName()
          .then((res) => {
            setInstitutionName(res.name);
          })
          .catch((err) => {
            console.error(err);
          });
      }
    } catch (error) {
      console.error("Failed to decode token:", error);
      toast.error("Session invalid, please log in again.");
    }
  }, []);

  // Get role badge color (adjusted for your color scheme)
  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-200 border-purple-500/30';
      case 'user': return 'bg-blue-500/20 text-blue-200 border-blue-500/30';
      case 'superadmin': return 'bg-amber-500/20 text-amber-200 border-amber-500/30';
      default: return 'bg-gray-500/20 text-gray-200 border-gray-500/30';
    }
  };

  // Mock notifications
  const notifications = [
    { id: 1, title: "New update available", time: "5 min ago", read: false },
    { id: 2, title: "System maintenance at 2 AM", time: "1 hour ago", read: false },
    { id: 3, title: "Your report is ready", time: "Yesterday", read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-[#1e2a5a] to-[#3d4f91] text-white backdrop-blur border-b border-white/10 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 h-20">
        {/* Left section */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={onMenuOpen}
            className="lg:hidden p-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 focus:ring-2 focus:ring-blue-400/50 focus:outline-none transition-all duration-200"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex items-center gap-3">
            {/* Logo/Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-semibold tracking-wide">
                  {institutionName || "Institution"}
                </h1>
                <p className="text-xs text-white/70"> {tempAdmin ? "User" : role} Portal </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 focus:ring-2 focus:ring-blue-400/50 focus:outline-none transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#1e2a5a] animate-pulse"></span>
              )}
            </button>

            {/* Notifications Dropdown - with your colors */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#1e2a5a] text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-5 duration-200">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Notifications</h3>
                    <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">
                      {unreadCount} new
                    </span>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${!notification.read ? 'bg-blue-500/10' : ''
                          }`}
                      >
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-white/50 mt-1">{notification.time}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-white/50">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-white/10 text-center">
                  <button className="text-xs text-blue-300 hover:text-blue-200 transition">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 rounded-xl hover:bg-white/10 active:bg-white/20 focus:ring-2 focus:ring-blue-400/50 focus:outline-none transition-all duration-200"
            >
              {/* User Avatar with Gradient */}
              <div className="relative">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-base sm:text-lg font-semibold text-white">
                    {userEmail.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-[#1e2a5a]"></div>
              </div>

              {/* User Info - Hidden on mobile */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium truncate max-w-[150px]">
                  {userEmail.split('@')[0] || 'User'}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor()}`}>
                   {tempAdmin ? "User" : role}
                  </span>
                </div>
              </div>

              <ChevronDown className={`w-4 h-4 opacity-70 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu - with your colors */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-[#1e2a5a] text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-5 duration-200">
                {/* User Info Header */}
                <div className="p-4 border-b border-white/10 bg-white/5">
                  <p className="text-sm font-medium">{userEmail}</p>
                  <p className="text-xs text-white/50 mt-1 capitalize">{role} Account</p>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  {/* <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white/10 transition group"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User className="w-4 h-4 text-blue-300 group-hover:text-blue-200" />
                    <span>My Profile</span>
                  </Link> */}

                  <Link
                    href="/change-password"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white/10 transition group"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Lock className="w-4 h-4 text-blue-300 group-hover:text-blue-200" />
                    <span>Change Password</span>
                  </Link>

                  {role === 'admin' && (
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white/10 transition group"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings className="w-4 h-4 text-blue-300 group-hover:text-blue-200" />
                      <span>Settings</span>
                    </Link>
                  )}
                </div>

                {/* Logout Button */}
                <div className="p-2 border-t border-white/10">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition group"
                  >
                    <LogOut className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Institution Name - Visible only on mobile */}
      <div className="sm:hidden px-4 pb-2 -mt-1">
        <h1 className="text-sm font-medium truncate text-white/90">
          {institutionName || "Institution"}
        </h1>
        <p className="text-xs text-white/60">{role} Portal</p>
      </div>
    </header>
  );
}