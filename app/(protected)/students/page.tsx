"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Eye,
  FileDown,
  Settings,
  Search,
  Pencil,
  X,
  GraduationCap,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

import { DataTable, Column } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import StudentViewDialog from "@/components/StudentViewDialog";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import StudentCleanupForm from "@/components/Forms/Studentdatacleanform";
import { listStudentsRequest } from "@/app/lib/request/studentRequest";
import AsyncSelect from "react-select/async";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { deleteStudentRequest, toggleStudentStatusRequest, exportStudentsRequest } from "@/app/lib/request/studentRequest";
import { motion, AnimatePresence } from "framer-motion";
import { Country, State, City } from "country-state-city";
import Select from "react-select";

interface Sibling {
  _id: string
  name: string
  age: number
  status: string
}

interface Institute {
  _id: string
  name: string
  instituteId: string
}

interface Student {
  _id: string

  firstname: string
  lastname: string
  email: string
  mobileNo: string

  instituteId: string
  studentId: string
  applicationId: string
  admissionUniversityRegNo: string
  admissionQuota: string

  academicYear: string
  interactions: string

  country: string
  state: string
  city: string

  status: string

  bloodGroup: string
  bloodWilling: boolean

  familyOccupation: string
  familyOtherOccupation: string

  hostelWilling: boolean
  hostelReason: string

  internshipCompany: string
  internshipDuration: string
  internshipRemarks: string
  internshipType: string

  siblingsCount: number
  siblingsDetails: Sibling[]

  institute: Institute

  createdAt: string
  updatedAt: string
}


export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [startCutoff, setStartCutoff] = useState("");
  const [endCutoff, setEndCutoff] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [role, setRole] = useState<string>("")

  const [institutions, setInstitutions] = useState<
    { value: string; label: string }[]
  >([]);

  const [selected, setSelected] = useState<Student | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const [confirmType, setConfirmType] = useState<"delete" | "toggle" | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("all");
  const [bloodDonateFilter, setBloodDonateFilter] = useState("all");
  const [hostelWillingFilter, setHostelWillingFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [familyOccupationFilter, setFamilyOccupationFilter] = useState("all");
  const [quotaFilter, setQuotaFilter] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [exportData, setExportData] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      console.log(" No token found")
      return
    }
    try {
      const payload: any = JSON.parse(atob(token.split(".")[1]));
      setRole(payload.role)

    } catch (error) {
      console.error(" Failed to decode token", error)
    }
  }, [])

  const handleExport = async () => {
    try {
      setExportLoading(true);

      // Call the export API with the same filters (without pagination)
      const result = await exportStudentsRequest({
        search: searchTerm,
        status: statusFilter,
        academicYear: selectedYear !== "all" ? selectedYear : undefined,
        instituteId: selectedInstitution,
        bloodGroup: bloodGroupFilter,
        bloodDonate: bloodDonateFilter,
        hostelWilling: hostelWillingFilter,
        quota: quotaFilter,
        country: selectedCountry,
        state: selectedState,
        city: selectedCities.length ? selectedCities : undefined,
        feedbackRating: feedbackFilter,
        familyOccupation: familyOccupationFilter,
        startCutoff: startCutoff ? Number(startCutoff) : undefined,
        endCutoff: endCutoff ? Number(endCutoff) : undefined,
      });

      // Check if we have data
      if (!result.data || result.data.length === 0) {
        toast.info("No data to export");
        setExportLoading(false);
        return;
      }

      // Transform the data using the SAME logic as filteredStudents
      const transformedData = result.data.map((student: any) => {
        const obj: any = {};

        if (columnVisibility.name) {
          obj.Name = `${student.firstname || ""} ${student.lastname || ""}`.trim() || "-";
        }

        if (columnVisibility.studentId) {
          obj.StudentID = student.studentId || "-";
        }

        if (columnVisibility.applicationId) {
          obj.ApplicationID = student.applicationId || "-";
        }

        if (
          columnVisibility.UniversityRegNo &&
          (student.instituteId === "INS-ESTKLHCB")
        ) {
          obj.UniversityRegNo = student.admissionUniversityRegNo || "-";
        }

        if (columnVisibility.academicYear) {
          obj.AcademicYear = student.academicYear || "-";
        }

        if (columnVisibility.bloodGroup) {
          obj.BloodGroup = student.bloodGroup || "-";
        }

        if (columnVisibility.email) {
          obj.Email = student.email || "-";
        }

        if (columnVisibility.mobile) {
          obj.Mobile = student.mobileNo || "-";
        }

        if (role === "superadmin" && columnVisibility.instituteName) {
          obj.Institute = student.institute?.name || student.instituteId || "-";
        }

        if (columnVisibility.status) {
          obj.Status = student.status || "-";
        }

        return obj;
      });

      // Set the data and open modal
      setExportData(transformedData);
      setExportOpen(true);

    } catch (error: any) {
      toast.error("Failed to export students: " + (error.message || "Unknown error"));
      console.error("Error exporting students:", error);
    } finally {
      setExportLoading(false);
    }
  };

  // Memoized country options
  const countryOptions = useMemo(() =>
    Country.getAllCountries().map(c => ({
      value: c.name,
      label: c.name,
    })),
    []);

  // Load states based on selected country
  const loadStates = useCallback(async (inputValue: string) => {
    const countryName =
      selectedCountry && selectedCountry !== "all"
        ? selectedCountry
        : "India";

    const country = Country.getAllCountries().find(
      c => c.name === countryName
    );

    if (country) {
      const states = State.getStatesOfCountry(country.isoCode);

      return states
        .filter((s) =>
          s.name.toLowerCase().includes(inputValue.toLowerCase())
        )
        .slice(0, 200)
        .map((s) => ({
          value: s.name,
          label: s.name,
        }));
    }

    return [];
  }, [selectedCountry]);

  // Load cities based on selected country and state
  const loadCities = useCallback(async (inputValue: string) => {
    const countryName =
      selectedCountry && selectedCountry !== "all"
        ? selectedCountry
        : "India";

    const stateName =
      selectedState && selectedState !== "all"
        ? selectedState
        : "Tamil Nadu";

    const country = Country.getAllCountries().find(
      c => c.name === countryName
    );

    if (country) {
      const state = State.getStatesOfCountry(country.isoCode).find(
        s => s.name === stateName
      );

      if (state) {
        const cities = City.getCitiesOfState(
          country.isoCode,
          state.isoCode
        );

        return cities
          .filter((c) =>
            c.name.toLowerCase().includes(inputValue.toLowerCase())
          )
          .slice(0, 200)
          .map((c) => ({
            value: c.name,
            label: c.name,
          }));
      }
    }

    return [];
  }, [selectedCountry, selectedState]);


  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    studentId: true,
    applicationId: true,
    UniversityRegNo: true,
    academicYear: true,
    email: true,
    mobile: true,
    instituteName: true,
    status: true,
    bloodGroup: true,

  });

  const columnOptions = [
    { key: "name", label: "Name" },
    { key: "applicationId", label: "Application ID" },
    { key: "studentId", label: "Student ID" },
    ...(selectedInstitution === "INS-ESTKLHCB"
      ? [{ key: "UniversityRegNo", label: "University Reg No" }]
      : []),

    { key: "academicYear", label: "Academic Year" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile" },
    { key: "bloodGroup", label: "Blood Group" },
    ...(role === "superadmin"
      ? [{ key: "instituteName", label: "Institute" }]
      : []),
    { key: "status", label: "Status" },
  ];

  const quotaOptions = [
    { value: "government", label: "Government Quota" },
    { value: "management", label: "Management Quota" },
    // { value: "minority", label: "Minority Quota" },
    { value: "sports", label: "Sports Quota" },
    { value: "nri", label: "NRI Quota" },
    { value: "lateral", label: "Lateral Entry" },
    { value: "transfer", label: "Transfer Admission" },
    { value: "other", label: "Other" },
  ];

  const bloodOptions = [
    "A+", "A-",
    "B+", "B-",
    "O+", "O-",
    "AB+", "AB-",
    "Unknown"
  ];


  const occupationOptions = [
    { value: "farmer", label: "Farmer / Agriculture" },
    { value: "business", label: "Business" },
    { value: "private", label: "Private Employee" },
    { value: "government", label: "Government Employee" },
    { value: "self", label: "Self Employed" },
    { value: "daily_wage", label: "Daily Wage Worker" },
    { value: "homemaker", label: "Homemaker" },
    { value: "retired", label: "Retired" },
    { value: "unemployed", label: "Unemployed" },
    { value: "other", label: "Other" },
  ];

  const feedbackOptions = [
    { value: "good", label: "Good" },
    { value: "bad", label: "Bad" },
    { value: "worst", label: "Worst" },
  ];


  /* ======================
     Fetch Students
  ====================== */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listStudentsRequest({
        limit: limit,
        page: currentPage,
        search: searchTerm,
        status: statusFilter,
        academicYear: selectedYear !== "all" ? selectedYear : undefined,
        instituteId: selectedInstitution,
        bloodGroup: bloodGroupFilter,
        bloodDonate: bloodDonateFilter,
        hostelWilling: hostelWillingFilter,
        quota: quotaFilter,
        country: selectedCountry,
        state: selectedState,
        city: selectedCities.length ? selectedCities : undefined,
        startCutoff: startCutoff ? Number(startCutoff) : undefined,
        endCutoff: endCutoff ? Number(endCutoff) : undefined,
        feedbackRating: feedbackFilter,
        familyOccupation: familyOccupationFilter,
      });

      setStudents(res.students.docs || []);
      setTotalPages(res.students.totalPages || 1);
      setTotalEntries(res.students?.totalDocs || 0);
      if (res.academicYears) {
        setAcademicYears(res.academicYears);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    searchTerm,
    limit,
    statusFilter,
    selectedInstitution,
    bloodGroupFilter,
    bloodDonateFilter,
    hostelWillingFilter,
    quotaFilter,
    selectedCountry,
    selectedState,
    selectedCities,
    feedbackFilter,
    selectedYear,
    familyOccupationFilter,
    startCutoff,
    endCutoff
  ]);



  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const res = await getActiveInstitutions();
        setInstitutions(
          res.map((i: any) => ({
            value: i.instituteId,
            label: i.name,
          }))
        );
      } catch {
        toast.error("Failed to load institutions");
      }
    };
    loadInstitutions();
  }, []);

  /* ======================
     Confirm Action
  ====================== */
  const confirmAction = async () => {
    if (!selected || !confirmType) return;

    try {
      if (confirmType === "delete") {
        await deleteStudentRequest(selected._id);
        toast.success("Student deleted successfully!");
      }

      if (confirmType === "toggle") {
        const newStatus =
          selected.status === "active" ? "inactive" : "active";

        await toggleStudentStatusRequest(selected._id, newStatus);
        toast.success(`Student status changed to ${newStatus}!`);
      }

      await fetchStudents(); // refresh list
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setConfirmOpen(false);
      setSelected(null);
      setConfirmType(null);
    }
  };


  /* ======================
     Table Columns
  ====================== */
  const columns: Column<Student>[] = [
    role === "superadmin" &&
    columnVisibility.instituteName && {
      header: "Institute",
      render: (s: any) => s.institute?.name || "-",
    },


    columnVisibility.name && {
      header: "Name",
      render: (s: any) => `${s.firstname} ${s.lastname}`,
    },


    columnVisibility.studentId && {
      header: "Student ID",
      accessor: "studentId",

    },
    columnVisibility.applicationId && {  // ✅ added
      header: "Application ID",
      accessor: "applicationId",
    },

    (selectedInstitution === "INS-ESTKLHCB") &&
    columnVisibility.UniversityRegNo && {
      header: "University Reg No",
      accessor: "admissionUniversityRegNo",
    },

    columnVisibility.academicYear && {
      header: "Academic Year",
      accessor: "academicYear",
    },
    columnVisibility.bloodGroup && {
      header: "Blood Group",
      accessor: "bloodGroup", // student.bloodGroup
    },

    columnVisibility.email && {
      header: "Email",
      accessor: "email",
    },

    columnVisibility.mobile && {
      header: "Mobile",
      accessor: "mobileNo",
    },





    // columnVisibility.status && {
    //   header: "Status",
    //   render: (s: any) => (
    //     <span
    //       className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === "active"
    //         ? "bg-green-100 text-green-700"
    //         : "bg-red-100 text-red-700"
    //         }`}
    //     >
    //       {s.status}
    //     </span>
    //   ),
    // },

    {
      header: "Actions",
      render: (s: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelected(s);
              setConfirmType("toggle");
              setConfirmOpen(true);
            }}
            className={`w-28 px-3 py-1 rounded-md text-sm text-center
    ${s.status === "active"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
              }`}
          >
            {s.status === "active" ? "Deactivate" : "Activate"}
          </button>


          <button
            onClick={() => {
              setSelected(s);
              setViewOpen(true);
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setSelected(s);
              setIsOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
          >
            <Pencil className="w-4 h-4" />
          </button>


          {role === "superadmin" && (
            <button
              onClick={() => {
                setSelected(s);
                setConfirmType("delete");
                setConfirmOpen(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

        </div>
      ),
    },
  ].filter(Boolean) as Column<Student>[];



  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-semibold">Students</h1>
        </div>

        <div className="flex flex-col gap-3 p-4 bg-white rounded-lg">
          {/* Top Row - Essential Controls */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            {/* Left side - Customize button */}
            <button
              onClick={() => setCustomizeOpen(true)}
              className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md order-1"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Customize Columns</span>
            </button>

            {/* Right side - Show entries and Export */}
            <div className="flex items-center gap-2 order-2 ml-auto">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Show</span>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500">entries</span>
              </div>

              <button
                onClick={handleExport}
                disabled={exportLoading}
                className={`flex items-center gap-1 px-3 py-2 text-sm rounded-md ${exportLoading
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-700 hover:bg-green-800'
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

          {/* Mobile Show Entries (visible only on mobile) */}
          <div className="flex sm:hidden items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Show entries:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            >
              {[10, 25, 50, 100, 250, 500].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>

          {/* Search Row - Full width on mobile */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, std ID,univ NO, State, City"

                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />
            </div>
          </div>

          {/* Filters Grid - Responsive layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">

            {/* Institution Filter - Superadmin only */}
            {role === "superadmin" && (
              <select
                value={selectedInstitution}
                onChange={(e) => {
                  setSelectedInstitution(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
              >
                <option value="all">All Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.value} value={inst.value}>
                    {inst.label}
                  </option>
                ))}
              </select>
            )}

            {/* Academic Year */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
            >
              <option value="all">Academic Year: All</option>
              {academicYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Blood Group Filter */}
            <select
              value={bloodGroupFilter}
              onChange={(e) => {
                setBloodGroupFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
            >
              <option value="all">Blood Group: All</option>
              {bloodOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Blood Donate */}
            <select
              value={bloodDonateFilter}
              onChange={(e) => {
                setBloodDonateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
            >
              <option value="all">Blood Donate: All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            {/* Hostel Willing */}
            <select
              value={hostelWillingFilter}
              onChange={(e) => {
                setHostelWillingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
            >
              <option value="all">Hostel: All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            {/* Quota */}
            <select
              value={quotaFilter}
              onChange={(e) => {
                setQuotaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
            >
              <option value="all">Quota: All</option>
              {quotaOptions.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
            {/* Cutoff Range */}
            <div className="flex items-center gap-2 w-full">
              <input
                type="number"
                placeholder="Cutoff Min"
                value={startCutoff}
                onChange={(e) => {
                  setStartCutoff(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 w-full focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />

              <input
                type="number"
                placeholder="Cutoff Max"
                value={endCutoff}
                onChange={(e) => {
                  setEndCutoff(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 w-full focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />
            </div>
            {/* Feedback */}
            <select
              value={feedbackFilter}
              onChange={(e) => {
                setFeedbackFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
            >
              <option value="all">Feedback: All</option>
              {feedbackOptions.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Family Occupation */}
            <select
              value={familyOccupationFilter}
              onChange={(e) => {
                setFamilyOccupationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] w-full"
            >
              <option value="all">Occupation: All</option>
              {occupationOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Country AsyncSelect */}
            <div className="w-full">
              <AsyncSelect
                key="country-select"
                placeholder="Search Country..."
                cacheOptions
                defaultOptions={countryOptions}
                loadOptions={(inputValue) => {
                  return Promise.resolve(
                    countryOptions.filter(option =>
                      option.label.toLowerCase().includes(inputValue.toLowerCase())
                    )
                  );
                }}
                value={countryOptions.find(c => c.value === selectedCountry) || null}
                onChange={(opt) => {
                  setSelectedCountry(opt?.value || "all");
                  setSelectedState("all");
                  setSelectedCities([]);
                  setCurrentPage(1);
                }}
                isClearable
                className="w-full text-sm"
                styles={{
                  control: (base) => ({ ...base, minHeight: '38px' })
                }}
              />
            </div>

            {/* State AsyncSelect */}
            <div className="w-full">
              <AsyncSelect
                key={`state-select-${selectedCountry}`}
                placeholder="Search State..."
                cacheOptions
                defaultOptions
                loadOptions={loadStates}
                value={
                  selectedState && selectedState !== "all"
                    ? { value: selectedState, label: selectedState }
                    : null
                }
                onChange={(opt) => {
                  setSelectedState(opt?.value || "all");
                  setSelectedCities([]);
                  setCurrentPage(1);
                }}
                isClearable
                className="w-full text-sm"
                styles={{
                  control: (base) => ({ ...base, minHeight: '38px' })
                }}
              />
            </div>

            {/* City AsyncSelect (Multi-select) */}
            <div className="w-full">
              <AsyncSelect
                key={`city-select-${selectedCountry}-${selectedState}`}
                placeholder="Search Cities..."
                cacheOptions
                defaultOptions
                loadOptions={loadCities}
                isMulti
                value={selectedCities.map((c) => ({ value: c, label: c }))}
                onChange={(opts) => {
                  setSelectedCities(opts ? opts.map((o) => o.value) : []);
                  setCurrentPage(1);
                }}
                isClearable
                className="w-full text-sm"
                styles={{
                  control: (base) => ({ ...base, minHeight: '38px' })
                }}
              />
            </div>
          </div>

          {/* Active Filters Summary (optional) */}
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            {searchTerm && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Search: {searchTerm}
              </span>
            )}
            {selectedInstitution !== 'all' && (
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                Institution: {institutions.find(i => i.value === selectedInstitution)?.label}
              </span>
            )}
            {/* Add more active filter indicators as needed */}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <AnimatePresence>
        {isOpen && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] relative flex flex-col"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="overflow-y-auto p-6 flex-1">
                <StudentCleanupForm
                  studentid={selected._id}
                  refetch={fetchStudents}
                  onSuccess={() => setIsOpen(false)}
                />

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <StudentViewDialog
        open={viewOpen}
        title="Student Details"
        data={selected}
        onClose={() => setViewOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={
          confirmType === "delete"
            ? "Delete Student"
            : "Change Student Status"
        }
        message={
          confirmType === "delete"
            ? `Are you sure you want to delete student "${selected?.firstname} ${selected?.lastname}"?`
            : `Are you sure you want to ${selected?.status === "active" ? "deactivate" : "activate"
            } student "${selected?.firstname} ${selected?.lastname}"?`
        }
        onConfirm={confirmAction}
        onCancel={() => {
          setConfirmOpen(false);
          setSelected(null);
          setConfirmType(null);
        }}
      />

      <ExportModal
        open={exportOpen}
        title="Students"
        data={exportData}  // Use exportData instead of filteredStudents
        onClose={() => {
          setExportOpen(false);
          // Clear data after modal closes
          setTimeout(() => {
            setExportData([]);
          }, 300);
        }}
        loading={exportLoading}
      />

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
