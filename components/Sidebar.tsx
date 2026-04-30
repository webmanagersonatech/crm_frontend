
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
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
  Mail,
  Settings,
  Settings2,
  Layers,
  CalendarDays,
  Grid,
  FlaskConical,
  TentTree,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  ClipboardList
} from "lucide-react";
import clsx from "clsx";

// Define types for menu items
type MenuItem = {
  href?: string;
  label: string;
  icon: any;
  submenu?: MenuItem[];
};

// Map menu labels to permission names for matching
const labelToPermissionMap: Record<string, string> = {
  "Dashboard": "Dashboard",
  "Institution": "Institution",
  "Users": "Users",
  "Permissions": "Permissions",
  "Students": "Students",
  "Applications Manager": "Application",
  "Leads Manager": "Lead Manager",
  "Communications": "Communication",
  "Email Templates": "Email templates",
  "Reports": "Reports",
  "Login History": "Login History",
  "CIICP": "CIICP",
  "Summer Camp": "Summer Camp",
  "MAT Registration": "MAT Registration",
  "Events": "Events",
  "Others": "Others",
  "Dynamic Forms": "Dynamic Forms",
  "Settings": "Settings",
  "Application Settings": "Application Settings",
};

const allItems: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/institution", label: "Institution", icon: Building },
  { href: "/users", label: "Users", icon: Users },
  { href: "/permissions", label: "Permissions", icon: Key },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/applications", label: "Applications Manager", icon: FileText },
  { href: "/leads", label: "Leads Manager", icon: UserPlus },
  { href: "/communications", label: "Communications", icon: MessageCircle },
  { href: "/templates", label: "Email Templates", icon: Mail },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/login-history", label: "Login History", icon: History },
  {
    label: "Registrations",
    icon: Grid,
    submenu: [
      { href: "/ciicp", label: "CIICP", icon: FlaskConical },
      { href: "/summercamp", label: "Summer Camp", icon: TentTree },
      { href: "/mat-registration", label: "MAT Registration", icon: ClipboardList },
    ]
  },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/others", label: "Others", icon: Grid },
  { href: "/dynamic-forms", label: "Dynamic Forms", icon: Layers },
  // { href: "/settings", label: "Settings", icon: Settings },
  { href: "/application-settings", label: "Application Settings", icon: Settings2 },
];

// Function to filter menu items based on permissions
const filterItemsByPermissions = (items: MenuItem[], permissions: string[]): MenuItem[] => {
  // If permissions is empty or undefined, return empty array
  if (!permissions || permissions.length === 0) {
    return [];
  }

  return items.reduce((acc: MenuItem[], item) => {
    // Super admin can see everything
    if (permissions.includes("superadmin") || permissions.includes("*")) {
      acc.push(item);
      return acc;
    }

    // For regular users, filter based on permissions
    const permissionKey = labelToPermissionMap[item.label];

    // Check if this item has a matching permission
    if (item.href && permissionKey && permissions.includes(permissionKey)) {
      acc.push(item);
      return acc;
    }

    // Check if it's a parent item with submenu
    if (item.submenu) {
      // Filter submenu items based on permissions
      const filteredSubmenu = item.submenu.filter(subItem => {
        const subPermissionKey = labelToPermissionMap[subItem.label];
        return subPermissionKey && permissions.includes(subPermissionKey);
      });

      // Only include parent if it has any visible submenu items
      if (filteredSubmenu.length > 0) {
        acc.push({
          ...item,
          submenu: filteredSubmenu
        });
      }
    }

    return acc;
  }, []);
};

// Recursive component to render menu items with submenus
function MenuItemComponent({
  item,
  pathname,
  onClose
}: {
  item: MenuItem;
  pathname: string;
  onClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubmenu = item.submenu && item.submenu.length > 0;
  const isActive = item.href === pathname;

  // Check if any submenu item is active
  const isSubmenuActive = hasSubmenu && item.submenu?.some(sub => sub.href === pathname);

  // Auto-expand if submenu item is active
  useEffect(() => {
    if (isSubmenuActive) {
      setIsOpen(true);
    }
  }, [isSubmenuActive]);

  if (hasSubmenu) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3 rounded-lg text-base transition-all",
            isSubmenuActive
              ? "bg-white/20 text-white font-semibold shadow-sm"
              : "text-white/80 hover:bg-white/10 hover:text-white"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {isOpen && (
          <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-3">
            {item.submenu?.map((subItem) => (
              <MenuItemComponent
                key={subItem.href || subItem.label}
                item={subItem}
                pathname={pathname}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Regular link item
  return (
    <Link
      href={item.href as any}
      onClick={onClose}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-all",
        isActive
          ? "bg-white/20 text-white font-semibold shadow-sm"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      <item.icon className="w-5 h-5" />
      {item.label}
    </Link>
  );
}

export default function Sidebar({
  open,
  permissions,
  tempAdmin,
  onClose,
}: {
  open: boolean;
  tempAdmin: boolean;
  permissions: string[];
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("");

  console.log(permissions, "permissionsxx")

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

  // Determine which items to show
  let itemsToShow: MenuItem[] = [];

  if (role === "superadmin") {
    // Super admin sees everything
    itemsToShow = allItems;
  } else if (role === "admin" && tempAdmin) {
    // Temp admin uses permissions array
    itemsToShow = filterItemsByPermissions(allItems, permissions);
  } else if (role === "admin") {
    // Regular admin uses permissions array
    itemsToShow = filterItemsByPermissions(allItems, permissions);
  } else if (role === "user") {
    // Regular user uses permissions array
    itemsToShow = filterItemsByPermissions(allItems, permissions);
  } else {
    itemsToShow = [];
  }

  console.log("Filtered items to show:", itemsToShow.map(i => i.label));

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
        {itemsToShow.length > 0 ? (
          itemsToShow.map((item) => (
            <MenuItemComponent
              key={item.href || item.label}
              item={item}
              pathname={pathname}
              onClose={onClose}
            />
          ))
        ) : (
          <p className="text-white/70 px-4 py-3 text-sm">
            No menu available for this role.
          </p>
        )}
      </nav>
    </aside>
  );
}