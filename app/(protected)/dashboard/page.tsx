"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users2,
  FileStack,
  PhoneCall,
  GraduationCap,
  Calendar,
  Eye,
  EyeOff,
  Pencil,
  UserPlus,
  FilePlus2,
  CalendarDays,
  BarChart3,
  GraduationCap as StudentsIcon,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Percent,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "react-toastify";
import { getDashboardData, getNewAndFollowupLeads } from "@/app/lib/request/dashboard";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import DuplicatePopup from "@/components/DuplicatePopup";

interface OptionType {
  value: string;
  label: string;
}

export interface Lead {
  _id: string;
  leadId: string;
  instituteId: string;
  program: string;
  candidateName: string;
  ugDegree?: string;
  applicationId?: string;
  phoneNumber: string;
  isduplicate: boolean;
  duplicateReason?: string;
  dateOfBirth?: string;
  country?: string;
  state?: string;
  city?: string;
  leadSource?: string;
  status: string;
  communication?: string;
  followUpDate?: string;
  description?: string;
  followups?: {
    _id: string;
    status: string;
    communication?: string;
    followUpDate?: string;
    calltaken?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- design tokens ---------- */
const C = {
  blue: "#4361ee",
  indigo: "#6366f1",
  green: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  purple: "#a78bfa",
  ink: "#1e293b",
};

const dateOptions = [
  { label: "Choose Range", value: "", disabled: true },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 1 Month", value: "last30" },
  { label: "Last 3 Months", value: "last90" },
  { label: "Last 6 Months", value: "last180" },
  { label: "Custom", value: "custom" },
];

const quickRanges = [
  { label: "Today", value: "today" },
  { label: "7D", value: "last7" },
  { label: "30D", value: "last30" },
  { label: "90D", value: "last90" },
  { label: "6M", value: "last180" },
];

const statusStyle: Record<string, { pill: string; dot: string }> = {
  New: { pill: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  Followup: { pill: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  "Not Reachable": { pill: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  "Switched Off": { pill: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  "Not Picked": { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  Irrelevant: { pill: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
  Interested: { pill: "bg-green-50 text-green-700", dot: "bg-green-500" },
  "Not Interested": { pill: "bg-red-50 text-red-700", dot: "bg-red-500" },
  "Cut the call": { pill: "bg-pink-50 text-pink-700", dot: "bg-pink-500" },
  Admitted: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Closed: { pill: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
};

const avatarTints = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
];
const tintFor = (s: string) =>
  avatarTints[(s || "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % avatarTints.length];

const fmtShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

const fmtFull = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

const todayISO = () => new Date().toISOString().split("T")[0];

export default function DashboardPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [institutionsLoaded, setInstitutionsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [duplicatePopupOpen, setDuplicatePopupOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<Lead | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [visiblePhones, setVisiblePhones] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const accessorName = dashboardData?.accessorname?.trim() || "";
  const headerDate = `${now.toLocaleDateString("en-GB", { weekday: "short" })}, ${now.toLocaleDateString(
    "en-GB",
    { day: "2-digit", month: "short", year: "numeric" }
  )}`;
  const isSuper = userRole === "superadmin";

  const getDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  };

  /* ---------- date range ---------- */
  useEffect(() => {
    const today = todayISO();
    switch (dateRange) {
      case "today": setStartDate(today); setEndDate(today); break;
      case "yesterday": setStartDate(getDate(1)); setEndDate(getDate(1)); break;
      case "last7": setStartDate(getDate(7)); setEndDate(today); break;
      case "last30": setStartDate(getDate(30)); setEndDate(today); break;
      case "last90": setStartDate(getDate(90)); setEndDate(today); break;
      case "last180": setStartDate(getDate(180)); setEndDate(today); break;
      default: break;
    }
  }, [dateRange]);

  /* ---------- permissions ---------- */
  useEffect(() => {
    const fetchPermissions = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setHasPermission(false);
        setPermissionsLoaded(true);
        return;
      }
      try {
        const payload = token.split(".")[1];
        const decoded: any = JSON.parse(atob(payload));

        setUserRole(decoded.role);


        if ((decoded.role === "admin" || decoded.role === "user") && decoded.instituteId && decoded.id) {
          const data = await getaccesscontrol({
            userId: decoded.id,
            instituteId: decoded.instituteId,
          });
          const dashboardPermission = data.permissions?.find(
            (p: any) => p.moduleName === "Dashboard"
          );
          if (
            dashboardPermission &&
            (dashboardPermission.view ||
              dashboardPermission.create ||
              dashboardPermission.edit ||
              dashboardPermission.delete ||
              dashboardPermission.filter ||
              dashboardPermission.download)
          ) {
            setUserpermisssion(dashboardPermission);
            setHasPermission(true);
          } else {
            setHasPermission(false);
          }
        } else if (decoded.role === "superadmin") {
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      } catch (err) {
        console.error("Failed to decode token or fetch permissions:", err);
        setHasPermission(false);
      } finally {
        setPermissionsLoaded(true);
      }
    };
    fetchPermissions();
  }, []);

  /* ---------- institutions ---------- */
  useEffect(() => {
    const loadInstitutions = async () => {
      if (userRole !== "superadmin") {
        setInstitutionsLoaded(true);
        return;
      }
      try {
        const active = await getActiveInstitutions();
        setInstitutions(
          active.map((inst: any) => ({ value: inst.instituteId, label: inst.name }))
        );
      } catch {
        toast.error("Failed to load institutions");
      } finally {
        setInstitutionsLoaded(true);
      }
    };
    if (userRole !== null) loadInstitutions();
  }, [userRole]);

  /* ---------- dashboard stats ---------- */
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!permissionsLoaded || !institutionsLoaded || !hasPermission) return;
      try {
        setLoading(true);
        setError(null);
        const params: any = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (selectedInstitution !== "all") params.instituteId = selectedInstitution;
        const data = await getDashboardData(params);
        setDashboardData(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [permissionsLoaded, institutionsLoaded, hasPermission, startDate, endDate, selectedInstitution, refreshKey]);

  /* ---------- leads table ---------- */
  useEffect(() => {
    const fetchLeads = async () => {
      setLeadsLoading(true);
      try {
        const params: any = { page: currentPage, limit: 5 };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (selectedInstitution && selectedInstitution !== "all") {
          params.instituteId = selectedInstitution;
        }
        const res = await getNewAndFollowupLeads(params);
        setLeads(res.docs as Lead[]);
        setTotalPages(res.totalPages || 1);
        setTotalEntries(res?.totalDocs || 0);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load leads");
      } finally {
        setLeadsLoading(false);
      }
    };
    fetchLeads();
  }, [startDate, endDate, selectedInstitution, currentPage, refreshKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedInstitution]);

  const handleCustomDateChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setDateRange("custom");
  };

  const resetFilters = () => {
    setDateRange("");
    setStartDate("");
    setEndDate("");
    setSelectedInstitution("all");
  };



  const hasActiveFilters = !!(dateRange || startDate || endDate || selectedInstitution !== "all");

  /* ---------- derived data ---------- */
  const totalLeads = dashboardData?.totalLeads || 0;
  const followUp = dashboardData?.followUpLeads || 0;
  const notInterested = dashboardData?.notInterestedLeads || 0;
  const closed = dashboardData?.closedLeads || 0;
  const otherLeads = Math.max(totalLeads - followUp - notInterested - closed, 0);
  const totalApplications = dashboardData?.totalApplications || 0;
  const paidApps = dashboardData?.paidApplications || 0;
  const completeApps = dashboardData?.completeApplications || 0;

  const leadStatusData = [
    { name: "Follow-up", value: followUp, color: C.blue },
    { name: "Not interested", value: notInterested, color: C.rose },
    { name: "Closed", value: closed, color: C.green },
    { name: "New / Other", value: otherLeads, color: C.amber },
  ];

  const applicationData = [
    { name: "Paid", value: paidApps, color: C.green },
    { name: "Unpaid", value: dashboardData?.unpaidApplications || 0, color: C.amber },
    { name: "Complete", value: completeApps, color: C.blue },
    { name: "Incomplete", value: dashboardData?.incompleteApplications || 0, color: C.purple },
  ];

  const conversion = [
    { label: "Applications", value: totalApplications },
    { label: "Completed", value: completeApps },
    { label: "Paid", value: paidApps },
  ];

  // Optional time-series from the API: [{ date, leads, applications }]
  // Reads dashboardData.trend (or dailyTrend). If neither exists the card is hidden.
  const trendData: any[] = useMemo(() => {
    const raw = dashboardData?.trend || dashboardData?.dailyTrend || [];
    return Array.isArray(raw) ? raw : [];
  }, [dashboardData]);

  const sparkLeads = trendData.map((t) => ({ v: t.leads || 0 }));
  const sparkApps = trendData.map((t) => ({ v: t.applications || 0 }));

  const todaysFollowups = useMemo(() => {
    const t = todayISO();
    return leads
      .filter((l) => l.followUpDate && l.followUpDate.slice(0, 10) <= t)
      .sort((a, b) => (b.followUpDate || "").localeCompare(a.followUpDate || ""));
  }, [leads]);

  /* ---------- guards ---------- */
  if (!permissionsLoaded || !institutionsLoaded) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500" />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <p className="text-red-500 font-semibold text-lg">
          Access Denied — You do not have permission to view the Dashboard.
        </p>
      </div>
    );
  }

  const canFilter = isSuper || userpermission?.filter;
  const canView = isSuper || userpermission?.view;
  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition dark:bg-neutral-900 dark:border-neutral-700 dark:text-slate-100";

  return (
    <div className="space-y-5 p-3 sm:p-4 min-h-screen">
      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {greeting}{accessorName ? `, ${accessorName}` : ""}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here&apos;s what&apos;s happening across your CRM
            {startDate && endDate ? ` · ${fmtFull(startDate)} – ${fmtFull(endDate)}` : " today"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:bg-neutral-900 dark:border-neutral-800 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{headerDate}</span>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Refresh data"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition dark:bg-neutral-900 dark:border-neutral-800 dark:text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading || leadsLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ---------- Filters ---------- */}
      {canFilter && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-neutral-800">
              {quickRanges.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setDateRange(r.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${dateRange === r.value
                    ? "bg-white text-blue-600 shadow-sm dark:bg-neutral-700"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset filters
              </button>
            )}
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuper ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
            {isSuper && (
              <Field label="Institution">
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className={inputCls}
                >
                  <option value="all">All Institutions</option>
                  {institutions.map((inst) => (
                    <option key={inst.value} value={inst.value}>{inst.label}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Date range">
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={inputCls}>
                {dateOptions.map((opt) => (
                  <option key={opt.label} value={opt.value} disabled={opt.disabled} hidden={opt.disabled}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(setStartDate, e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(setEndDate, e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {canView && (
        <>
          {/* ---------- KPI cards ---------- */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuper ? "xl:grid-cols-5" : "xl:grid-cols-4"} gap-4`}>
            {isSuper && (
              <KpiCard
                label="Institutions"
                value={dashboardData?.totalInstitutes || 0}
                hint="Active on platform"
                icon={<Building2 className="w-[18px] h-[18px]" />}
                accent={C.indigo}
                loading={loading}
                onClick={() => router.push("/institution")}

              />
            )}
            <KpiCard
              label="Total Leads"
              value={totalLeads}
              delta={dashboardData?.todayLeads}
              hint="new today"
              icon={<Users2 className="w-[18px] h-[18px]" />}
              accent={C.blue}
              spark={sparkLeads}
              loading={loading}
              onClick={() => router.push("/leads")}
            />
            <KpiCard
              label="Applications"
              value={totalApplications}
              delta={dashboardData?.todayApplications}
              hint={`${pct(totalApplications, totalLeads)}% of leads`}
              icon={<FileStack className="w-[18px] h-[18px]" />}
              accent={C.purple}
              spark={sparkApps}
              loading={loading}
              onClick={() => router.push("/applications")}
            />
            <KpiCard
              label="Follow-up Leads"
              value={followUp}
              delta={dashboardData?.todayFollowUpLeads}
              hint="new today"
              icon={<PhoneCall className="w-[18px] h-[18px]" />}
              accent={C.amber}
              loading={loading}
              onClick={() => router.push("/leads?status=Followup")}
            />
            <KpiCard
              label="Paid Applications"
              value={paidApps}
              hint={`${pct(paidApps, totalApplications)}% of applications`}
              icon={<GraduationCap className="w-[18px] h-[18px]" />}
              accent={C.green}
              loading={loading}
              onClick={() => router.push("/applications?paymentStatus=paid")}
            />
          </div>

          {/* ---------- Rate tiles ---------- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RateTile
              icon={<Percent className="w-4 h-4" />}
              label="Lead → Application"
              percent={pct(totalApplications, totalLeads)}
              color={C.blue}
            />
            <RateTile
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Form completion rate"
              percent={pct(completeApps, totalApplications)}
              color={C.purple}
            />
            <RateTile
              icon={<CreditCard className="w-4 h-4" />}
              label="Payment rate"
              percent={pct(paidApps, totalApplications)}
              color={C.green}
            />
          </div>

          {/* ---------- Trend (only if API provides a time series) ---------- */}
          {trendData.length > 0 && (
            <Card title="Leads & Applications Trend" subtitle="Daily activity for the selected period">
              <div className="h-[260px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ left: -10, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.blue} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.green} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => fmtShort(v)} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={40} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke={C.blue} strokeWidth={2} fill="url(#gLeads)" />
                    <Area type="monotone" dataKey="applications" name="Applications" stroke={C.green} strokeWidth={2} fill="url(#gApps)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ---------- Charts row ---------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Lead Status" subtitle="Distribution of all leads">
              <div className="flex flex-wrap items-center gap-6 pt-3">
                <div className="relative h-[180px] w-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadStatusData}
                        dataKey="value"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={2}
                        cornerRadius={4}
                        stroke="none"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {leadStatusData.map((e) => (
                          <Cell key={e.name} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      {totalLeads.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">Total Leads</span>
                  </div>
                </div>

                <ul className="flex-1 min-w-[190px] space-y-3 text-sm">
                  {leadStatusData.map((s) => (
                    <li key={s.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="flex-1 text-slate-600 dark:text-slate-300">{s.name}</span>
                      <span className="w-14 text-right font-medium text-slate-900 dark:text-slate-100">
                        {s.value.toLocaleString()}
                      </span>
                      <span className="w-10 text-right text-xs text-slate-400">{pct(s.value, totalLeads)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card title="Application Status" subtitle="Payment & form completion">
              <div className="h-[220px] pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={applicationData} barSize={40} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={40} />
                    <Tooltip cursor={{ fill: "rgba(148,163,184,0.1)" }} content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Applications" radius={[6, 6, 0, 0]}>
                      {applicationData.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Admission Conversion" subtitle="From lead to paid application">
              <div className="space-y-5 pt-4">
                <ConversionRow label="Leads" value={totalLeads} percent={100} showPercent={false} color={C.ink} />
                {conversion.map((c, i) => (
                  <ConversionRow
                    key={c.label}
                    label={c.label}
                    value={c.value}
                    percent={pct(c.value, totalLeads)}
                    color={[C.blue, C.purple, C.green][i]}
                  />
                ))}
              </div>
            </Card>
          </div>

          {/* ---------- Leads table + side column ---------- */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-neutral-800">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">New &amp; Follow-up Leads</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Leads that need attention · {totalEntries.toLocaleString()} total
                  </p>
                </div>
                <button
                  onClick={() => router.push("/leads")}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4">
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-neutral-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-neutral-800 dark:text-slate-400">
                        <Th>Lead ID</Th>
                        {isSuper && <Th>Institute</Th>}
                        <Th>Candidate</Th>
                        <Th>Program</Th>
                        <Th>Phone</Th>
                        <Th>City</Th>
                        <Th>Communication</Th>
                        <Th>Follow up</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                      {leadsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}>
                            <td colSpan={isSuper ? 10 : 9} className="px-3 py-3.5">
                              <div className="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
                            </td>
                          </tr>
                        ))
                      ) : leads.length === 0 ? (
                        <tr>
                          <td colSpan={isSuper ? 10 : 9} className="py-12 text-center text-slate-400">
                            No leads found for this filter
                          </td>
                        </tr>
                      ) : (
                        leads.map((lead: any) => {
                          const key = String(lead._id);
                          const phone = String(lead.phoneNumber || "");
                          const visible = !!visiblePhones[key];
                          const masked =
                            phone.length > 3
                              ? "*".repeat(phone.length - 3) + phone.slice(-3)
                              : phone
                                ? "*".repeat(phone.length)
                                : "—";
                          const st = statusStyle[lead.status] || statusStyle.New;
                          const fu = lead.followUpDate?.slice(0, 10);
                          const isToday = fu === todayISO();
                          const overdue = !!fu && fu < todayISO();
                          return (
                            <tr key={key} className="transition hover:bg-slate-50/80 dark:hover:bg-neutral-800/50">
                              <Td className="min-w-[130px] text-slate-700 dark:text-slate-200">
                                <span className="break-all font-mono text-xs">{lead.leadId || "—"}</span>
                              </Td>
                              {isSuper && (
                                <Td className="min-w-[110px]">{lead.institute?.name || lead.instituteId || "—"}</Td>
                              )}
                              <Td className="min-w-[150px]">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tintFor(
                                      lead.candidateName
                                    )}`}
                                  >
                                    {(lead.candidateName || "?").charAt(0).toUpperCase()}
                                  </span>
                                  <span className="font-medium text-slate-800 dark:text-slate-100">
                                    {lead.candidateName}
                                  </span>
                                </div>
                              </Td>
                              <Td className="min-w-[110px]">{lead.program || "—"}</Td>
                              <Td>
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <span className="font-mono text-[13px]">{visible ? phone : masked}</span>
                                  {phone && (
                                    <button
                                      type="button"
                                      title={visible ? "Hide phone number" : "Show phone number"}
                                      aria-label={visible ? "Hide phone number" : "Show phone number"}
                                      onClick={() => setVisiblePhones((p) => ({ ...p, [key]: !p[key] }))}
                                      className="text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  )}
                                </div>
                              </Td>
                              <Td>{lead.city || "—"}</Td>
                              <Td>{lead.communication || "—"}</Td>
                              <Td className="whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <span>{fmtFull(lead.followUpDate)}</span>
                                  {isToday && (
                                    <span className="w-fit rounded bg-blue-50 px-1.5 text-[10px] font-semibold text-blue-600">
                                      TODAY
                                    </span>
                                  )}
                                  {overdue && (
                                    <span className="w-fit rounded bg-rose-50 px-1.5 text-[10px] font-semibold text-rose-600">
                                      OVERDUE
                                    </span>
                                  )}
                                </div>
                              </Td>
                              <Td>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${st.pill}`}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                    {lead.status || "Unknown"}
                                  </span>
                                  {lead.isduplicate && (
                                    <button
                                      title="Duplicate Lead"
                                      onClick={() => {
                                        setDuplicateData(lead);
                                        setDuplicatePopupOpen(true);
                                      }}
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <AlertTriangle size={15} />
                                    </button>
                                  )}
                                </div>
                              </Td>
                              <Td>
                                {(isSuper || userpermission?.edit) && (
                                  <button
                                    onClick={() => router.push(`/leads/editlead/${lead._id}`)}
                                    disabled={!!lead?.applicationId}
                                    title={lead?.applicationId ? "Already converted to application" : "Edit lead"}
                                    className={`flex items-center justify-center rounded-lg p-2 transition ${lead?.applicationId
                                      ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                      : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                                      }`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </Td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 dark:bg-neutral-800">
                      Page <b className="text-slate-900 dark:text-slate-100">{currentPage}</b> of {totalPages}
                    </span>
                    <span>
                      Total Entries: <b className="text-slate-900 dark:text-slate-100">{totalEntries.toLocaleString()}</b>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="rounded-lg border border-slate-200 px-4 py-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="rounded-lg bg-slate-900 px-4 py-1.5 font-medium text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">Today&apos;s Follow-ups</h2>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                    {todaysFollowups.length}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-neutral-800">
                  {todaysFollowups.length === 0 && (
                    <li className="py-8 text-center text-sm text-slate-400"> You&apos;re all caught up</li>
                  )}
                  {todaysFollowups.slice(0, 6).map((l) => {
                    const overdue = (l.followUpDate || "").slice(0, 10) < todayISO();
                    return (
                      <li key={l._id} className="flex items-center gap-3 py-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tintFor(
                            l.candidateName
                          )}`}
                        >
                          {(l.candidateName || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {l.candidateName}
                          </p>
                          <p className="truncate text-xs text-slate-500">{l.program || "—"}</p>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${overdue ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                            }`}
                        >
                          {fmtShort(l.followUpDate)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Quick Actions</h2>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <QuickAction icon={<UserPlus size={18} />} label="Add Lead" tint="text-blue-600 bg-blue-50" onClick={() => router.push("/leads/addlead")} />
                  <QuickAction icon={<FilePlus2 size={18} />} label="New Application" tint="text-purple-600 bg-purple-50" onClick={() => router.push("/applications/new")} />
                  <QuickAction icon={<StudentsIcon size={18} />} label="Students" tint="text-emerald-600 bg-emerald-50" onClick={() => router.push("/students")} />
                  <QuickAction icon={<CalendarDays size={18} />} label="Events" tint="text-amber-600 bg-amber-50" onClick={() => router.push("/events")} />
                  <QuickAction icon={<BarChart3 size={18} />} label="Reports" tint="text-rose-600 bg-rose-50" onClick={() => router.push("/reports")} />
                  <QuickAction icon={<FileStack size={18} />} label="Applications" tint="text-indigo-600 bg-indigo-50" onClick={() => router.push("/applications")} />
                </div>
              </div>
            </div>
          </div>

          <DuplicatePopup
            open={duplicatePopupOpen}
            onClose={() => setDuplicatePopupOpen(false)}
            duplicateReason={duplicateData?.duplicateReason}
            leadId={duplicateData?.leadId}
            phoneNumber={duplicateData?.phoneNumber}
            instituteId={duplicateData?.instituteId}
          />
        </>
      )}
    </div>
  );
}

/* ================= sub components ================= */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:bg-neutral-900 dark:border-neutral-700">
      {(label || payload[0]?.payload?.name) && (
        <p className="mb-1 font-medium text-slate-500">{label || payload[0].payload.name}</p>
      )}
      {payload.map((p: any) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.color || p.payload?.fill }} />
          <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
          <b className="ml-auto pl-3 text-slate-900 dark:text-slate-100">{Number(p.value).toLocaleString()}</b>
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
  delta,
  hint,
  spark,
  loading,
  href,
  onClick,
  disabled,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  delta?: number;
  hint?: string;
  spark?: { v: number }[];
  loading?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const clickable = !!href || !!onClick;
  const inactive = disabled || (clickable === false);

  const handleClick = () => {
    if (disabled || loading) return;
    if (onClick) onClick();
    if (href) window.location.href = href;
  };

  return (
    <div
      onClick={clickable && !disabled ? handleClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable && !disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable || disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:bg-neutral-900 dark:border-neutral-800 ${
        clickable && !disabled
          ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300"
          : ""
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />

      {/* Click to view indicator */}
      {clickable && !disabled && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
          Click to view
          <ArrowUpRight className="w-3 h-3" />
        </span>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${accent}1a`, color: accent }}
        >
          {icon}
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {loading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
              ) : (
                value.toLocaleString()
              )}
            </span>
            {!loading && delta !== undefined && delta > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-600">
                <TrendingUp className="w-3 h-3" />+{delta}
              </span>
            )}
          </div>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>

        {spark && spark.length > 1 && (
          <div className="h-10 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark}>
                <defs>
                  <linearGradient id={`sp-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={accent}
                  strokeWidth={1.8}
                  fill={`url(#sp-${label})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
function RateTile({
  icon,
  label,
  percent,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(percent, 100) * 0.9738} 97.38`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-800 dark:text-slate-100">
          {percent}%
        </span>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-slate-400">
          {icon}
          <ArrowUpRight className="w-3 h-3" />
        </div>
        <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      </div>
    </div>
  );
}

function ConversionRow({
  label,
  value,
  percent,
  showPercent = true,
  color,
}: {
  label: string;
  value: number;
  percent: number;
  showPercent?: boolean;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="flex items-baseline gap-2">
          <b className="text-slate-900 dark:text-slate-100">{value.toLocaleString()}</b>
          {showPercent && <span className="w-9 text-right text-xs text-slate-400">{percent}%</span>}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(percent, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  tint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 px-2 py-3.5 text-xs text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-sm dark:border-neutral-800 dark:text-slate-300"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>{icon}</span>
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 whitespace-nowrap">{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-3.5 text-slate-600 dark:text-slate-300 ${className}`}>{children}</td>;
}