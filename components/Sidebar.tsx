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
  BadgeCheck,
  CalendarDays,
  Grid,
  FlaskConical,
  TentTree,
  GraduationCap,
  ChevronDown,
  ClipboardList,
  Receipt,
  ShieldCheck,
  CreditCard,
  Trophy,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

// ---- Types ----
type MenuItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  submenu?: MenuItem[];
};

type NavGroupType = {
  title: string;
  items: MenuItem[];
};

// ---- Permission map ----
const labelToPermissionMap: Record<string, string> = {
  Dashboard: "Dashboard",
  Institution: "Institution",
  Users: "Users",
  Permissions: "Permissions",
  Students: "Students",
  "Students Pass Change": "Students Pass Change",
  "Applications Manager": "Application",
  "Leads Manager": "Lead Manager",
  Communications: "Communication",
  "Email Templates": "Email templates",
  Reports: "Reports",
  "Login History": "Login History",
  CIICP: "CIICP",
  "Application Payment": "Application Payment",
  "Summer Camp": "Summer Camp",
  "Sona Champs": "Sona Champs",
  "MAT Registration": "MAT Registration",
  "Fee Configuration": "Fee Configuration",
  Events: "Events",
  "Fee Concession Approval": "Fee Concession Approval",
  "Tuition Fee Configuration": "Tuition Fee Configuration",
  Others: "Others",
  "Dynamic Forms": "Dynamic Forms",
  Settings: "Settings",
  "Application Settings": "Application Settings",
  Payments: "Payments",
  "Advance Token Amount": "Advance Token Amount",
  "Tuition Fee": "Tuition Fee",
  Registrations: "Registrations",
  "Additional Fee Configuration": "Additional Fee Configuration",
};

// ---- Flat items ----
const allItems: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/institution", label: "Institution", icon: Building },
  { href: "/users", label: "Users", icon: Users },
  { href: "/permissions", label: "Permissions", icon: Key },
  { href: "/passwordchange", label: "Students Pass Change", icon: ShieldCheck },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/applications", label: "Applications Manager", icon: FileText },
  {
    label: "Payments",
    icon: CreditCard,
    submenu: [
      { href: "/payments/application-payment", label: "Application Payment", icon: Receipt },
      { href: "/payments/advance-token-amount", label: "Advance Token Amount", icon: CreditCard },
    ],
  },
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
      { href: "/sonachamp", label: "Sona Champs", icon: Trophy },
      { href: "/mat-registration", label: "MAT Registration", icon: ClipboardList },
    ],
  },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/others", label: "Others", icon: Grid },
  { href: "/fees", label: "Tuition Fee Configuration", icon: Receipt },
  { href: "/additional-fees", label: "Additional Fee Configuration", icon: Receipt },
  { href: "/fee-concession-approval", label: "Fee Concession Approval", icon: BadgeCheck },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/application-settings", label: "Application Settings", icon: Settings2 },
];

// ---- Sections ----
const sectionOrder = ["Overview", "Admission", "Finance", "Registrations", "Configuration"];

const labelToSectionMap: Record<string, string> = {
  Dashboard: "Overview",
  Institution: "Admission",
  Users: "Admission",
  Permissions: "Admission",
  "Students Pass Change": "Admission",
  Students: "Admission",
  "Applications Manager": "Admission",
  "Leads Manager": "Admission",
  Communications: "Admission",
  "Email Templates": "Admission",
  Reports: "Admission",
  "Login History": "Admission",
  Events: "Admission",
  Others: "Admission",
  Payments: "Finance",
  "Tuition Fee Configuration": "Configuration",
  "Additional Fee Configuration": "Configuration",
  "Fee Concession Approval": "Finance",
  Registrations: "Registrations",
  Settings: "Configuration",
  "Application Settings": "Configuration",
};

// ---- Helpers ----
function isActivePath(href: string | undefined, pathname: string) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

const filterItemsByPermissions = (items: MenuItem[], permissions: string[]): MenuItem[] => {
  if (!permissions || permissions.length === 0) return [];
  const isSuper = permissions.includes("superadmin") || permissions.includes("*");

  return items.reduce((acc: MenuItem[], item) => {
    if (isSuper) {
      acc.push(item);
      return acc;
    }
    const permissionKey = labelToPermissionMap[item.label];
    if (item.href && permissionKey && permissions.includes(permissionKey)) {
      acc.push(item);
      return acc;
    }
    if (item.submenu) {
      const filteredSubmenu = item.submenu.filter((subItem) => {
        const subPermissionKey = labelToPermissionMap[subItem.label];
        return subPermissionKey && permissions.includes(subPermissionKey);
      });
      if (filteredSubmenu.length > 0) acc.push({ ...item, submenu: filteredSubmenu });
    }
    return acc;
  }, []);
};

function groupItems(items: MenuItem[]): NavGroupType[] {
  const groups: Record<string, MenuItem[]> = {};
  for (const item of items) {
    const section = labelToSectionMap[item.label] || "Others";
    if (!groups[section]) groups[section] = [];
    groups[section].push(item);
  }
  return sectionOrder
    .filter((title) => groups[title]?.length)
    .map((title) => ({ title, items: groups[title] }));
}

// ---- Dragon watermark ----
// Put a single-color dragon silhouette (transparent bg) at /public/dragon.svg
// Change color/opacity with the bg-* class, size with h-* w-*.
function DragonWatermark({ collapsed }: { collapsed: boolean }) {
  const mask = "url(/HIKA-CRzM.png) center / contain no-repeat";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
    >
      <div
        className={clsx(
          "bg-slate-500/20 transition-all duration-300",
          collapsed ? "hidden h-9 w-9 lg:block" : "h-64 w-64"
        )}
        style={{ WebkitMask: mask, mask }}
      />
    </div>
  );
}

// ---- NavLink ----
function NavLink({
  item,
  pathname,
  collapsed,
  onClose,
  nested = false,
}: {
  item: MenuItem;
  pathname: string;
  collapsed: boolean;
  onClose: () => void;
  nested?: boolean;
}) {
  const active = isActivePath(item.href, pathname);

  return (
    <Link
      href={item.href as any}
      onClick={onClose}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "group relative flex items-center gap-3 text-[14.5px] transition-colors",
        focusRing,
        collapsed ? "mx-auto h-10 w-10 justify-center" : nested ? "h-9 px-3" : "h-11 px-3",
        active
          ? "font-semibold text-blue-700"
          : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
      )}
    >
      {!nested && (
        <item.icon
          strokeWidth={1.75}
          className={clsx(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
          )}
        />
      )}
      {!collapsed && <span className="truncate">{item.label}</span>}
      {active && !collapsed && !nested && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-blue-600" />
      )}
    </Link>
  );
}

// ---- NavGroup ----
function NavGroup({
  item,
  pathname,
  collapsed,
  onClose,
  onExpand,
}: {
  item: MenuItem;
  pathname: string;
  collapsed: boolean;
  onClose: () => void;
  onExpand: () => void;
}) {
  const childActive = !!item.submenu?.some((s) => isActivePath(s.href, pathname));
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => (collapsed ? onExpand() : setOpen((o) => !o))}
        title={collapsed ? item.label : undefined}
        aria-expanded={open}
        className={clsx(
          "group flex items-center gap-3 rounded-lg text-[14.5px] transition-colors",
          focusRing,
          collapsed ? "mx-auto h-10 w-10 justify-center" : "h-11 w-full px-3",
          childActive
            ? "bg-blue-50/80 font-semibold text-blue-700 ring-1 ring-blue-100"
            : "font-medium text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
        )}
      >
        <item.icon
          strokeWidth={1.75}
          className={clsx(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            childActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
          )}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            <ChevronDown
              strokeWidth={2}
              className={clsx(
                "h-4 w-4 text-slate-400 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {!collapsed && (
        <div
          className={clsx(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="ml-[27px] mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
              {item.submenu?.map((s) => (
                <NavLink
                  key={s.href || s.label}
                  item={s}
                  pathname={pathname}
                  collapsed={false}
                  onClose={onClose}
                  nested
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sidebar ----
export default function Sidebar({
  open,
  permissions,
  tempAdmin,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  tempAdmin: boolean;
  permissions: string[];
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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

  let itemsToShow: MenuItem[] = [];
  if (role === "superadmin") itemsToShow = allItems;
  else if (role === "admin" || role === "user")
    itemsToShow = filterItemsByPermissions(allItems, permissions);

  void tempAdmin;

  const groups = groupItems(itemsToShow);
  const rail = collapsed;

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-slate-200 bg-white",
        "text-slate-900 shadow-sm",
        "transition-[transform,width] duration-300 ease-out",
        "w-72",
        rail ? "lg:w-[68px]" : "lg:w-72",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}
    >
      {/* Dragon watermark (center, gray) */}
      <DragonWatermark collapsed={rail} />

      {/* Brand */}
      <div
        className={clsx(
          "relative z-10 flex h-20 shrink-0 items-center border-b border-slate-200 bg-white/80",
          rail ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!rail && (
          <div className="flex items-center gap-3">
            <img
              src="/sonastar-logo.png"
              alt="Logo"
              width={44}
              height={44}
              className="rounded-lg ring-1 ring-slate-200"
            />
            <div className="flex flex-col leading-none">
              <span className="text-[28px] tracking-wider text-slate-900">
                <span className="font-['Metal_Mania']">
                  HIKA <span className="text-blue-600">CRM</span>
                </span>
              </span>
              <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Connect • Convert
              </span>
            </div>
          </div>
        )}
        {rail && (
          <img
            src="/sonastar-logo.png"
            alt="Logo"
            width={36}
            height={36}
            className="hidden rounded-lg ring-1 ring-slate-200 lg:block"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className={clsx(
            "grid h-8 w-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden",
            focusRing
          )}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Nav */}
      <nav
        className="thin-scroll relative z-10 flex-1 space-y-4 overflow-y-auto px-2 pb-3 pt-3"
        aria-label="Main"
      >
        {groups.length === 0 && (
          <p className="px-3 py-2 text-[14px] text-slate-400">
            No menu available for this role.
          </p>
        )}
        {groups.map((g) => (
          <div key={g.title}>
            {!rail ? (
              <p className="mb-1.5 px-3 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                {g.title}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-slate-200" />
            )}
            <div className="space-y-0.5">
              {g.items.map((item) =>
                item.submenu ? (
                  <NavGroup
                    key={item.label}
                    item={item}
                    pathname={pathname}
                    collapsed={rail}
                    onClose={onClose}
                    onExpand={onToggleCollapse}
                  />
                ) : (
                  <NavLink
                    key={item.href || item.label}
                    item={item}
                    pathname={pathname}
                    collapsed={rail}
                    onClose={onClose}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="relative z-10 shrink-0 border-t border-slate-200 bg-white/80 p-2">
        {rail ? (
          <div className="hidden flex-col items-center gap-1 lg:flex">
            <span
              className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-[12px] font-semibold uppercase text-white"
              title={role}
            >
              {role.charAt(0)}
            </span>
            <button
              type="button"
              onClick={onToggleCollapse}
              className={clsx(
                "grid h-8 w-8 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700",
                focusRing
              )}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            {role && (
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-[12px] font-semibold uppercase text-white">
                  {role.charAt(0)}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[13.5px] font-semibold capitalize text-slate-900">
                    {role}
                  </p>
                  <p className="text-[11.5px] text-slate-400">Signed in</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              className={clsx(
                "hidden h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:grid",
                focusRing
              )}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}