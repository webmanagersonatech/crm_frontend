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
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

import { DataTable, Column } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewDialog from "@/components/ViewDialog";
import StudentViewDialog from "@/components/StudentViewDialog";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import StudentCleanupForm from "@/components/Forms/Studentdatacleanform";
import { listStudentsRequest } from "@/app/lib/request/studentRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { deleteStudentRequest, toggleStudentStatusRequest } from "@/app/lib/request/studentRequest";
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


  const countryOptions = Country.getAllCountries().map(c => ({
    value: c.name,
    label: c.name,
    isoCode: c.isoCode,
  }));
  const selectedCountryObj = countryOptions.find(c => c.value === selectedCountry);

  const stateOptions = selectedCountryObj
    ? State.getStatesOfCountry(selectedCountryObj.isoCode).map(s => ({
      value: s.name,
      label: s.name,
      isoCode: s.isoCode,
    }))
    : [];

  const selectedStateObj = stateOptions.find(s => s.value === selectedState);

  const cityOptions =
    selectedCountryObj && selectedStateObj
      ? City.getCitiesOfState(selectedCountryObj.isoCode, selectedStateObj.isoCode).map(c => ({
        value: c.name,
        label: c.name,
      }))
      : [];





  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    studentId: true,
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
    { key: "studentId", label: "Student ID" },
    { key: "UniversityRegNo", label: "University Reg No" },
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
    { value: "minority", label: "Minority Quota" },
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
    familyOccupationFilter
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
        </div>
      ),
    },
  ].filter(Boolean) as Column<Student>[];

  const filteredStudents = (students || []).map((student: any) => {
    const obj: any = {};

    if (columnVisibility.name) {
      obj.Name = `${student.firstname || ""} ${student.lastname || ""}`.trim() || "-";
    }

    if (columnVisibility.studentId) {
      obj.StudentID = student.studentId || "-";
    }

    if (columnVisibility.UniversityRegNo) {
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


    if (
      role === "superadmin" &&
      columnVisibility.instituteName
    ) {
      obj.Institute =
        student.institute?.name ||
        student.instituteId ||
        "-";
    }


    if (columnVisibility.status) {
      obj.Status = student.status || "-";
    }

    return obj;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-semibold">Students</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">

          <button
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
          >
            <Settings className="w-4 h-4" /> Customize Columns
          </button>


          {/* Institution Filter */}

          {(role === "superadmin" && <select
            value={selectedInstitution}
            onChange={(e) => {
              setSelectedInstitution(e.target.value);
              setCurrentPage(1);
            }}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="all">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.value} value={inst.value}>
                {inst.label}
              </option>
            ))}
          </select>)}

          <div className="rounded-md w-fit border p-[3px] flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">
              Academic Year:
            </label>

            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-2 px-3 w-40 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            >
              <option value="all">All</option>

              {academicYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="name, email, std ID,univ NO"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-56 pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            />
          </div>



          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={bloodGroupFilter}
            onChange={(e) => { setBloodGroupFilter(e.target.value); setCurrentPage(1); }}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="all">All Blood Groups</option>
            {bloodOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Blood Donate */}
          <select
            value={bloodDonateFilter}
            onChange={(e) => { setBloodDonateFilter(e.target.value); setCurrentPage(1); }}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="all">Blood Donate: All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>

          {/* Hostel Willing */}
          <select
            value={hostelWillingFilter}
            onChange={(e) => { setHostelWillingFilter(e.target.value); setCurrentPage(1); }}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
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
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="all">Quota: All</option>
            {quotaOptions.map((q) => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>

          <select
            value={feedbackFilter}
            onChange={(e) => { setFeedbackFilter(e.target.value); setCurrentPage(1); }}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="all">All Feedback</option>
            {feedbackOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          <select
            value={familyOccupationFilter}
            onChange={(e) => { setFamilyOccupationFilter(e.target.value); setCurrentPage(1); }}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="all">All Occupations</option>
            {occupationOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>


          <Select
            placeholder="Select Country"
            options={countryOptions}
            value={countryOptions.find(c => c.value === selectedCountry) || null}
            onChange={(opt) => {
              setSelectedCountry(opt?.value || "");
              setSelectedState("");
              setSelectedCities([]);
              setCurrentPage(1);
            }}
            isClearable
          />
          <Select
            placeholder="Select State"
            options={stateOptions}
            value={stateOptions.find(s => s.value === selectedState) || null}
            onChange={(opt) => {
              setSelectedState(opt?.value || "");
              setSelectedCities([]);
              setCurrentPage(1);
            }}
            isClearable
            isDisabled={!selectedCountry}
          />
          <Select
            placeholder="Select City"
            options={cityOptions}
            value={cityOptions.filter(c =>
              selectedCities.includes(c.value)
            )}
            onChange={(opts) =>
              setSelectedCities(opts ? opts.map(o => o.value) : [])
            }
            isMulti
            isClearable
            isDisabled={!selectedState}
          />

          {/* Export */}
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1 bg-green-700 hover:bg-green-800 text-white px-3 py-2 text-sm rounded-md"
          >
            <FileDown className="w-4 h-4" /> Export
          </button>


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
        title="students"
        data={filteredStudents}
        onClose={() => setExportOpen(false)}
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
