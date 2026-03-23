"use client";

import { useState, useEffect, useCallback } from "react";
import { MdDashboard } from "react-icons/md";
import { DataTable } from "@/components/Tablecomponents";
import { Building2, Pencil, FileStack, Users2, PhoneCall, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line, XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { getDashboardData, getNewAndFollowupLeads } from "@/app/lib/request/dashboard";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { toast } from "react-toastify";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import DuplicatePopup from "@/components/DuplicatePopup";

// ... (keep all interfaces and type definitions)
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
export default function DashboardPage() {
  const router = useRouter()
  const [dateRange, setDateRange] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [leadsLoading, setLeadsLoading] = useState<boolean>(false);
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
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  
  // Add a ref to track if this is the initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b"];

  // Date Options
  const dateOptions = [
    { label: "Choose Range", value: "", disabled: true },
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "last7" },
    { label: "Last 30 Days", value: "last30" },
    { label: "Last 3 Months", value: "last90" },
    { label: "Last 6 Months", value: "last180" },
    { label: "Custom", value: "custom" },
  ];

  // Helper to calculate date
  const getDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  };

  // Handle Date Range Logic
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    switch (dateRange) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "yesterday":
        setStartDate(getDate(1));
        setEndDate(getDate(1));
        break;
      case "last7":
        setStartDate(getDate(7));
        setEndDate(today);
        break;
      case "last30":
        setStartDate(getDate(30));
        setEndDate(today);
        break;
      case "last90":
        setStartDate(getDate(90));
        setEndDate(today);
        break;
      case "last180":
        setStartDate(getDate(180));
        setEndDate(today);
        break;
      default:
        break;
    }
  }, [dateRange]);

  // Fetch User Permissions & Role
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
        console.log(decoded, "decoded")
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
      } catch (error) {
        console.error("Failed to decode token or fetch permissions:", error);
        setHasPermission(false);
      } finally {
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, []);

  // Load Institutions
  useEffect(() => {
    const loadInstitutions = async () => {
      if (userRole !== "superadmin") {
        setInstitutionsLoaded(true);
        return;
      }

      try {
        const activeInstitutions = await getActiveInstitutions();
        setInstitutions(
          activeInstitutions.map((inst: any) => ({
            value: inst.instituteId,
            label: inst.name,
          }))
        );
      } catch {
        toast.error("Failed to load institutions");
      } finally {
        setInstitutionsLoaded(true);
      }
    };

    if (userRole !== null) {
      loadInstitutions();
    }
  }, [userRole]);

  // 🔑 FIX: Create a single function to fetch all data
  const fetchAllData = useCallback(async () => {
    if (!permissionsLoaded || !institutionsLoaded) return;
    if (!hasPermission) return;

    // Build params object
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (selectedInstitution !== "all") {
      params.instituteId = selectedInstitution;
    }

    try {
      // Fetch dashboard data and leads in parallel
      setLoading(true);
      setLeadsLoading(true);
      setError(null);
      
      const [dashboardResponse, leadsResponse] = await Promise.all([
        getDashboardData(params),
        getNewAndFollowupLeads({ ...params, page: currentPage, limit: 5 })
      ]);
      
      setDashboardData(dashboardResponse);
      setLeads(leadsResponse.docs as Lead[]);
      setTotalPages(leadsResponse.totalPages || 1);
      setTotalEntries(leadsResponse?.totalDocs || 0);
      
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to fetch dashboard data");
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
      setLeadsLoading(false);
      setIsInitialLoad(false);
    }
  }, [permissionsLoaded, institutionsLoaded, hasPermission, startDate, endDate, selectedInstitution, currentPage]);

  // 🔑 FIX: Single useEffect to fetch all data when dependencies change
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle Manual Custom Date
  const handleCustomDateChange = (setter: any, value: any) => {
    setter(value);
    setDateRange("custom");
    // Reset to page 1 when date changes
    setCurrentPage(1);
  };

  // Handle institution change
  const handleInstitutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedInstitution(e.target.value);
    setCurrentPage(1); // Reset to page 1 when institution changes
  };

  // Handle date range change
  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateRange(e.target.value);
    setCurrentPage(1); // Reset to page 1 when date range changes
  };

  const columns = [
    // ... (keep your existing columns configuration)
  ].filter(Boolean) as any;

  const pieData = [
    { name: "Paid", value: dashboardData?.paidApplications || 0 },
    { name: "Unpaid", value: dashboardData?.unpaidApplications || 0 },
    { name: "Complete", value: dashboardData?.completeApplications || 0 },
    { name: "Incomplete", value: dashboardData?.incompleteApplications || 0 },
  ];

  const leadData = [
    { name: "Follow Up", value: dashboardData?.followUpLeads || 0 },
    { name: "Not Interested", value: dashboardData?.notInterestedLeads || 0 },
    { name: "Closed", value: dashboardData?.closedLeads || 0 },
  ];

  // Show Spinner until all required data loaded
  if (!permissionsLoaded || !institutionsLoaded) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  // No Permission Case
  if (!hasPermission) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <p className="text-red-500 font-semibold text-lg">
          Access Denied — You do not have permission to view the Dashboard.
        </p>
      </div>
    );
  }

  // Main Dashboard UI
  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MdDashboard className="text-2xl text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Dashboard
          </h1>
        </div>
      </div>

      {/* {userRole === "superadmin" && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0 mt-4">
          <a
            href="http://localhost:3001/INS-ESTKLHCB"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded shadow hover:bg-green-700 transition"
          >
            Apply Online
          </a>
        </div>
      )} */}

      {/* Filters Section */}
      <div className="bg-white dark:bg-neutral-900 shadow-md rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          {(userRole === "superadmin" || userpermission?.filter) && (
            <>
              {userRole === "superadmin" && (
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Institution
                  </label>
                  <select
                    value={selectedInstitution}
                    onChange={handleInstitutionChange}
                    className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                  >
                    <option value="all">All Institutions</option>
                    {institutions.map((inst) => (
                      <option key={inst.value} value={inst.value}>
                        {inst.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                >
                  {dateOptions.map((opt) => (
                    <option
                      key={opt.label}
                      value={opt.value}
                      disabled={opt.disabled}
                      hidden={opt.disabled}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleCustomDateChange(setStartDate, e.target.value)}
                  className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="YYYY-MM-DD"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleCustomDateChange(setEndDate, e.target.value)}
                  className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Data */}
      {loading && isInitialLoad ? (
        <p className="text-center text-gray-500">Loading dashboard data...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <>
          {(userRole === "superadmin" || userpermission?.view) && (
            <>
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  userRole === "superadmin" ? "lg:grid-cols-4" : "lg:grid-cols-3"
                } gap-4 sm:gap-6`}
              >
                {userRole === "superadmin" && (
                  <MetricCard
                    color="bg-blue-500"
                    icon={<Building2 className="w-7 h-7 text-white" />}
                    label="Total Institutions"
                    value={dashboardData?.totalInstitutes || 0}
                  />
                )}

                <MetricCard
                  color="bg-green-500"
                  icon={<FileStack className="w-7 h-7 text-white" />}
                  label="Total Applications"
                  todayValue={dashboardData?.todayApplications || 0}
                  todayLabel="Today"
                  value={dashboardData?.totalApplications || 0}
                />
                <MetricCard
                  color="bg-orange-500"
                  icon={<Users2 className="w-7 h-7 text-white" />}
                  label="Total Leads"
                  todayValue={dashboardData?.todayLeads || 0}
                  todayLabel="Today"
                  value={dashboardData?.totalLeads || 0}
                />
                <MetricCard
                  color="bg-yellow-500"
                  icon={<PhoneCall className="w-7 h-7 text-white" />}
                  label="Total Follow Up Leads"
                  todayValue={dashboardData?.todayFollowUpLeads || 0}
                  todayLabel="Today"
                  value={dashboardData?.followUpLeads || 0}
                />
              </div>

              <DataTable
                columns={columns}
                data={leads}
                totalEntries={totalEntries}
                loading={leadsLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
              
              <DuplicatePopup
                open={duplicatePopupOpen}
                onClose={() => setDuplicatePopupOpen(false)}
                duplicateReason={duplicateData?.duplicateReason}
                leadId={duplicateData?.leadId}
                phoneNumber={duplicateData?.phoneNumber}
                instituteId={duplicateData?.instituteId}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Lead Chart */}
                <ChartCard title="Lead Manager">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={leadData}>
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#ef4444"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Applications Pie Chart */}
                <ChartCard title="Admission Applications">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" outerRadius={90} label>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <p className="text-center text-sm text-gray-600 mt-3">
                    Total Applications: <b>{dashboardData?.totalApplications || 0}</b>
                  </p>

                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-6 mt-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[0] }}></span>
                      <span>Paid</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[1] }}></span>
                      <span>Unpaid</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[2] }}></span>
                      <span>Complete</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[3] }}></span>
                      <span>Incomplete</span>
                    </div>
                  </div>
                </ChartCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ... (keep MetricCard and ChartCard components unchanged)

function MetricCard({
  icon,
  label,
  value,
  color,
  todayValue,
  todayLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  todayValue?: number;
  todayLabel?: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-900 shadow-md rounded-2xl p-5 flex items-center justify-between transition hover:shadow-lg">
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
        {todayValue !== undefined && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
              +{todayValue}
            </span>
            <span className="text-xs text-gray-500 dark:text-neutral-400">
              {todayLabel || "Today"}
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 sm:p-4 rounded-2xl shadow-md ${color}`}>{icon}</div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-neutral-900 shadow-md rounded-2xl p-4 sm:p-6">
      <h2 className="font-semibold mb-3 sm:mb-4 text-gray-700 dark:text-gray-200">
        {title}
      </h2>
      {children}
    </div>
  );
}
