"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Eye,
  FileDown,
  Settings,
  Search,
  TentTree,
  X,
  Users, CheckCircle, XCircle, DollarSign,
  Loader2,
  Trash2,
  Filter,
  Calendar,
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
  listSummerCampRequest,
  deleteSummerCampRequest,
  updatePaymentStatusRequest,
  exportSummerCampRequest,
  SummerCamp,
} from "@/app/lib/request/summercampRequest";

interface Statistics {
  totalRegistrations: number;
  totalPaid: number;
  totalUnpaid: number;
  totalRevenue: number;
}

export default function SummerCampPage() {
  const [camps, setCamps] = useState<SummerCamp[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalRegistrations: 0,
    totalPaid: 0,
    totalUnpaid: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState<string>("");
  const [registrarFilter, setRegistrarFilter] = useState("all");
  // Filter states
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [selectedPaymentCamp, setSelectedPaymentCamp] = useState<SummerCamp | null>(null);
  const [selectedCamp, setSelectedCamp] = useState<SummerCamp | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);

  const [confirmType, setConfirmType] = useState<"delete" | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  const [exportData, setExportData] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [limit, setLimit] = useState(10);

  // Get unique sports for filter dropdown - fetch all sports from all camps
  const [allSportOptions, setAllSportOptions] = useState<{ value: string; label: string }[]>([]);

  const registrarOptions = [
    { value: "all", label: "All Registrars" },
    { value: "Sona Student / Faculty", label: "Sona Student / Faculty" },
    { value: "Outsider", label: "Outsider" },
  ];


  const formattedCamp = {
    "Registration ID": selectedCamp?.regId || "-",
    "Name": selectedCamp?.name || "-",
    "Mobile Number": selectedCamp?.mobile_no || "-",
    "Email": selectedCamp?.email_id || "-",
    "Gender": selectedCamp?.gender || "-",

    "Date of Birth": selectedCamp?.dob
      ? new Date(selectedCamp.dob).toLocaleDateString()
      : "-",

    "Age": selectedCamp?.age ?? "-",
    "Payment Status": selectedCamp?.paymentStatus || "-",

    "Address": [
      selectedCamp?.street_address,
      selectedCamp?.city,
      selectedCamp?.state_province,
      selectedCamp?.zip_postal,
    ]
      .filter(Boolean)
      .join(", ") || "-",

    "Allergies": selectedCamp?.allergies || "No",
    "Allergy Details": selectedCamp?.allergyDetails || "-",

    "Medical Conditions": selectedCamp?.medicalConditions || "No",
    "Medical Details": selectedCamp?.medicalConditionsDetails || "-",

    "Currently Taking Medicine":
      selectedCamp?.medicalsCurrentlyTaking || "No",

    "Sports Selected": selectedCamp?.sports || "-",

    // 🔥 THIS IS WHAT YOU WANT
    "Sports Details": selectedCamp?.sportsData?.length
      ? selectedCamp.sportsData
        .map(
          (sport: any, i: number) =>
            `${i + 1}. ${sport.sport_name} (${sport.skill_level}) - ${sport.duration}, ${sport.timing}, ₹${sport.price}`
        )
        .join("\n")
      : "-",

    "Total Amount":
      selectedCamp?.totalAmt !== undefined
        ? `₹${selectedCamp.totalAmt}`
        : "-",

    "Registrar": selectedCamp?.registrar || "-",

    "Created Date": selectedCamp?.createdAt
      ? new Date(selectedCamp.createdAt).toLocaleString()
      : "-",
  };

  useEffect(() => {
    const fetchAllSports = async () => {
      try {
        const res = await listSummerCampRequest({ limit: 1000, page: 1 });
        const sportsSet = new Set<string>();
        res.docs?.forEach((camp: SummerCamp) => {
          camp.sportsData?.forEach((sport) => {
            sportsSet.add(sport.sport_name);
          });
        });
        setAllSportOptions(Array.from(sportsSet).map(sport => ({ value: sport, label: sport })));
      } catch (error) {
        console.error("Failed to fetch sports options", error);
      }
    };
    fetchAllSports();
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

      const res = await exportSummerCampRequest({
        search: searchTerm,
        sport: selectedSports.join(","),
        startDate: startDate,
        endDate: endDate,
        paymentStatus: paymentStatusFilter,
        registrar: registrarFilter,
      });

      const exportData = res.data || []; // 👈 முக்கியம்

      const transformedData = exportData.map((camp: SummerCamp) => {
        const obj: any = {};

        if (columnVisibility.regId) {
          obj["Registration ID"] = camp.regId || "-";
        }
        if (columnVisibility.regno) {
          obj["Reg No"] = camp.regno || "-";
        }
        if (columnVisibility.name) {
          obj["Name"] = camp.name || "-";
        }
        if (columnVisibility.mobile) {
          obj["Mobile"] = camp.mobile_no || "-";
        }
        if (columnVisibility.email) {
          obj["Email"] = camp.email_id || "-";
        }
        if (columnVisibility.sports) {
          obj["Sports"] = camp.sports || "-";
        }
        if (columnVisibility.totalAmount) {
          obj["Total Amount"] = camp.totalAmt || "-";
        }
        if (columnVisibility.paymentStatus) {
          obj["Payment Status"] = camp.paymentStatus || "-";
        }
        if (columnVisibility.registrar) {
          obj["Registrar"] = camp.registrar || "-";
        }
        if (columnVisibility.createdAt) {
          obj["Registered On"] = camp.createdAt
            ? new Date(camp.createdAt).toLocaleDateString()
            : "-";
        }

        return obj;
      });

      setExportData(transformedData);
      setExportOpen(true);

    } catch (error: any) {
      toast.error("Failed to export camps: " + (error.message || "Unknown error"));
      console.error("Error exporting camps:", error);
    } finally {
      setExportLoading(false);
    }
  };

  const fetchCamps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listSummerCampRequest({
        limit: limit,
        page: currentPage,
        search: searchTerm,
        sport: selectedSports.join(','),
        startDate: startDate,
        endDate: endDate,
        paymentStatus: paymentStatusFilter,
        registrar: registrarFilter,
      });

      setCamps(res.docs || []);
      setTotalPages(res.totalPages || 1);
      setTotalEntries(res.totalDocs || 0);

      if (res.statistics) {
        setStatistics(res.statistics);
      }
    } catch (err: any) {
      // Access the backend error message directly
      const errorMessage = err.response?.data?.message || "Something went wrong";

      if (err.response?.status === 403) {
        toast.error(`${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }

      console.error("Failed to fetch camps:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, limit, registrarFilter, selectedSports, startDate, endDate, paymentStatusFilter]);
  useEffect(() => {
    fetchCamps();
  }, [fetchCamps]);

  const confirmAction = async () => {
    if (!selectedCamp || !confirmType) return;

    try {
      if (confirmType === "delete") {
        await deleteSummerCampRequest(selectedCamp._id);
        toast.success("Summer camp registration deleted successfully!");
      }

      await fetchCamps();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setConfirmOpen(false);
      setSelectedCamp(null);
      setConfirmType(null);
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
            (p: any) => p.moduleName === "Summer Camp"
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

  const handlePaymentConfirm = async () => {
    if (!selectedPaymentCamp) return;
    try {
      await updatePaymentStatusRequest(
        selectedPaymentCamp._id,
        "paid"
      );

      toast.success("Payment marked as PAID");
      fetchCamps();
    } catch (err: any) {
      toast.error("Failed to update payment");
    } finally {
      setPaymentConfirmOpen(false);
      setSelectedPaymentCamp(null);
    }
  };

  const [columnVisibility, setColumnVisibility] = useState({
    regId: true,
    regno: true,
    name: true,
    mobile: true,
    email: true,
    sports: true,
    totalAmount: true,
    paymentStatus: true,
    registrar: true,
    createdAt: true,
  });

  const columnOptions = [
    { key: "regId", label: "Registration ID" },
    { key: "regno", label: "Reg No" },
    { key: "name", label: "Name" },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "sports", label: "Sports" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "paymentStatus", label: "Payment Status" },
    { key: "registrar", label: "Registrar" },
    { key: "createdAt", label: "Registered On" },
  ];

  const columns: Column<SummerCamp>[] = [
    columnVisibility.regId && {
      header: "Reg ID",
      render: (camp: SummerCamp) => camp.regId || "-",
    },
    columnVisibility.regno && {
      header: "Reg No",
      render: (camp: SummerCamp) => camp.regno || "-",
    },
    columnVisibility.name && {
      header: "Name",
      render: (camp: SummerCamp) => camp.name || "-",
    },
    columnVisibility.mobile && {
      header: "Mobile",
      render: (camp: SummerCamp) => camp.mobile_no || "-",
    },
    columnVisibility.email && {
      header: "Email",
      render: (camp: SummerCamp) => camp.email_id || "-",
    },
    columnVisibility.sports && {
      header: "Sports",
      render: (camp: SummerCamp) => (
        <div className="max-w-xs">
          {camp.sportsData?.map((sport, idx) => (
            <span
              key={idx}
              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1"
            >
              {sport.sport_name}
            </span>
          ))}
        </div>
      ),
    },
    columnVisibility.totalAmount && {
      header: "Total Amount",
      render: (camp: SummerCamp) => (
        <span className="font-semibold">₹{camp.totalAmt || 0}</span>
      ),
    },
    columnVisibility.paymentStatus && {
      header: "Payment Status",
      render: (camp: SummerCamp) => (
        <span
          onClick={() => {
            if (camp.paymentStatus === "unpaid") {
              setSelectedPaymentCamp(camp);
              setPaymentConfirmOpen(true);
            }
          }}
          className={`inline-block w-[90px] text-center px-2 py-1 rounded-lg text-xs font-medium cursor-pointer ${camp.paymentStatus === "paid"
            ? "bg-green-100 border border-green-400 text-green-800"
            : "bg-red-100 text-red-800 border border-red-400 hover:bg-red-200"
            }`}
        >
          {camp.paymentStatus || "unpaid"}
        </span>
      ),
    },
    columnVisibility.registrar && {
      header: "Registrar",
      render: (camp: SummerCamp) => camp.registrar || "-",
    },
    columnVisibility.createdAt && {
      header: "Registered On",
      render: (camp: SummerCamp) =>
        camp.createdAt ? new Date(camp.createdAt).toLocaleDateString() : "-",
    },
    {
      header: "Actions",
      render: (camp: SummerCamp) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedCamp(camp);
              setViewOpen(true);
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>



          {role === "superadmin" && (
            <button
              onClick={() => {
                setSelectedCamp(camp);
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
  ].filter(Boolean) as Column<SummerCamp>[];

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSports([]);
    setStartDate("");
    setEndDate("");
    setRegistrarFilter("all");
    setPaymentStatusFilter("all");
    setCurrentPage(1);
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
          <TentTree className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold">Summer Camp Registrations</h1>
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
                placeholder="Search by name, registration number, registration ID, or mobile number..."
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
              {/* Multi-Sport Filter */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sports (Multi-select)
                </label>
                <Select
                  isMulti
                  options={allSportOptions}
                  value={allSportOptions.filter(option => selectedSports.includes(option.value))}
                  onChange={(selected) => {
                    setSelectedSports(selected.map(s => s.value));
                    setCurrentPage(1);
                  }}
                  placeholder="Select sports..."
                  className="text-sm"
                  classNamePrefix="react-select"
                />
              </div>

              {/* Payment Status Filter */}
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
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registrar Type</label>
                <select
                  value={registrarFilter}
                  onChange={(e) => {
                    setRegistrarFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                >
                  {registrarOptions.map(option => (
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
          {(searchTerm || selectedSports.length > 0 || startDate || endDate || paymentStatusFilter !== "all") && (
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
              {selectedSports.length > 0 && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Sports: {selectedSports.join(", ")}
                  <button
                    onClick={() => {
                      setSelectedSports([]);
                      setCurrentPage(1);
                    }}
                    className="hover:text-purple-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {paymentStatusFilter !== "all" && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Payment: {paymentStatusFilter}
                  <button
                    onClick={() => {
                      setPaymentStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-yellow-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(startDate || endDate) && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {startDate && `From: ${new Date(startDate).toLocaleDateString()}`}
                  {endDate && ` To: ${new Date(endDate).toLocaleDateString()}`}
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setCurrentPage(1);
                    }}
                    className="hover:text-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary - Backend calculated */}


      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-blue-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Total Registrations</div>
            <div className="text-2xl font-bold">{statistics.totalRegistrations}</div>
          </div>
          <Users className="w-10 h-10 text-blue-500 opacity-70" />
        </div>

        {/* Paid */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-green-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Paid</div>
            <div className="text-2xl font-bold text-green-600">{statistics.totalPaid}</div>
          </div>
          <CheckCircle className="w-10 h-10 text-green-500 opacity-70" />
        </div>

        {/* Unpaid */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-red-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Unpaid</div>
            <div className="text-2xl font-bold text-red-600">{statistics.totalUnpaid}</div>
          </div>
          <XCircle className="w-10 h-10 text-red-500 opacity-70" />
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-amber-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Total Revenue</div>
            <div className="text-2xl font-bold text-amber-600">₹{statistics.totalRevenue.toLocaleString()}</div>
          </div>
          <DollarSign className="w-10 h-10 text-amber-500 opacity-70" />
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={camps}
        loading={loading}
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* View Dialog */}
      <ViewDialog
        open={viewOpen}
        title="Summer Camp Registration Details"
        data={formattedCamp}
        onClose={() => setViewOpen(false)}
      />



      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Registration"
        message={`Are you sure you want to delete the summer camp registration for "${selectedCamp?.name}"?`}
        onConfirm={confirmAction}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedCamp(null);
          setConfirmType(null);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        title="Summer Camp Registrations"
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

      <ConfirmDialog
        open={paymentConfirmOpen}
        title="Confirm Payment"
        message={`Are you sure you want to mark "${selectedPaymentCamp?.name}" as PAID?`}
        onConfirm={handlePaymentConfirm}
        onCancel={() => {
          setPaymentConfirmOpen(false);
          setSelectedPaymentCamp(null);
        }}
      />
    </div>

  );
}