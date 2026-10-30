"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  FileDown,
  FileUp,
  Plus,
  Settings,
  Search,
  Trophy,
  X,
  Users,
  UserCheck,
  UserX,
  Loader2,
  Trash2,
  Filter,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";
import Select from "react-select"; // ✅ ADDED
import ViewDialog from "@/components/ViewDialog";
import { DataTable, Column } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import SonaChampsBulkUploadModal from "@/components/SonaChampsBulkUploadModal";
import SonaChampsFormModal from "@/components/SonaChampsFormModal";

import {
  listSonaChamps,
  deleteSonaChamps,
  updateAttendance,
  exportSonaChamps,
  SonaChamps,
  SonaChampsStats,
} from "@/app/lib/request/sonachamprequest";

/* =========================
   Options for Filters
========================= */
const CLASS_OPTIONS = [
  { value: "", label: "All Classes" },
  { value: "VI", label: "VI" },
  { value: "VII", label: "VII" },
  { value: "VIII", label: "VIII" },
  { value: "IX", label: "IX" },
  { value: "X", label: "X" },
  { value: "XI", label: "XI" },
  { value: "XII", label: "XII" },
];

const EVENT_OPTIONS = [
  { value: "", label: "All Events" },
  { value: "Group Dance", label: "Group Dance" },
  { value: "Solo Dance", label: "Solo Dance" },
  { value: "Singing", label: "Singing" },
  { value: "Spell Bee", label: "Spell Bee" },
  { value: "Face Painting", label: "Face Painting" },
  { value: "Drawing / Painting", label: "Drawing / Painting" },
  { value: "Gaming", label: "Gaming" },
  { value: "Science Expo", label: "Science Expo" },
  { value: "Puzzle Quest", label: "Puzzle Quest" },
  { value: "Veg / Fruit Cravings", label: "Veg / Fruit Cravings" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "Junior", label: "Junior (VI - VIII)" },
  { value: "Senior", label: "Senior (IX - XII)" },
];

/* =========================
   Page
========================= */
export default function SonaChampsPage() {
  const [champs, setChamps] = useState<SonaChamps[]>([]);
  const [statistics, setStatistics] = useState<SonaChampsStats>({
    totalRegistrations: 0,
    totalPresent: 0,
    totalAbsent: 0,
  });

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState<string>("");

  // Filters
  const [eventFilter, setEventFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [presentFilter, setPresentFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dialogs
  const [selectedChamp, setSelectedChamp] = useState<SonaChamps | null>(null);
  const [selectedAttendanceChamp, setSelectedAttendanceChamp] =
    useState<SonaChamps | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | null>(null);
  const [attendanceConfirmOpen, setAttendanceConfirmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Permissions
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);

  // Export
  const [exportData, setExportData] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  /* =========================
     View Data
  ========================= */
  const formattedChamp = {
    "Registration ID": selectedChamp?.regId || "-",
    "Student Name": selectedChamp?.studentName || "-",
    Class: selectedChamp?.class || "-",
    Gender: selectedChamp?.gender || "-",
    "School Name": selectedChamp?.schoolName || "-",
    "School Location": selectedChamp?.schoolLocation || "-",
    "Teacher Coordinator": selectedChamp?.teacherCoordinatorName || "-",
    "Teacher Mobile": selectedChamp?.teacherCoordinatorMobile || "-",
    "Parent / Guardian": selectedChamp?.parentGuardianName || "-",
    "Parent Mobile": selectedChamp?.parentGuardianMobile || "-",
    Category: selectedChamp?.category || "-",
    Event: selectedChamp?.event || "-",
    Attendance: selectedChamp?.present ? "Present ✅" : "Absent ❌",
    "Marked At": selectedChamp?.presentAt
      ? new Date(selectedChamp.presentAt).toLocaleString()
      : "-",
    "Marked By": selectedChamp?.markedBy || "-",
    "Registered On": selectedChamp?.createdAt
      ? new Date(selectedChamp.createdAt).toLocaleString()
      : "-",
  };

  /* =========================
     Role
  ========================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload: any = JSON.parse(atob(token.split(".")[1]));
      setRole(payload.role);
    } catch (e) {
      console.error("Failed to decode token", e);
    }
  }, []);

  /* =========================
     Permissions
  ========================= */
  useEffect(() => {
    const fetchPermissions = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setHasPermission(false);
        return;
      }
      try {
        const payload = token.split(".")[1];
        const decoded: any = JSON.parse(atob(payload));

        if (
          (decoded.role === "admin" || decoded.role === "user") &&
          decoded.instituteId &&
          decoded.id
        ) {
          const data = await getaccesscontrol({
            userId: decoded.id,
            instituteId: decoded.instituteId,
          });
          const permissions = data.permissions?.find(
            (p: any) => p.moduleName === "Sona Champs"
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

  /* =========================
     Fetch List
  ========================= */
  const fetchChamps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listSonaChamps({
        limit,
        page: currentPage,
        search: searchTerm,
        event: eventFilter,
        category: categoryFilter,
        gender: genderFilter,
        present: presentFilter === "all" ? undefined : (presentFilter as any),
        startDate,
        endDate,
      });

      setChamps(res.docs || []);
      setTotalPages(res.totalPages || 1);
      setTotalEntries(res.totalDocs || 0);
      if (res.statistics) setStatistics(res.statistics);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "Something went wrong";
      if (err.response?.status === 403) {
        toast.error(`${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }
      console.error("Failed to fetch registrations:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchTerm,
    limit,
    eventFilter,
    categoryFilter,
    genderFilter,
    presentFilter,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchChamps();
  }, [fetchChamps]);

  /* =========================
     Delete
  ========================= */
  const confirmAction = async () => {
    if (!selectedChamp || !confirmType) return;
    try {
      if (confirmType === "delete") {
        await deleteSonaChamps(selectedChamp._id);
        toast.success("Registration deleted successfully!");
      }
      await fetchChamps();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setConfirmOpen(false);
      setSelectedChamp(null);
      setConfirmType(null);
    }
  };

  /* =========================
     Attendance
  ========================= */
  const handleAttendanceConfirm = async () => {
    if (!selectedAttendanceChamp) return;
    try {
      const newPresent = !selectedAttendanceChamp.present;
      await updateAttendance(selectedAttendanceChamp._id, {
        present: newPresent,
      });
      toast.success(
        newPresent ? "Marked as PRESENT ✅" : "Marked as ABSENT ❌"
      );
      fetchChamps();
    } catch (err: any) {
      toast.error("Failed to update attendance");
    } finally {
      setAttendanceConfirmOpen(false);
      setSelectedAttendanceChamp(null);
    }
  };

  /* =========================
     Export
  ========================= */
  const handleExport = async () => {
    try {
      setExportLoading(true);

      const res = await exportSonaChamps({
        search: searchTerm,
        event: eventFilter,
        category: categoryFilter,
        gender: genderFilter,
        present: presentFilter === "all" ? undefined : (presentFilter as any),
        startDate,
        endDate,
      });

      const exportDocs = res.data || [];

      const transformedData = exportDocs.map((c: SonaChamps) => {
        const obj: any = {};
        if (columnVisibility.regId) obj["Registration ID"] = c.regId || "-";
        if (columnVisibility.studentName)
          obj["Student Name"] = c.studentName || "-";
        if (columnVisibility.class) obj["Class"] = c.class || "-";
        if (columnVisibility.gender) obj["Gender"] = c.gender || "-";
        if (columnVisibility.schoolName) obj["School"] = c.schoolName || "-";
        if (columnVisibility.schoolLocation)
          obj["Location"] = c.schoolLocation || "-";
        if (columnVisibility.teacherName)
          obj["Teacher"] = c.teacherCoordinatorName || "-";
        if (columnVisibility.teacherMobile)
          obj["Teacher Mobile"] = c.teacherCoordinatorMobile || "-";
        if (columnVisibility.parentName)
          obj["Parent"] = c.parentGuardianName || "-";
        if (columnVisibility.parentMobile)
          obj["Parent Mobile"] = c.parentGuardianMobile || "-";
        if (columnVisibility.category) obj["Category"] = c.category || "-";
        if (columnVisibility.event) obj["Event"] = c.event || "-";
        if (columnVisibility.present)
          obj["Attendance"] = c.present ? "Present" : "Absent";
        if (columnVisibility.createdAt)
          obj["Registered On"] = c.createdAt
            ? new Date(c.createdAt).toLocaleDateString()
            : "-";
        return obj;
      });

      setExportData(transformedData);
      setExportOpen(true);
    } catch (error: any) {
      toast.error(
        "Failed to export registrations: " +
          (error.message || "Unknown error")
      );
      console.error("Export error:", error);
    } finally {
      setExportLoading(false);
    }
  };

  /* =========================
     Column Visibility
  ========================= */
  const [columnVisibility, setColumnVisibility] = useState({
    regId: true,
    studentName: true,
    class: true,
    gender: true,
    schoolName: true,
    schoolLocation: true,
    teacherName: true,
    teacherMobile: true,
    parentName: true,
    parentMobile: true,
    category: true,
    event: true,
    present: true,
    createdAt: true,
  });

  const columnOptions = [
    { key: "regId", label: "Registration ID" },
    { key: "studentName", label: "Student Name" },
    { key: "class", label: "Class" },
    { key: "gender", label: "Gender" },
    { key: "schoolName", label: "School" },
    { key: "schoolLocation", label: "Location" },
    { key: "teacherName", label: "Teacher" },
    { key: "teacherMobile", label: "Teacher Mobile" },
    { key: "parentName", label: "Parent" },
    { key: "parentMobile", label: "Parent Mobile" },
    { key: "category", label: "Category" },
    { key: "event", label: "Event" },
    { key: "present", label: "Attendance" },
    { key: "createdAt", label: "Registered On" },
  ];

  /* =========================
     Columns
  ========================= */
  const columns: Column<SonaChamps>[] = [
    columnVisibility.regId && {
      header: "Reg ID",
      render: (c: SonaChamps) => (
        <span className="font-mono text-xs">{c.regId || "-"}</span>
      ),
    },
    columnVisibility.studentName && {
      header: "Student",
      render: (c: SonaChamps) => (
        <div className="max-w-[160px]">
          <div className="truncate font-medium">{c.studentName || "-"}</div>
          {columnVisibility.class && (
            <div className="text-xs text-gray-500">{c.class || ""}</div>
          )}
        </div>
      ),
    },
    columnVisibility.gender && {
      header: "Gender",
      render: (c: SonaChamps) => c.gender || "-",
    },
    columnVisibility.schoolName && {
      header: "School",
      render: (c: SonaChamps) => (
        <div className="max-w-[180px]">
          <div className="truncate">{c.schoolName || "-"}</div>
          {columnVisibility.schoolLocation && c.schoolLocation && (
            <div className="text-xs text-gray-500 truncate">
              {c.schoolLocation}
            </div>
          )}
        </div>
      ),
    },
    columnVisibility.teacherName && {
      header: "Teacher",
      render: (c: SonaChamps) => (
        <div className="max-w-[160px]">
          <div className="truncate text-sm">
            {c.teacherCoordinatorName || "-"}
          </div>
          {columnVisibility.teacherMobile && (
            <div className="text-xs text-gray-500">
              {c.teacherCoordinatorMobile || ""}
            </div>
          )}
        </div>
      ),
    },
    columnVisibility.parentName && {
      header: "Parent",
      render: (c: SonaChamps) => (
        <div className="max-w-[160px]">
          <div className="truncate text-sm">{c.parentGuardianName || "-"}</div>
          {columnVisibility.parentMobile && (
            <div className="text-xs text-gray-500">
              {c.parentGuardianMobile || ""}
            </div>
          )}
        </div>
      ),
    },
    columnVisibility.category && {
      header: "Category",
      render: (c: SonaChamps) => (
        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
          {c.category || "-"}
        </span>
      ),
    },
    columnVisibility.event && {
      header: "Event",
      render: (c: SonaChamps) => (
        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
          {c.event || "-"}
        </span>
      ),
    },
    columnVisibility.present && {
      header: "Attendance",
      render: (c: SonaChamps) => (
        <span
          onClick={() => {
            setSelectedAttendanceChamp(c);
            setAttendanceConfirmOpen(true);
          }}
          className={`inline-block w-[90px] text-center px-2 py-1 rounded-lg text-xs font-medium cursor-pointer ${
            c.present
              ? "bg-green-100 border border-green-400 text-green-800"
              : "bg-red-100 text-red-800 border border-red-400 hover:bg-red-200"
          }`}
        >
          {c.present ? "Present" : "Absent"}
        </span>
      ),
    },
    columnVisibility.createdAt && {
      header: "Registered On",
      render: (c: SonaChamps) =>
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-",
    },
    {
      header: "Actions",
      render: (c: SonaChamps) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedChamp(c);
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
                setSelectedChamp(c);
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
  ].filter(Boolean) as Column<SonaChamps>[];

  /* =========================
     Reset
  ========================= */
  const resetFilters = () => {
    setSearchTerm("");
    setEventFilter("");
    setCategoryFilter("all");
    setGenderFilter("all");
    setPresentFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  /* =========================
     Access denied
  ========================= */
  if (!hasPermission) {
    return (
      <div className="p-6 text-center text-red-600">
        You do not have permission to access this page. Please contact your
        superadmin.
      </div>
    );
  }

  /* =========================
     Render
  ========================= */
  return (
    <div className="p-6 space-y-6">
      {/* ============= Header ============= */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-600" />
          <h1 className="text-2xl font-semibold">
            SONA CHAMPS '26 Registrations
          </h1>
        </div>

        <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-sm">
          {/* Top controls */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            {/* Left: customize + filters + create */}
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

            {/* Right: create + bulk upload + show + export */}
            <div className="flex items-center gap-2 order-2 ml-auto flex-wrap">
              {/* ✅ Create (single registration) */}
              {(role === "superadmin" || userpermission?.create) && (
                <button
                  onClick={() => setFormOpen(true)}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-md"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Register</span>
                </button>
              )}

              {/* ✅ Bulk upload */}
              {(role === "superadmin" || userpermission?.create) && (
                <button
                  onClick={() => setBulkUploadOpen(true)}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-sm rounded-md"
                >
                  <FileUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Bulk Upload</span>
                </button>
              )}

              {/* Show entries */}
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
                <span className="text-xs font-medium text-gray-500">
                  entries
                </span>
              </div>

              {/* Export */}
              {(role === "superadmin" || userpermission?.filter) && (
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className={`flex items-center gap-1 px-3 py-2 text-sm rounded-md ${
                    exportLoading
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
              )}
            </div>
          </div>

          {/* Mobile show entries */}
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

          {/* Search */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name, reg ID, teacher/parent mobile, school..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-2 p-4 bg-gray-50 rounded-lg border">
              {/* ✅ Event Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Event
                </label>
                <Select
                  options={EVENT_OPTIONS}
                  value={EVENT_OPTIONS.find((o) => o.value === eventFilter) || EVENT_OPTIONS[0]}
                  onChange={(val) => {
                    setEventFilter(val?.value || "");
                    setCurrentPage(1);
                  }}
                  placeholder="All Events"
                  className="text-sm"
                  classNamePrefix="react-select"
                  isSearchable
                />
              </div>

              {/* ✅ Category Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <Select
                  options={CATEGORY_OPTIONS}
                  value={CATEGORY_OPTIONS.find((o) => o.value === categoryFilter) || CATEGORY_OPTIONS[0]}
                  onChange={(val) => {
                    setCategoryFilter(val?.value || "all");
                    setCurrentPage(1);
                  }}
                  placeholder="All Categories"
                  className="text-sm"
                  classNamePrefix="react-select"
                  isSearchable={false}
                />
              </div>

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
                  <option value="all">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Attendance
                </label>
                <select
                  value={presentFilter}
                  onChange={(e) => {
                    setPresentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                >
                  <option value="all">All</option>
                  <option value="true">Present</option>
                  <option value="false">Absent</option>
                </select>
              </div>

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

          {/* Active filters chips */}
          {(searchTerm ||
            eventFilter ||
            categoryFilter !== "all" ||
            genderFilter !== "all" ||
            presentFilter !== "all" ||
            startDate ||
            endDate) && (
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
              {eventFilter && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Event: {eventFilter}
                  <button
                    onClick={() => {
                      setEventFilter("");
                      setCurrentPage(1);
                    }}
                    className="hover:text-purple-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {categoryFilter !== "all" && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Category: {categoryFilter}
                  <button
                    onClick={() => {
                      setCategoryFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-yellow-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {genderFilter !== "all" && (
                <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Gender: {genderFilter}
                  <button
                    onClick={() => {
                      setGenderFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-pink-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {presentFilter !== "all" && (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Attendance: {presentFilter === "true" ? "Present" : "Absent"}
                  <button
                    onClick={() => {
                      setPresentFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-emerald-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(startDate || endDate) && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {startDate &&
                    `From: ${new Date(startDate).toLocaleDateString()}`}
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

      {/* ============= Stats ============= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-blue-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Total Registrations</div>
            <div className="text-2xl font-bold">
              {statistics.totalRegistrations}
            </div>
          </div>
          <Users className="w-10 h-10 text-blue-500 opacity-70" />
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-green-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Present</div>
            <div className="text-2xl font-bold text-green-600">
              {statistics.totalPresent}
            </div>
          </div>
          <UserCheck className="w-10 h-10 text-green-500 opacity-70" />
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-red-500 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Absent</div>
            <div className="text-2xl font-bold text-red-600">
              {statistics.totalAbsent}
            </div>
          </div>
          <UserX className="w-10 h-10 text-red-500 opacity-70" />
        </div>
      </div>

      {/* ============= Data table ============= */}
      <DataTable
        columns={columns}
        data={champs}
        loading={loading}
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* View dialog */}
      <ViewDialog
        open={viewOpen}
        title="SONA CHAMPS '26 Registration Details"
        data={formattedChamp}
        onClose={() => setViewOpen(false)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Registration"
        message={`Are you sure you want to delete the registration for "${selectedChamp?.studentName}" (${selectedChamp?.regId})?`}
        onConfirm={confirmAction}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedChamp(null);
          setConfirmType(null);
        }}
      />

      {/* Attendance confirm */}
      <ConfirmDialog
        open={attendanceConfirmOpen}
        title="Update Attendance"
        message={`Are you sure you want to mark "${selectedAttendanceChamp?.studentName}" as ${
          selectedAttendanceChamp?.present ? "ABSENT" : "PRESENT"
        }?`}
        onConfirm={handleAttendanceConfirm}
        onCancel={() => {
          setAttendanceConfirmOpen(false);
          setSelectedAttendanceChamp(null);
        }}
      />

      {/* Export modal */}
      <ExportModal
        open={exportOpen}
        title="SONA CHAMPS '26 Registrations"
        data={exportData}
        onClose={() => {
          setExportOpen(false);
          setTimeout(() => setExportData([]), 300);
        }}
        loading={exportLoading}
      />

      {/* Column customizer */}
      <ColumnCustomizeDialog
        open={customizeOpen}
        title="Customize Columns"
        columns={columnOptions}
        selected={columnVisibility}
        onChange={(v) => setColumnVisibility((p) => ({ ...p, ...v }))}
        onClose={() => setCustomizeOpen(false)}
      />

      {/* ✅ Bulk upload modal */}
      <SonaChampsBulkUploadModal
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() => {
          setBulkUploadOpen(false);
          fetchChamps();
        }}
      />

      {/* ✅ Single registration modal */}
      <SonaChampsFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => {
          setFormOpen(false);
          fetchChamps();
        }}
      />
    </div>
  );
}