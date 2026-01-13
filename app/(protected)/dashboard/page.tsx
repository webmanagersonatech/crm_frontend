"use client";

import { useState, useEffect, } from "react";
import { DataTable } from "@/components/Tablecomponents";
import { Building2, FileStack, Users2, PhoneCall, UserPlus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,

  ResponsiveContainer,
} from "recharts";
import { getDashboardData, getNewAndFollowupLeads } from "@/app/lib/request/dashboard";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import toast from "react-hot-toast";
import { getaccesscontrol, } from "@/app/lib/request/permissionRequest";

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
  const [dateRange, setDateRange] = useState("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [institutionsLoaded, setInstitutionsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  console.log(userpermission, "userpermission")

  const COLORS = ["#3b82f6", "#ef4444"];

  // 🔹 Date Range Options
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

  // 🧠 Helper to calculate date
  const getDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  };

  // 📅 Handle Date Range Logic
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

  // 🔐 Fetch User Permissions & Role
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


  const generateCSV = () => {
    const TOTAL = 10;
    const headers = ["Name", "Phone", "Date", "City", "Course", "Source"];
    const rows: string[] = [];

    rows.push(headers.join(","));

    for (let i = 1; i <= TOTAL; i++) {
      const name = `Student ${i}`;
      const phone = `9${(100000000 + i).toString()}`; // 10+ digits
      const date = `2024-${String((i % 12) + 1).padStart(2, "0")}-${String(
        (i % 28) + 1
      ).padStart(2, "0")}`;
      const city = ["Delhi", "Mumbai", "Pune", "Chennai"][i % 4];
      const course = ["Maths", "Science", "Commerce", "Arts"][i % 4];
      const source = "import";

      rows.push(
        [name, phone, date, city, course, source].join(",")
      );
    }

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "others.csv";
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const generateCSV1 = () => {
    const TOTAL = 20000;

    const headers = [
      "Name",
      "Mobile",
      "Email",
      "Location",
      "Event Name",
      "Enrolled Date",
    ];

    const rows: string[] = [];
    rows.push(headers.join(","));

    const cities = ["Chennai", "Bangalore", "Hyderabad", "Mumbai"];
    const events = ["Tech Meetup", "Career Fair", "Workshop", "Seminar"];

    for (let i = 1; i <= TOTAL; i++) {
      const name = `Student ${i}`;
      const mobile = `9${(100000000 + i).toString()}`; // valid 10-digit
      const email = `student${i}@test.com`;

      const location = cities[i % cities.length];
      const eventName = events[i % events.length];

      const enrolledDate = `2024-${String((i % 12) + 1).padStart(2, "0")}-${String(
        (i % 28) + 1
      ).padStart(2, "0")}`;

      rows.push(
        [
          name,
          mobile,
          email,
          location,
          eventName,
          enrolledDate,
        ].join(",")
      );
    }

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "events_7000.csv";
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };





  // 🏫 Load Institutions
  useEffect(() => {
    const loadInstitutions = async () => {
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

    loadInstitutions();
  }, []);

  // 📊 Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!permissionsLoaded || !institutionsLoaded) return; // wait until both ready
      if (!hasPermission) return;

      try {
        setLoading(true);
        setError(null);

        const params: any = {};
        if (startDate && endDate) {
          params.startDate = startDate;
          params.endDate = endDate;
        }
        if (selectedInstitution !== "all") {
          params.instituteId = selectedInstitution;
        }

        const data = await getDashboardData(params);
        setDashboardData(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [permissionsLoaded, institutionsLoaded, hasPermission, startDate, endDate, selectedInstitution]);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
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
      } catch (err) {
        console.error(err);
        toast.error("Failed to load leads");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [startDate, endDate, selectedInstitution, currentPage]);

  // 🕓 Handle Manual Custom Date
  const handleCustomDateChange = (setter: any, value: any) => {
    setter(value);
    setDateRange("custom");
  };
  const columns = [

    {
      header: "Lead ID",
      render: (lead: any) => lead.leadId || "—",
    },
    {
      header: "Institute",
      render: (lead: any) =>
        lead.institute?.name || lead.instituteId || "—",
    },

    {
      header: "Candidate",
      accessor: "candidateName",
    },

    {
      header: "Program",
      accessor: "program",
    },

    {
      header: "Phone",
      accessor: "phoneNumber",
    },

    {
      header: "Communication",
      accessor: "communication",
    },

    {
      header: "Follow Up",
      render: (lead: Lead) =>
        lead.followUpDate
          ? new Date(lead.followUpDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          : "—",
    },


    // columnVisibility.createdBy && {
    //   header: "Created By",
    //   render: (lead: any) =>
    //     lead.creator
    //       ? `${lead.creator.firstname || ""} ${lead.creator.lastname || ""}`
    //       : "—",
    // },

    {
      header: "Status",
      render: (lead: Lead) => {
        const statusColorMap: Record<string, string> = {
          New: "bg-gray-100 text-gray-700 border border-gray-400",
          Followup: "bg-blue-100 text-blue-700 border border-blue-400",
          "Not Reachable": "bg-yellow-100 text-yellow-700 border border-yellow-400",
          "Switched Off": "bg-orange-100 text-orange-700 border border-orange-400",
          "Not Picked": "bg-amber-100 text-amber-700 border border-amber-400",
          Irrelevant: "bg-purple-100 text-purple-700 border border-purple-400",
          Interested: "bg-green-100 text-green-700 border border-green-400",
          "Not Interested": "bg-red-100 text-red-700 border border-red-400",
          "Cut the call": "bg-pink-100 text-pink-700 border border-pink-400",
          Admitted: "bg-emerald-100 text-emerald-700 border border-emerald-400",
          Closed: "bg-indigo-100 text-indigo-700 border border-indigo-400",
        };

        const colorClass =
          statusColorMap[lead.status as keyof typeof statusColorMap] ||
          "bg-gray-100 text-gray-700 border border-gray-400";

        return (
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium inline-block min-w-[90px] text-center ${colorClass}`}
          >
            {lead.status || "Unknown"}
          </span>
        );
      },
    },
    {
      header: "Duplicate",
      render: (lead: Lead) => {
        const [showPopup, setShowPopup] = useState(false); // ✅ use imported hook

        if (!lead.isduplicate) return null;

        return (
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => setShowPopup(!showPopup)}
              className="text-red-600 hover:text-red-700 cursor-pointer"
              title="Duplicate Lead"
            >
              ⚠️
            </button>

            {showPopup && lead.duplicateReason && (
              <div
                className="absolute top-full mt-1 w-64 p-2 bg-white border border-red-400 text-sm text-red-700 rounded shadow-lg z-50"
                onMouseLeave={() => setShowPopup(false)}
              >
                {lead.duplicateReason}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Lead Source",
      render: (lead: Lead) => {
        const source = lead.leadSource || "—";

        const sourceColorMap: Record<string, string> = {
          offline: "bg-blue-100 text-blue-700 border border-blue-400",
          online: "bg-green-100 text-green-700 border border-green-400",
          application: "bg-purple-100 text-purple-700 border border-purple-400",
        };

        const colorClass =
          sourceColorMap[source.toLowerCase()] ||
          "bg-gray-100 text-gray-700 border border-gray-400";

        return (
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium inline-block min-w-[90px] text-center ${colorClass}`}
          >
            {source.charAt(0).toUpperCase() + source.slice(1)}
          </span>
        );
      },
    },









    // Always visible (actions etc.)

  ].filter(Boolean) as any;
  // 🥧 Pie Chart Data
  const pieData = [
    { name: "Paid", value: dashboardData?.paidApplications || 0 },
    { name: "Unpaid", value: dashboardData?.unpaidApplications || 0 },
  ];

  // 📈 Dummy Lead Data
  const leadData = [
    { name: "Follow Up", value: dashboardData?.followUpLeads || 0 },
    { name: "Not Interested", value: dashboardData?.notInterestedLeads || 0 },
    { name: "Closed", value: dashboardData?.closedLeads || 0 },
  ];

  // 🌀 Show Spinner until all required data loaded
  if (!permissionsLoaded || !institutionsLoaded) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  // 🚫 No Permission Case
  if (!hasPermission) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <p className="text-red-500 font-semibold text-lg">
          Access Denied — You do not have permission to view the Dashboard.
        </p>
      </div>
    );
  }

  // ✅ Main Dashboard UI
  return (
    <div className="space-y-6 p-3 sm:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
          Dashboard
        </h1>
      </div>

      <a href="http://localhost:4000/api/institutions/apply/INS-UC25AJOH"
        target="blank"
        className="apply-btn">
        Apply Online
      </a>


      <a href="http://localhost:4000/api/institutions/enquiry/INS-UC25AJOH"
        target="blank"
        className="apply-btn border border-black">
        Enquiry
      </a>




      <button
        onClick={generateCSV}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Generate  CSV
      </button>
      {/* 🔹 Filters Section */}
      <div className="bg-white dark:bg-neutral-900 shadow-md rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">

          {/* Date Range */}
          {(userRole === "superadmin" || userpermission?.filter) && (
            <>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480]  transition"
                >
                  {dateOptions.map((opt) => (
                    <option
                      key={opt.label}
                      value={opt.value}
                      disabled={opt.disabled}
                      hidden={opt.disabled} // hides from dropdown but shows as default
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
                  className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480]  transition"
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
                  className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480]  transition"
                />
              </div>
            </>
          )}

          {userRole === "superadmin" && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Institution
              </label>
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480]  transition"
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
        </div>
      </div>

      {/* 🔹 Dashboard Data */}
      {loading ? (
        <p className="text-center text-gray-500">Loading dashboard data...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <>


          {(userRole === "superadmin" || userpermission?.view) && (
            <>
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === "superadmin" ? "lg:grid-cols-4" : "lg:grid-cols-3"
                  } gap-4 sm:gap-6`}
              >


                {userRole === "superadmin" && (<MetricCard
                  color="bg-blue-500"
                  icon={<Building2 className="w-7 h-7 text-white" />}
                  label="Total Institutions"
                  value={dashboardData?.totalInstitutes || 0}
                />)}

                <MetricCard
                  color="bg-green-500"
                  icon={<FileStack className="w-7 h-7 text-white" />}
                  label="Total Applications"
                  value={dashboardData?.totalApplications || 0}
                />
                <MetricCard
                  color="bg-orange-500"
                  icon={<Users2 className="w-7 h-7 text-white" />}
                  label="Total Leads"
                  value={dashboardData?.totalLeads || 0}
                />

                <MetricCard
                  color="bg-yellow-500"
                  icon={<PhoneCall className="w-7 h-7 text-white" />}
                  label="Total Follow Up Leads"
                  value={dashboardData?.followUpLeads || 0}
                />
              </div>
              <DataTable
                columns={columns}
                data={leads}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
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
                  <div className="flex justify-center gap-6 mt-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[0] }}
                      ></span>
                      <span>Paid</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[1] }}
                      ></span>
                      <span>Unpaid</span>
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

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-900 shadow-md rounded-2xl p-5 flex items-center justify-between transition hover:shadow-lg">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-neutral-400">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-bold mt-1">{value}</p>
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
