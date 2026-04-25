"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  FileDown,
  Settings,
  Search,
  GraduationCap,
  X,
  Users,
  Loader2,
  Trash2,
  Filter,
  Calendar,
  MapPin,
  ClipboardList,

} from "lucide-react";
import { toast } from "react-toastify";
import ViewDialog from "@/components/ViewDialog";
import { DataTable, Column } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import {
  listMatTrainingRequest,
  deleteMatTrainingRequest,
  exportMatTrainingRequest,
  MatTrainingData,
  verifyPaymentRequest,
} from "@/app/lib/request/matregistrationRequest";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";

interface Statistics {
  totalRegistrations: number;
  totalCities: number;
  totalStudents: number;
  totalWorking: number;
}

export default function MATTrainingPage() {
  const [registrations, setRegistrations] = useState<MatTrainingData[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalRegistrations: 0,
    totalCities: 0,
    totalStudents: 0,
    totalWorking: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState<string>("");
  const [cityFilter, setCityFilter] = useState("all");
  const [studentWorkingFilter, setStudentWorkingFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<MatTrainingData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [confirmType, setConfirmType] = useState<"delete" | null>(null);
  const [exportData, setExportData] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [limit, setLimit] = useState(10);
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);
  // Add this state with your other states
  const [screenshotOpen, setScreenshotOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [verifyConfirmOpen, setVerifyConfirmOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<MatTrainingData | null>(null);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  const studentWorkingOptions = [
    { value: "all", label: "All" },
    { value: "Student", label: "Student" },
    { value: "Working", label: "Working Professional" },
  ];

  const paymentOptions = [
    { value: "all", label: "All" },
    { value: "submitted", label: "Submitted" },
    { value: "not_submitted", label: "Not Submitted" },
  ];

  const verificationOptions = [
    { value: "all", label: "All" },
    { value: "verified", label: "Verified" },
    { value: "not_verified", label: "Not Verified" },
  ];

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await listMatTrainingRequest({ limit: 1000, page: 1 });
        const citiesSet = new Set<string>();

        res.docs?.forEach((reg: MatTrainingData) => {
          if (reg.city) citiesSet.add(reg.city);
        });

        setCityOptions(Array.from(citiesSet).map(city => ({ value: city, label: city })));
      } catch (error) {
        console.error("Failed to fetch filter options", error);
      }
    };
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found");
      return;
    }
    try {
      const payload: any = JSON.parse(atob(token.split(".")[1]));
      setRole(payload.role);
    } catch (error) {
      console.error("Failed to decode token", error);
    }
  }, []);

  const handleExport = async () => {
    try {
      setExportLoading(true);

      const res = await exportMatTrainingRequest({
        search: searchTerm,
        city: cityFilter,
        studentWorking: studentWorkingFilter,
        startDate: startDate,
        paymentStatus: paymentFilter,
        verificationStatus: verificationFilter,
        endDate: endDate,
      });

      const exportData = res.data || [];

      const transformedData = exportData.map((reg: MatTrainingData) => {
        const obj: any = {};

        if (columnVisibility.regId) {
          obj["Registration ID"] = reg.regId || "-";
        }
        if (columnVisibility.name) {
          obj["Name"] = reg.name || "-";
        }
        if (columnVisibility.mobile) {
          obj["Mobile"] = reg.mobile || "-";
        }
        if (columnVisibility.email) {
          obj["Email"] = reg.email || "-";
        }
        if (columnVisibility.city) {
          obj["City"] = reg.city || "-";
        }
        if (columnVisibility.ugDegree) {
          obj["UG Degree"] = reg.ugDegree || "-";
        }
        if (columnVisibility.ugCollege) {
          obj["UG College"] = reg.ugCollege || "-";
        }
        if (columnVisibility.studentWorking) {
          obj["Status"] = reg.studentWorking || "-";
        }
        if (columnVisibility.paymentStatus) {
          obj["Payment"] = reg.paymentScreenshot ? "Submitted" : "Pending";
        }
        if (columnVisibility.createdAt) {
          obj["Registered On"] = reg.createdAt
            ? new Date(reg.createdAt).toLocaleDateString()
            : "-";
        }

        return obj;
      });

      setExportData(transformedData);
      setExportOpen(true);

    } catch (error: any) {
      toast.error("Failed to export registrations: " + (error.message || "Unknown error"));
      console.error("Error exporting registrations:", error);
    } finally {
      setExportLoading(false);
    }
  };

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMatTrainingRequest({
        limit: limit,
        page: currentPage,
        search: searchTerm,
        city: cityFilter,
        studentWorking: studentWorkingFilter,
        startDate: startDate,

        endDate: endDate,
        paymentStatus: paymentFilter,
        verificationStatus: verificationFilter,
      });

      setRegistrations(res.docs || []);
      setTotalPages(res.totalPages || 1);
      setTotalEntries(res.totalDocs || 0);

      // Update city options from backend
      if (res.cityOptions && res.cityOptions.length > 0) {
        setCityOptions(res.cityOptions.map(city => ({ value: city, label: city })));
      }

      // ✅ Use statistics from backend (includes all filters)
      if (res.statistics) {
        setStatistics({
          totalRegistrations: res.statistics.totalRegistrations,
          totalCities: res.statistics.totalCities,
          totalStudents: res.statistics.totalStudents,
          totalWorking: res.statistics.totalWorking,
        });
      } else {
        // Fallback calculation if backend doesn't provide statistics (for backward compatibility)
        const totalRegistrations = res.totalDocs || 0;
        const totalCities = res.cityOptions?.length || 0;
        const students = res.docs?.filter((r: MatTrainingData) => r.studentWorking === "Student").length || 0;
        const working = res.docs?.filter((r: MatTrainingData) => r.studentWorking === "Working").length || 0;

        setStatistics({
          totalRegistrations,
          totalCities,
          totalStudents: students,
          totalWorking: working,
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Something went wrong";

      if (err.response?.status === 403) {
        toast.error(`${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }

      console.error("Failed to fetch registrations:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, paymentFilter, verificationFilter, limit, cityFilter, studentWorkingFilter, startDate, endDate]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const confirmAction = async () => {
    if (!selectedRegistration || !confirmType) return;

    try {
      if (confirmType === "delete") {
        await deleteMatTrainingRequest(selectedRegistration._id);
        toast.success("MAT Training registration deleted successfully!");
      }

      await fetchRegistrations();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setConfirmOpen(false);
      setSelectedRegistration(null);
      setConfirmType(null);
    }
  };


  const handleVerifyClick = (reg: MatTrainingData) => {
    setVerifyTarget(reg);
    setVerifyConfirmOpen(true);
  };

  const confirmVerify = async () => {
    if (!verifyTarget) return;

    try {
      await verifyPaymentRequest(verifyTarget._id, true);

      toast.success("Payment verified successfully");

      await fetchRegistrations();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setVerifyConfirmOpen(false);
      setVerifyTarget(null);
    }
  };


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

        if ((decoded.role === "admin" || decoded.role === "user") && decoded.instituteId && decoded.id) {

          const data = await getaccesscontrol({
            userId: decoded.id,
            instituteId: decoded.instituteId
          });
          const permissions = data.permissions?.find(
            (p: any) => p.moduleName === "MAT Registration"
          );
          if (
            permissions &&
            (permissions.view ||
              permissions.create ||
              permissions.edit ||
              permissions.delete ||
              permissions.filter ||
              permissions.download)
          ) {

            setUserpermisssion(permissions);
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

  const [columnVisibility, setColumnVisibility] = useState({
    regId: true,
    name: true,
    mobile: true,
    email: true,
    city: true,
    ugDegree: true,
    ugCollege: true,
    studentWorking: true,
    paymentStatus: true,
    createdAt: true,
  });

  const columnOptions = [
    { key: "regId", label: "Registration ID" },
    { key: "name", label: "Name" },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "ugDegree", label: "UG Degree" },
    { key: "ugCollege", label: "UG College" },
    { key: "studentWorking", label: "Status" },
    { key: "paymentStatus", label: "Payment" },
    { key: "createdAt", label: "Registered On" },
  ];

  const columns: Column<MatTrainingData>[] = [
    columnVisibility.regId && {
      header: "Reg ID",
      render: (reg: MatTrainingData) => reg.regId || "-",
    },
    columnVisibility.name && {
      header: "Name",
      render: (reg: MatTrainingData) => reg.name || "-",
    },
    columnVisibility.mobile && {
      header: "Mobile",
      render: (reg: MatTrainingData) => reg.mobile || "-",
    },
    columnVisibility.email && {
      header: "Email",
      render: (reg: MatTrainingData) => (
        <div className="max-w-xs truncate" title={reg.email}>
          {reg.email || "-"}
        </div>
      ),
    },
    columnVisibility.city && {
      header: "City",
      render: (reg: MatTrainingData) => (
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3 text-gray-400" />
          {reg.city || "-"}
        </span>
      ),
    },
    columnVisibility.ugDegree && {
      header: "UG Degree",
      render: (reg: MatTrainingData) => reg.ugDegree || "-",
    },
    columnVisibility.ugCollege && {
      header: "UG College",
      render: (reg: MatTrainingData) => (
        <div className="max-w-xs truncate" title={reg.ugCollege}>
          {reg.ugCollege || "-"}
        </div>
      ),
    },
    columnVisibility.studentWorking && {
      header: "Status",
      render: (reg: MatTrainingData) => (
        <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${reg.studentWorking === "Student"
          ? "bg-blue-100 text-blue-800"
          : "bg-green-100 text-green-800"
          }`}>
          {reg.studentWorking || "-"}
        </span>
      ),
    },
    columnVisibility.paymentStatus && {
      header: "Payment",
      render: (reg: MatTrainingData) => (
        <div className="flex flex-col gap-1">
          <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${reg.paymentScreenshot
            ? "bg-green-100 text-green-800 border border-green-400"
            : "bg-yellow-100 text-yellow-800 border border-yellow-400"
            }`}>
            {reg.paymentScreenshot ? "Submitted" : "Pending"}
          </span>
          {reg.paymentScreenshot && (
            <button
              onClick={() => {
                setSelectedScreenshot(reg.paymentScreenshot || null);
                setScreenshotOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors duration-200"
              title="View Screenshot"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Screenshot</span>
            </button>
          )}
        </div>
      ),
    },
    columnVisibility.createdAt && {
      header: "Registered On",
      render: (reg: MatTrainingData) =>
        reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : "-",
    },
    {
      header: "Verification",
      render: (reg: MatTrainingData) => {
        // ❌ No screenshot → no verify option
        if (!reg.paymentScreenshot) {
          return (
            <span className="text-xs text-gray-400">No Payment</span>
          );
        }


        if (reg.paymentVerified) {
          return (
            <span className="inline-flex justify-center items-center w-[100px] py-1 text-xs rounded-lg bg-green-200 text-green-900 border border-green-500">
              Verified
            </span>
          );
        }


        return (
          <button
            onClick={() => handleVerifyClick(reg)}
            className="inline-flex justify-center items-center w-[100px] py-1 text-xs rounded-lg bg-red-200 text-red-900 border border-red-500"
          >
            Verify
          </button>
        );
      },
    },
    {
      header: "Actions",
      render: (reg: MatTrainingData) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedRegistration(reg);
              setViewOpen(true);
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {(role === "superadmin" || userpermission?.delete) && (
            <button
              onClick={() => {
                setSelectedRegistration(reg);
                setConfirmType("delete");
                setConfirmOpen(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ].filter(Boolean) as Column<MatTrainingData>[];

  const resetFilters = () => {
    setSearchTerm("");
    setCityFilter("all");
    setStudentWorkingFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const formattedRegistration = {
    "Registration ID": selectedRegistration?.regId || "-",
    "Name": selectedRegistration?.name || "-",
    "Mobile": selectedRegistration?.mobile || "-",
    "Email": selectedRegistration?.email || "-",
    "City": selectedRegistration?.city || "-",
    "UG Degree": selectedRegistration?.ugDegree || "-",
    "UG College": selectedRegistration?.ugCollege || "-",
    "Status": selectedRegistration?.studentWorking || "-",
    "Payment": selectedRegistration?.paymentScreenshot ? "Screenshot Submitted" : "Not Submitted",
    "Registered On": selectedRegistration?.createdAt
      ? new Date(selectedRegistration.createdAt).toLocaleString()
      : "-",
  };

  if (!hasPermission) {
    return (
      <div className="p-6 text-center text-red-600">
        You do not have permission to access this page. Please contact your superadmin.
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-semibold">MAT  Registrations</h1>
          </div>

          <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-sm">
            {/* Top Row - Essential Controls */}
            <div className="flex flex-wrap items-center gap-2 justify-between">
              {/* Left side - Customize & Filter buttons */}
              <div className="flex gap-2 order-1">
                <button
                  onClick={() => setCustomizeOpen(true)}
                  className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Customize Columns</span>
                </button>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm rounded-md"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
              </div>

              {/* Right side - Show entries and Export */}
              <div className="flex items-center gap-2 order-2 ml-auto">
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Show
                  </span>
                  <div className="relative">
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600 pr-8 focus:outline-none focus:ring-2 focus:ring-[#1e2a5a] cursor-pointer appearance-none"
                    >
                      {[10, 25, 50, 100, 250, 500].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-500">entries</span>
                </div>

                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className={`flex items-center gap-1 px-3 py-2 text-sm rounded-md ${exportLoading
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-700 hover:bg-green-800"
                    } text-white`}
                >
                  {exportLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Fetching...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      <span className="hidden sm:inline">Export</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Show Entries */}
            <div className="flex sm:hidden items-center gap-2">
              <span className="text-xs font-medium text-gray-500">
                Show entries:
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              >
                {[10, 25, 50, 100, 250, 500].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Row */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, mobile, email, or registration ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                />
              </div>
            </div>

            {/* Advanced Filters - Collapsible */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2 p-4 bg-gray-50 rounded-lg border">
                {/* City Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <select
                    value={cityFilter}
                    onChange={(e) => {
                      setCityFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                  >
                    <option value="all">All Cities</option>
                    {cityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Student/Working Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={studentWorkingFilter}
                    onChange={(e) => {
                      setStudentWorkingFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                  >
                    {studentWorkingOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>


                {/* Payment Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Payment
                  </label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => {
                      setPaymentFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                  >
                    {paymentOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Verification Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Verification
                  </label>
                  <select
                    value={verificationFilter}
                    onChange={(e) => {
                      setVerificationFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-md"
                  >
                    {verificationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                  />
                </div>

                {/* Reset Button */}
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="w-full px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {(searchTerm || cityFilter !== "all" || studentWorkingFilter !== "all" || startDate || endDate || paymentFilter !== "all" ||
              verificationFilter !== "all") && (
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {searchTerm && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                      Search: {searchTerm}
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setCurrentPage(1);
                        }}
                        className="hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {cityFilter !== "all" && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      City: {cityFilter}
                      <button
                        onClick={() => {
                          setCityFilter("all");
                          setCurrentPage(1);
                        }}
                        className="hover:text-green-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {paymentFilter !== "all" && (
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full flex items-center gap-1">
                      Payment: {paymentFilter}
                      <button
                        onClick={() => {
                          setPaymentFilter("all");
                          setCurrentPage(1);
                        }}
                        className="hover:text-indigo-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {verificationFilter !== "all" && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center gap-1">
                      Verification: {verificationFilter}
                      <button
                        onClick={() => {
                          setVerificationFilter("all");
                          setCurrentPage(1);
                        }}
                        className="hover:text-red-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {studentWorkingFilter !== "all" && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                      Status: {studentWorkingFilter}
                      <button
                        onClick={() => {
                          setStudentWorkingFilter("all");
                          setCurrentPage(1);
                        }}
                        className="hover:text-purple-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {(startDate || endDate) && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {startDate && `From: ${new Date(startDate).toLocaleDateString()}`}
                      {endDate && ` To: ${new Date(endDate).toLocaleDateString()}`}
                      <button
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                          setCurrentPage(1);
                        }}
                        className="hover:text-yellow-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Registrations */}
          <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-blue-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Registrations</div>
              <div className="text-2xl font-bold">{statistics.totalRegistrations}</div>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-70" />
          </div>

          {/* Total Cities */}
          <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-green-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Cities Covered</div>
              <div className="text-2xl font-bold text-green-600">{statistics.totalCities}</div>
            </div>
            <MapPin className="w-10 h-10 text-green-500 opacity-70" />
          </div>

          {/* Students */}
          <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-purple-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Students</div>
              <div className="text-2xl font-bold text-purple-600">{statistics.totalStudents}</div>
            </div>
            <GraduationCap className="w-10 h-10 text-purple-500 opacity-70" />
          </div>

          {/* Working Professionals */}
          <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-orange-500 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Working Professionals</div>
              <div className="text-2xl font-bold text-orange-600">{statistics.totalWorking}</div>
            </div>
            <Users className="w-10 h-10 text-orange-500 opacity-70" />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={registrations}
          loading={loading}
          totalEntries={totalEntries}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* View Dialog */}
        <ViewDialog
          open={viewOpen}
          title="MAT Training Registration Details"
          data={formattedRegistration}
          onClose={() => setViewOpen(false)}
        />

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={confirmOpen}
          title="Delete Registration"
          message={`Are you sure you want to delete the MAT Training registration for "${selectedRegistration?.name}"?`}
          onConfirm={confirmAction}
          onCancel={() => {
            setConfirmOpen(false);
            setSelectedRegistration(null);
            setConfirmType(null);
          }}
        />

        <ConfirmDialog
          open={verifyConfirmOpen}
          title="Verify Payment"
          message={`Are you sure you want to verify payment for "${verifyTarget?.name}"?`}
          onConfirm={confirmVerify}
          onCancel={() => {
            setVerifyConfirmOpen(false);
            setVerifyTarget(null);
          }}
        />

        {/* Export Modal */}
        <ExportModal
          open={exportOpen}
          title="MAT Training Registrations"
          data={exportData}
          onClose={() => {
            setExportOpen(false);
            setTimeout(() => {
              setExportData([]);
            }, 300);
          }}
          loading={exportLoading}
        />

        {/* Column Customize Dialog */}
        <ColumnCustomizeDialog
          open={customizeOpen}
          title="Customize Columns"
          columns={columnOptions}
          selected={columnVisibility}
          onChange={(v) => setColumnVisibility((p) => ({ ...p, ...v }))}
          onClose={() => setCustomizeOpen(false)}
        />

        {/* Payment Screenshot Modal */}


      </div>
      {screenshotOpen && selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setScreenshotOpen(false)}
        >
          <div
            className="relative bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Payment Screenshot</h3>
              <button
                onClick={() => setScreenshotOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedScreenshot}
                alt="Payment Screenshot"
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}