"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, FileText, Users, FileDown, Search, Settings } from "lucide-react";
import { DataTable } from "@/components/Tablecomponents";
import { getApplications, } from "@/app/lib/request/application";
import toast from "react-hot-toast";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { getLeads, } from "@/app/lib/request/leadRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import ExportModal from "@/components/ExportModal";
import { Column } from "@/components/Tablecomponents";

interface Application {
  _id?: string;
  instituteId: any;
  userId?: any;
  academicYear: string;
  personalData: Record<string, any>;
  educationData: Record<string, any>;
  paymentStatus: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}
interface OptionType {
  value: string;
  label: string;
}
interface Lead {
  _id: string;
  instituteId: string;
  applicationId?: string;
  program: string;
  candidateName: string;
  phoneNumber?: string;
  status?: string;
  dateOfBirth?: string;
  communication?: string;
  leadId: string;
  ugDegree?: string;
  country?: string;
  state?: string;
  city?: string;
  followUpDate?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
}


export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"application" | "lead">("application");
  const [open, setOpen] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadloading, setleadLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [leadcurrentPage, setleadCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalleadPages, setleadTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");
  const [searchApplicationId, setSearchApplicationId] = useState("");
  const [searchApplicantName, setSearchApplicantName] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommunication, setSelectedCommunication] = useState("all");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [institutions, setInstitutions] = useState<
    { value: string; label: string }[]
  >([]);
  const [columnVisibility, setColumnVisibility] = useState({
    applicationId: true,
    institute: true,
    applicantName: true,
    program: true,
    academicYear: true,
    paymentStatus: true,
    createdAt: true,
  });
  const [columnVisibilityreport, setColumnVisibilityreport] = useState({
    instituteId: true,
    candidateName: true,
    program: true,
    phoneNumber: true,
    communication: true,
    followUp: true,
    createdBy: true,
    status: true,
    applicationStatus: true,
  });


  useEffect(() => {
    const fetchPermissions = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        console.log("No token found, skipping API call");
        setHasPermission(false);
        return;
      }
      try {
        const payload = token.split(".")[1];
        const decoded: any = JSON.parse(atob(payload));

        if ((decoded.role === "admin" || decoded.role === "user") && decoded.instituteId) {
          const data = await getaccesscontrol({
            role: decoded.role,
            instituteId: decoded.instituteId
          });

          const reportPermission = data.permissions?.find(
            (p: any) => p.moduleName === "Reports"
          );

          if (
            reportPermission &&
            (reportPermission.view ||
              reportPermission.create ||
              reportPermission.edit ||
              reportPermission.delete ||
              reportPermission.filter ||
              reportPermission.download)
          ) {
            setUserpermisssion(reportPermission);
            setHasPermission(true);
          } else {
            setUserpermisssion(null);
            setHasPermission(false);
          }
        } else if (decoded.role === "superadmin") {

          setUserpermisssion("superadmin");
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error("Failed to decode token or fetch permissions:", error);
        setHasPermission(false);
      }
    };

    fetchPermissions();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("No token found, skipping API call");
      setHasPermission(false);
      return;
    }

    // Decode JWT manually
    let decoded: any = null;
    try {
      const payload = token.split(".")[1];
      decoded = JSON.parse(atob(payload));
    } catch (err) {
      console.error("Error decoding token:", err);
      setHasPermission(false);
      return;
    }

    // Only SUPERADMIN can load institutions
    if (decoded.role !== "superadmin") {
      console.log("Role is not superadmin → skipping institution API");
      return;
    }

    const loadInstitutions = async () => {
      try {
        const activeInstitutions = await getActiveInstitutions();
        const options = activeInstitutions.map((inst: any) => ({
          value: inst.instituteId,
          label: inst.name,
        }));
        setInstitutions(options);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load institutions");
      }
    };

    loadInstitutions();
  }, []);

  const columnOptions = [
    { key: "applicationId", label: "Application ID" },
    { key: "institute", label: "Institute" },
    { key: "applicantName", label: "Applicant Name" },
    { key: "program", label: "Program" },
    { key: "academicYear", label: "Academic Year" },
    { key: "paymentStatus", label: "Payment Status" },
    { key: "createdAt", label: "Created At" },
  ];

  const columnOptionsreport = [
    { key: "instituteId", label: "Institute" },
    { key: "candidateName", label: "Candidate" },
    { key: "program", label: "Program" },
    { key: "phoneNumber", label: "Phone" },
    { key: "communication", label: "Communication" },
    { key: "followUp", label: "Follow Up" },
    { key: "createdBy", label: "Created By" },
    { key: "status", label: "Status" },
    { key: "applicationStatus", label: "Application Status" },
  ];


  const statusOptions: OptionType[] = [
    { value: "New", label: "New" },
    { value: "Followup", label: "Followup" },
    { value: "Not Reachable", label: "Not Reachable" },
    { value: "Switched Off", label: "Switched Off" },
    { value: "Not Picked", label: "Not Picked" },
    { value: "Irrelevant", label: "Irrelevant" },
    { value: "Interested", label: "Interested" },
    { value: "Not Interested", label: "Not Interested" },
    { value: "Cut the call", label: "Cut the call" },
    { value: "Admitted", label: "Admitted" },
    { value: "Closed", label: "Closed" },
  ];

  const communicationOptions: OptionType[] = [
    { value: "WhatsApp", label: "WhatsApp" },
    { value: "Offline", label: "Offline" },
    { value: "Online", label: "Online" },
    { value: "Phone", label: "Phone" },
    { value: "Social Media", label: "Social Media" },
  ];

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApplications({
        page: currentPage,
        limit,
        academicYear: selectedYear !== "all" ? selectedYear : undefined,
        instituteId:
          selectedInstitution !== "all" ? selectedInstitution : undefined,
        paymentStatus:
          selectedPayment !== "all" ? selectedPayment : undefined,
        applicationId: searchApplicationId.trim() || undefined,
        applicantName: searchApplicantName.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      setApplications((res.data as Application[]) || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      toast.error("Failed to load applications");
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedYear, selectedInstitution, limit, selectedPayment, startDate, endDate, searchApplicationId, searchApplicantName]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);


  const filteredApplications = (applications || []).map((app: any) => {
    const obj: any = {};

    if (columnVisibility.applicationId) {
      obj.ApplicationId = app.applicationId || "-";
    }

    if (columnVisibility.institute) {
      obj.Institute = app.institute?.name || app.instituteId || "-";
    }

    if (columnVisibility.applicantName) {
      obj.ApplicantName =
        app.applicantName ||
        app.personalData?.["Full Name"] ||
        "-";
    }

    if (columnVisibility.program) {
      obj.Program = app.program || "-";
    }

    if (columnVisibility.academicYear) {
      obj.AcademicYear = app.academicYear || "-";
    }

    if (columnVisibility.paymentStatus) {
      obj.PaymentStatus = app.paymentStatus || "-";
    }

    if (columnVisibility.createdAt) {
      obj.CreatedAt = app.createdAt
        ? new Date(app.createdAt).toLocaleDateString()
        : "-";
    }

    return obj;
  });


  const fetchLeads = useCallback(async () => {
    setleadLoading(true);
    try {
      const res = await getLeads({
        page: leadcurrentPage,
        limit: 10,
        instituteId: selectedInstitution !== "all" ? selectedInstitution : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        communication: selectedCommunication !== "all" ? selectedCommunication : undefined,
        candidateName: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLeads(res.docs || []);
      setleadTotalPages(res.totalPages || 1);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setleadLoading(false);
    }
  }, [currentPage, selectedInstitution, selectedStatus, selectedCommunication, searchTerm, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "lead") {
      fetchLeads();
    }
  }, [activeTab, fetchLeads]);

  const filteredLeads = (leads || []).map((lead: any) => {
    const obj: any = {};

    if (columnVisibilityreport.instituteId) {
      obj.Institute = lead.institute?.name || lead.instituteId || "-";
    }

    if (columnVisibilityreport.candidateName) {
      obj.Candidate = lead.candidateName || "-";
    }

    if (columnVisibilityreport.program) {
      obj.Program = lead.program || "-";
    }

    if (columnVisibilityreport.phoneNumber) {
      obj.Phone = lead.phoneNumber || "-";
    }

    if (columnVisibilityreport.communication) {
      obj.Communication = lead.communication || "-";
    }

    if (columnVisibilityreport.followUp) {
      obj.FollowUpDate = lead.followUpDate
        ? new Date(lead.followUpDate).toLocaleString()
        : "-";
    }

    if (columnVisibilityreport.createdBy) {
      obj.CreatedBy = lead.creator
        ? `${lead.creator.firstname || ""} ${lead.creator.lastname || ""}`.trim()
        : "-";
    }

    if (columnVisibilityreport.status) {
      obj.Status = lead.status || "-";
    }

    return obj;
  });





  const columns = [

    columnVisibility.applicationId && {
      header: "Application Id",
      render: (a: any) =>
        a.applicationId ? a.applicationId.toUpperCase() : "—",
    },

    columnVisibility.institute && {
      header: "Institute",
      render: (a: any) =>
        a.institute?.name || a.instituteId || "—",
    },

    columnVisibility.applicantName && {
      header: "Applicant Name",
      render: (a: any) => a.applicantName || "—",
    },

    columnVisibility.program && {
      header: "Program",
      render: (a: any) => a.program || "—",
    },

    columnVisibility.academicYear && {
      header: "Academic Year",
      accessor: "academicYear",
    },

    columnVisibility.paymentStatus && {
      header: "Payment Status",
      render: (a: Application) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-medium border
          ${a.paymentStatus === "Paid"
              ? "bg-green-50 text-green-700 border-green-300"
              : a.paymentStatus === "Partially"
                ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                : "bg-red-50 text-red-700 border-red-300"
            }`}
        >
          {a.paymentStatus}
        </span>
      ),
    },

    columnVisibility.createdAt && {
      header: "Created At",
      render: (a: Application) =>
        new Date(a.createdAt).toLocaleDateString(),
    },



  ].filter(Boolean) as Column<any>[];



  const leadcolumns = [
    columnVisibilityreport.instituteId && {
      header: "Institute",
      render: (lead: any) =>
        lead.institute?.name || lead.instituteId || "—",
    },

    columnVisibilityreport.candidateName && {
      header: "Candidate",
      accessor: "candidateName",
    },

    columnVisibilityreport.program && {
      header: "Program",
      accessor: "program",
    },

    columnVisibilityreport.phoneNumber && {
      header: "Phone",
      accessor: "phoneNumber",
    },

    columnVisibilityreport.communication && {
      header: "Communication",
      accessor: "communication",
    },

    columnVisibilityreport.followUp && {
      header: "Follow Up",
      render: (lead: Lead) =>
        lead.followUpDate
          ? new Date(lead.followUpDate).toLocaleString()
          : "—",
    },

    columnVisibilityreport.createdBy && {
      header: "Created By",
      render: (lead: any) =>
        lead.creator
          ? `${lead.creator.firstname || ""} ${lead.creator.lastname || ""}`
          : "—",
    },

    columnVisibilityreport.status && {
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




  ].filter(Boolean) as any;



  // Dynamic header icon
  const ReportIcon =
    activeTab === "application" ? FileText : activeTab === "lead" ? Users : BarChart3;

  if (!hasPermission) {
    return (
      <div className="p-6 text-center text-red-600">
        You do not have permission to access this page. Please contact your superadmin.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <ReportIcon className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
          {activeTab === "application" ? "Application Reports" : "Lead Reports"}
        </h1>
      </div>

      {/* Tabs */}
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("application")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${activeTab === "application"
            ? "bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        >
          <FileText className="w-4 h-4 mr-2" /> Application Report
        </button>

        <button
          onClick={() => setActiveTab("lead")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${activeTab === "lead"
            ? "bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        >
          <Users className="w-4 h-4 mr-2" /> Lead Report
        </button>
      </div>

      {/* Filters + Export */}
      <div className="mt-4 bg-white dark:bg-gray-900 shadow-sm rounded-lg p-4">
        {/* Flex wrap — automatically moves filters to next line */}
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Left side — All filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setCustomizeOpen(true)}
              className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
            >
              <Settings className="w-4 h-4" /> Customize Columns
            </button>
            {/* 📅 Date Range */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              />
              <span className="flex items-center justify-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                  viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              />
            </div>

            {/* 🔢 Application ID */}
            {activeTab !== "lead" && (
              <input
                type="text"
                placeholder="Search by Application ID"
                value={searchApplicationId}
                onChange={(e) => {
                  setSearchApplicationId(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              />
            )}

            {/* 🧍 Applicant / Lead Name */}
            {activeTab === "lead" ? (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                />
              </div>
            ) : (
              <input
                type="text"
                placeholder="Search by Applicant"
                value={searchApplicantName}
                onChange={(e) => {
                  setSearchApplicantName(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              />
            )}

            {/* 🏫 Institution Dropdown */}
            {userpermission === "superadmin" && (
              <select
                value={selectedInstitution}
                onChange={(e) => {
                  setSelectedInstitution(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              >
                <option value="all">All Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.value} value={inst.value}>
                    {inst.label}
                  </option>
                ))}
              </select>
            )}

            {/* 💳 Payment Filter */}
            {activeTab !== "lead" && (
              <select
                value={selectedPayment}
                onChange={(e) => {
                  setSelectedPayment(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              >
                <option value="all">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            )}

            {/* 📈 Lead Filters */}
            {activeTab === "lead" && (
              <>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                >
                  <option value="all">All Status</option>
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCommunication}
                  onChange={(e) => setSelectedCommunication(e.target.value)}
                  className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                >
                  <option value="all">All Communication</option>
                  {communicationOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* 🎓 Academic Year */}
            {activeTab !== "lead" && (
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              >
                <option value="all">All Years</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            )}
          </div>

          {/* 📤 Export Button */}
          {(userpermission === "superadmin" || userpermission?.download) && (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-1 bg-green-700 hover:bg-green-800 text-white px-4 py-2 text-sm rounded-md transition"
            >
              <FileDown className="w-4 h-4" /> Export
            </button>
          )}
        </div>

        <ExportModal
          open={open}
          title={activeTab === "application" ? "APPLICATION REPORT" : "LEAD REPORT"}
          onClose={() => setOpen(false)}
          data={activeTab === "application" ? filteredApplications : filteredLeads}
        />

        <ColumnCustomizeDialog
          open={customizeOpen}
          title={`Customize ${activeTab} Report Columns`}
          columns={activeTab === "application" ? columnOptions : columnOptionsreport}
          selected={activeTab === "application" ? columnVisibility : columnVisibilityreport}
          onChange={(updated) => {
            if (activeTab === "application") {
              setColumnVisibility(prev => ({ ...prev, ...updated }));
            } else {
              setColumnVisibilityreport(prev => ({ ...prev, ...updated }));
            }
          }}
          onClose={() => setCustomizeOpen(false)}
        />


      </div>


      <div className="bg-white shadow rounded-lg p-4">
        {activeTab === "application" ? (
          <DataTable
            columns={columns}
            data={applications}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        ) : (
          <DataTable
            columns={leadcolumns}
            data={leads}
            loading={leadloading}
            currentPage={leadcurrentPage}
            totalPages={totalleadPages}
            onPageChange={setleadCurrentPage}
          />
        )}
      </div>


    </div>
  );
}
