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
  BookOpen,

} from "lucide-react";
import { toast } from "react-toastify";
import Select from "react-select";
import ViewDialog from "@/components/ViewDialog";
import { DataTable, Column } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";

import {
  listCIICPRequest,
  deleteCIICPRequest,
  exportCIICPRequest,
  CIICPData,
  updateCIICPPaymentStatusRequest,
} from "@/app/lib/request/ciicpRequest";

interface Statistics {
  totalRegistrations: number;
  totalCourses: number;
  uniqueStudents: number;
}

export default function CIICPPage() {
  const [registrations, setRegistrations] = useState<CIICPData[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalRegistrations: 0,
    totalCourses: 0,
    uniqueStudents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState<string>("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<CIICPData | null>(null);
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  const [districtOptions, setDistrictOptions] = useState<{ value: string; label: string }[]>([]);
  const [courseOptions, setCourseOptions] = useState<{ value: string; label: string }[]>([]);
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CIICPData | null>(null);

  const batchOptions = [
    { value: "all", label: "All Batches" },
    { value: "FN", label: "Forenoon (FN)" },
    { value: "AN", label: "Afternoon (AN)" },
    { value: "Full", label: "Full Day" },
  ];

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await listCIICPRequest({ limit: 1000, page: 1 });
        const districtsSet = new Set<string>();
        const coursesSet = new Set<string>();

        res.docs?.forEach((reg: CIICPData) => {
          if (reg.district) districtsSet.add(reg.district);
          reg.courses?.forEach((course) => {
            coursesSet.add(course);
          });
        });

        setDistrictOptions(Array.from(districtsSet).map(district => ({ value: district, label: district })));
        setCourseOptions(Array.from(coursesSet).map(course => ({ value: course, label: course })));
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

      const res = await exportCIICPRequest({
        search: searchTerm,
        batch: batchFilter,
        district: districtFilter,
        startDate: startDate,
        endDate: endDate,
        course: courseFilter.join(','),
        paymentStatus: paymentStatusFilter,
        gender: genderFilter,
      });

      const exportData = res.data || [];

      const transformedData = exportData.map((reg: CIICPData) => {
        const obj: any = {};

        if (columnVisibility.registrationId) {
          obj["Registration ID"] = reg.registrationId || "-";
        }
        if (columnVisibility.name) {
          obj["Name"] = reg.name || "-";
        }
        if (columnVisibility.fatherName) {
          obj["Father Name"] = reg.fatherName || "-";
        }
        if (columnVisibility.gender) {
          obj["Gender"] = reg.gender || "-";
        }
        if (columnVisibility.dob) {
          obj["Date of Birth"] = reg.dob ? new Date(reg.dob).toLocaleDateString() : "-";
        }
        if (columnVisibility.phone) {
          obj["Phone"] = reg.phone || "-";
        }
        if (columnVisibility.aadhaar) {
          obj["Aadhaar"] = reg.aadhaar || "-";
        }
        if (columnVisibility.address) {
          obj["Address"] = reg.address || "-";
        }
        if (columnVisibility.district) {
          obj["District"] = reg.district || "-";
        }
        if (columnVisibility.qualification) {
          obj["Qualification"] = reg.qualification || "-";
        }
        if (columnVisibility.courses) {
          obj["Courses"] = reg.courses?.join(", ") || "-";
        }
        if (columnVisibility.batch) {
          obj["Batch"] = reg.batch || "-";
        }
        if (columnVisibility.paymentStatus) {
          obj["Payment Status"] = reg.paymentStatus === "paid" ? "Paid" : "Unpaid";
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
      const res = await listCIICPRequest({
        limit: limit,
        page: currentPage,
        search: searchTerm,
        batch: batchFilter,
        district: districtFilter,
        startDate: startDate,
        endDate: endDate,
        course: courseFilter.join(','),
        paymentStatus: paymentStatusFilter,
        gender: genderFilter,
      });

      setRegistrations(res.docs || []);
      setTotalPages(res.totalPages || 1);
      setTotalEntries(res.totalDocs || 0);

      // Calculate statistics
      const totalRegistrations = res.totalDocs || 0;
      const totalCourses = res.courses?.reduce((sum, c) => sum + c.count, 0) || 0;
      const uniqueStudents = res.totalDocs || 0;

      setStatistics({
        totalRegistrations,
        totalCourses,
        uniqueStudents,
      });
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
  }, [currentPage, searchTerm, limit, batchFilter, districtFilter, courseFilter, startDate, endDate, paymentStatusFilter, genderFilter]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const confirmAction = async () => {
    if (!selectedRegistration || !confirmType) return;

    try {
      if (confirmType === "delete") {
        await deleteCIICPRequest(selectedRegistration._id);
        toast.success("CIICP registration deleted successfully!");
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

  const paymentStatusOptions = [
    { value: "all", label: "All Payments" },
    { value: "paid", label: "Paid" },
    { value: "unpaid", label: "Unpaid" },
  ];

  const genderOptions = [
    { value: "all", label: "All Genders" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ];

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
            (p: any) => p.moduleName === "CIICP"
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
    registrationId: true,
    name: true,
    fatherName: true,
    gender: true,
    dob: true,
    phone: true,
    aadhaar: true,
    address: true,
    district: true,
    qualification: true,
    courses: true,
    batch: true,
    createdAt: true,
    paymentStatus: true,
  });

  const columnOptions = [
    { key: "registrationId", label: "Registration ID" },
    { key: "name", label: "Name" },
    { key: "fatherName", label: "Father Name" },
    { key: "gender", label: "Gender" },
    { key: "dob", label: "Date of Birth" },
    { key: "phone", label: "Phone" },
    { key: "aadhaar", label: "Aadhaar" },
    { key: "address", label: "Address" },
    { key: "district", label: "District" },
    { key: "qualification", label: "Qualification" },
    { key: "courses", label: "Courses" },
    { key: "batch", label: "Batch" },
    { key: "createdAt", label: "Registered On" },
    { key: "paymentStatus", label: "paymentStatus" },
  ];

  const handlePaymentConfirm = async () => {
    if (!selectedPayment) return;
    try {
      await updateCIICPPaymentStatusRequest(
        selectedPayment._id,
        "paid"
      );

      toast.success("Payment marked as PAID");
      fetchRegistrations();
    } catch (err: any) {
      toast.error("Failed to update payment");
    } finally {
      setPaymentConfirmOpen(false);
      setSelectedPayment(null);
    }
  };

  const columns: Column<CIICPData>[] = [
    columnVisibility.registrationId && {
      header: "Reg ID",
      render: (reg: CIICPData) => reg.registrationId || "-",
    },
    columnVisibility.name && {
      header: "Name",
      render: (reg: CIICPData) => reg.name || "-",
    },
    columnVisibility.fatherName && {
      header: "Father Name",
      render: (reg: CIICPData) => reg.fatherName || "-",
    },
    columnVisibility.gender && {
      header: "Gender",
      render: (reg: CIICPData) => reg.gender || "-",
    },
    columnVisibility.dob && {
      header: "DOB",
      render: (reg: CIICPData) => reg.dob ? new Date(reg.dob).toLocaleDateString() : "-",
    },
    columnVisibility.phone && {
      header: "Phone",
      render: (reg: CIICPData) => reg.phone || "-",
    },
    columnVisibility.aadhaar && {
      header: "Aadhaar",
      render: (reg: CIICPData) => reg.aadhaar ? `****${reg.aadhaar.slice(-4)}` : "-",
    },
    columnVisibility.address && {
      header: "Address",
      render: (reg: CIICPData) => (
        <div className="max-w-xs truncate" title={reg.address}>
          {reg.address || "-"}
        </div>
      ),
    },
    columnVisibility.district && {
      header: "District",
      render: (reg: CIICPData) => reg.district || "-",
    },
    columnVisibility.qualification && {
      header: "Qualification",
      render: (reg: CIICPData) => reg.qualification || "-",
    },
    columnVisibility.courses && {
      header: "Courses",
      render: (reg: CIICPData) => (
        <div className="max-w-xs">
          {reg.courses?.map((course, idx) => (
            <span
              key={idx}
              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1"
            >
              {course}
            </span>
          ))}
        </div>
      ),
    },
    columnVisibility.batch && {
      header: "Batch",
      render: (reg: CIICPData) => {
        const batchMap: Record<string, string> = {
          FN: "Forenoon",
          AN: "Afternoon",
          Full: "Full Day"
        };
        return (
          <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${reg.batch === "FN" ? "bg-blue-100 text-blue-800" :
            reg.batch === "AN" ? "bg-green-100 text-green-800" :
              "bg-purple-100 text-purple-800"
            }`}>
            {batchMap[reg.batch] || reg.batch}
          </span>
        );
      },
    },
    columnVisibility.createdAt && {
      header: "Registered On",
      render: (reg: CIICPData) =>
        reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : "-",
    },
    columnVisibility.paymentStatus && {
      header: "Payment Status",
      render: (reg: CIICPData) => (
        <span
          onClick={() => {
            if (reg.paymentStatus === "unpaid") {
              setSelectedPayment(reg);
              setPaymentConfirmOpen(true);
            }
          }}
          className={`inline-block w-[90px] text-center px-2 py-1 rounded-lg text-xs font-medium cursor-pointer ${reg.paymentStatus === "paid"
            ? "bg-green-100 border border-green-400 text-green-800"
            : "bg-red-100 text-red-800 border border-red-400 hover:bg-red-200"
            }`}
        >
          {reg.paymentStatus || "unpaid"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (reg: CIICPData) => (
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
  ].filter(Boolean) as Column<CIICPData>[];

  const resetFilters = () => {
    setSearchTerm("");
    setBatchFilter("all");
    setDistrictFilter("all");
    setCourseFilter([]);
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const formattedRegistration = {
    "Registration ID": selectedRegistration?.registrationId || "-",
    "Name": selectedRegistration?.name || "-",
    "Father Name": selectedRegistration?.fatherName || "-",
    "Gender": selectedRegistration?.gender || "-",
    "Date of Birth": selectedRegistration?.dob
      ? new Date(selectedRegistration.dob).toLocaleDateString()
      : "-",
    "Phone": selectedRegistration?.phone || "-",
    "Aadhaar": selectedRegistration?.aadhaar || "-",
    "Address": selectedRegistration?.address || "-",
    "District": selectedRegistration?.district || "-",
    "Qualification": selectedRegistration?.qualification || "-",
    "Courses": selectedRegistration?.courses?.join(", ") || "-",
    "Batch": selectedRegistration?.batch || "-",
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold">CIICP Registrations</h1>
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
                placeholder="Search by name, father name, phone, aadhaar, or registration ID..."
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
              {/* Batch Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Batch
                </label>
                <select
                  value={batchFilter}
                  onChange={(e) => {
                    setBatchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                >
                  {batchOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* District Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  District
                </label>
                <select
                  value={districtFilter}
                  onChange={(e) => {
                    setDistrictFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                >
                  <option value="all">All Districts</option>
                  {districtOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Multi-Course Filter */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Courses (Multi-select)
                </label>
                <Select
                  isMulti
                  options={courseOptions}
                  value={courseOptions.filter(option => courseFilter.includes(option.value))}
                  onChange={(selected) => {
                    setCourseFilter(selected.map(s => s.value));
                    setCurrentPage(1);
                  }}
                  placeholder="Select courses..."
                  className="text-sm"
                  classNamePrefix="react-select"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                >
                  {paymentStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Gender Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => {
                    setGenderFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                >
                  {genderOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
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
          {(searchTerm || batchFilter !== "all" || districtFilter !== "all" || courseFilter.length > 0 || startDate || endDate || paymentStatusFilter !== "all" || genderFilter !== "all") && (
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
              {batchFilter !== "all" && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Batch: {batchFilter}
                  <button
                    onClick={() => {
                      setBatchFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-purple-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {paymentStatusFilter !== "all" && (
                <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Payment: {paymentStatusFilter === "paid" ? "Paid" : "Unpaid"}
                  <button
                    onClick={() => {
                      setPaymentStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-pink-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {genderFilter !== "all" && (
                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Gender: {genderFilter}
                  <button
                    onClick={() => {
                      setGenderFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {districtFilter !== "all" && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                  District: {districtFilter}
                  <button
                    onClick={() => {
                      setDistrictFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {courseFilter.length > 0 && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Courses: {courseFilter.join(", ")}
                  <button
                    onClick={() => {
                      setCourseFilter([]);
                      setCurrentPage(1);
                    }}
                    className="hover:text-orange-900"
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Registrations */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-blue-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Total Registrations</div>
            <div className="text-2xl font-bold">{statistics.totalRegistrations}</div>
          </div>
          <Users className="w-10 h-10 text-blue-500 opacity-70" />
        </div>

        {/* Total Course Enrollments */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-green-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Total Course Enrollments</div>
            <div className="text-2xl font-bold text-green-600">{statistics.totalCourses}</div>
          </div>
          <BookOpen className="w-10 h-10 text-green-500 opacity-70" />
        </div>

        {/* Unique Students */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-purple-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Unique Students</div>
            <div className="text-2xl font-bold text-purple-600">{statistics.uniqueStudents}</div>
          </div>
          <GraduationCap className="w-10 h-10 text-purple-500 opacity-70" />
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
        title="CIICP Registration Details"
        data={formattedRegistration}
        onClose={() => setViewOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Registration"
        message={`Are you sure you want to delete the CIICP registration for "${selectedRegistration?.name}"?`}
        onConfirm={confirmAction}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedRegistration(null);
          setConfirmType(null);
        }}
      />

      <ConfirmDialog
        open={paymentConfirmOpen}
        title="Confirm Payment"
        message={`Are you sure you want to mark "${selectedPayment?.name}" as PAID?`}
        onConfirm={handlePaymentConfirm}
        onCancel={() => {
          setPaymentConfirmOpen(false);
          setSelectedPayment(null);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        title="CIICP Registrations"
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
    </div>
  );
}