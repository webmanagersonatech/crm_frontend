"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, FileText, Users, FileDown, Search, Settings, GraduationCap } from "lucide-react";
import { DataTable } from "@/components/Tablecomponents";
import { getApplications, } from "@/app/lib/request/application";
import { toast } from "react-toastify";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { getLeads, } from "@/app/lib/request/leadRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import ExportModal from "@/components/ExportModal";
import { Column } from "@/components/Tablecomponents";
import { Country, State, City } from "country-state-city";
import { listStudentsRequest } from "@/app/lib/request/studentRequest";
import Select from "react-select";
interface Application {
  _id?: string;
  instituteId: any;
  userId?: any;
  academicYear: string;
  formStatus: "Complete" | "Incomplete";
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
  isduplicate?: boolean;
  duplicateReason?: string;
  createdBy?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };

}

interface Student {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  mobileNo: string;
  instituteId: string;
  studentId: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}


export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<
    "application" | "lead" | "student"
  >("application");

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
  const [selectedFormStatus, setSelectedFormStatus] = useState("all");
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [startYear, setStartYear] = useState<string>("")
  const [searchProgram, setSearchProgram] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [leadIdSearch, setLeadIdSearch] = useState("");
  const [leadTotalEntries, setLeadTotalEntries] = useState(0);
  const [studentTotalEntries, setStudentTotalEntries] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [totalEntries, setTotalEntries] = useState(0);
  const [selectedApplicationSource, setSelectedApplicationSource] = useState("");
  const [selectedInteraction, setSelectedInteraction] = useState("");
  const [endYear, setEndYear] = useState<string>("")
  const [selectedLeadSource, setSelectedLeadSource] = useState("all");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  // student 

  const [studentLoading, setStudentLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [quotaFilter, setQuotaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("all");
  const [bloodDonateFilter, setBloodDonateFilter] = useState("all");
  const [hostelWillingFilter, setHostelWillingFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [familyOccupationFilter, setFamilyOccupationFilter] = useState("all");
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);


  const [institutions, setInstitutions] = useState<
    { value: string; label: string }[]
  >([]);
  const [columnVisibility, setColumnVisibility] = useState({
    applicationId: true,
    institute: true,
    applicantName: true,
    // program: true,
    city: true,
    academicYear: true,
    formStatus: true,
    paymentStatus: true,
    createdAt: true,
  });
  const [columnVisibilityreport, setColumnVisibilityreport] = useState({
    leadId: true,
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
  const [columnVisibilitystudent, setColumnVisibilitystudent] = useState({
    name: true,
    studentId: true,
    UniversityRegNo: true,
    email: true,
    mobile: true,
    academicYear: true,
    instituteName: true,
    bloodGroup: true,
    status: true,
  });

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
    ...(userpermission === "superadmin"
      ? [{ key: "institute", label: "Institute" }]
      : []),
    { key: "applicantName", label: "Applicant Name" },
    // { key: "program", label: "Program" },

    { key: "academicYear", label: "Academic Year" },
    { key: "city", label: "City" },
    { key: "formStatus", label: "Form Status" },
    { key: "paymentStatus", label: "Payment Status" },
    { key: "createdAt", label: "Created At" },
  ];

  const columnOptionsreport = [
    { key: "leadId", label: "Lead ID" },
    ...(userpermission === "superadmin"
      ? [{ key: "instituteId", label: "Institute" }]
      : []),
    { key: "candidateName", label: "Candidate" },
    { key: "program", label: "Program" },
    { key: "phoneNumber", label: "Phone" },
    { key: "communication", label: "Communication" },
    { key: "followUp", label: "Follow Up" },
    { key: "createdBy", label: "Created By" },
    { key: "status", label: "Status" },
    { key: "applicationStatus", label: "Application Status" },
  ];
  const columnOptionsstudent = [
    { key: "name", label: "Name" },
    { key: "studentId", label: "Student ID" },
    { key: "UniversityRegNo", label: "University Reg No" },
    { key: "academicYear", label: "Academic Year" },
    { key: "bloodGroup", label: "Blood Group" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile" },
    ...(userpermission === "superadmin"
      ? [{ key: "instituteName", label: "Institute" }]
      : []),
    { key: "status", label: "Status" },
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
        formStatus:
          selectedFormStatus !== "all" ? selectedFormStatus : undefined,
        applicationId: searchApplicationId.trim() || undefined,
        program: searchProgram.trim() || undefined,
        applicantName: searchApplicantName.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        country: selectedCountry || undefined,
        state: selectedState || undefined,
        city: selectedCities.length ? selectedCities : undefined,
        applicationSource: selectedApplicationSource || undefined,
        interactions: selectedInteraction || undefined,
      });

      setApplications((res.data as Application[]) || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalEntries(res.pagination?.totalDocs || 0);
      if (res.academicYears) {
        setAcademicYears(res.academicYears);
      }
    } catch (err: any) {
      toast.error("Failed to load applications");
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedYear, selectedInstitution, limit, selectedPayment, selectedCountry, selectedState, selectedCities, selectedApplicationSource, selectedInteraction, selectedFormStatus, startDate, endDate, searchApplicationId, searchApplicantName, searchProgram]);

  useEffect(() => {
    if (activeTab === "application") {
      fetchApplications();
    }
  }, [fetchApplications, activeTab]);

  useEffect(() => {
    if (startYear && endYear) {
      setSelectedYear(`${startYear}-${endYear}`)
      setCurrentPage(1)
    }
  }, [startYear, endYear])



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
        phoneNumber: phoneSearch || undefined, //  added
        leadId: leadIdSearch || undefined,
        leadSource: selectedLeadSource !== "all" ? selectedLeadSource : undefined,
        country: selectedCountry || undefined,   // 
        state: selectedState || undefined,       // 
        city: selectedCities.length ? selectedCities : undefined,
      });
      setLeads(res.docs || []);
      setleadTotalPages(res.totalPages || 1);
      setLeadTotalEntries(res.totalDocs || 0);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setleadLoading(false);
    }
  }, [leadcurrentPage, selectedInstitution, selectedStatus, selectedCommunication, selectedLeadSource, selectedCountry, selectedState, selectedCities, searchTerm, startDate, endDate, phoneSearch, leadIdSearch]);

  useEffect(() => {
    if (activeTab === "lead") {
      fetchLeads();
    }
  }, [activeTab, fetchLeads]);



  const fetchStudents = useCallback(async () => {
    setStudentLoading(true);
    try {
      const res = await listStudentsRequest({
        page: studentCurrentPage,
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
      setStudentTotalPages(res.students.totalPages || 1);
      setStudentTotalEntries(res.students.totalDocs || 0);
      if (res.academicYears) {
        setAcademicYears(res.academicYears);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load students");
    } finally {
      setStudentLoading(false);
    }
  }, [
    selectedYear,
    studentCurrentPage,
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
    familyOccupationFilter
  ]);

  useEffect(() => {
    if (activeTab === "student") {
      fetchStudents();
    }
  }, [activeTab, fetchStudents]);

  const filteredApplications = (applications || []).map((app: any) => {
    const obj: any = {};

    if (columnVisibility.applicationId) {
      obj.ApplicationId = app.applicationId || "-";
    }

    if (
      userpermission === "superadmin" &&
      columnVisibility.institute
    ) {
      obj.Institute = app.institute?.name || app.instituteId || "-";
    }

    if (columnVisibility.applicantName) {
      obj.ApplicantName =
        app.applicantName ||
        app.personalData?.["Full Name"] ||
        "-";
    }




    if (columnVisibility.academicYear) {
      obj.AcademicYear = app.academicYear || "-";
      if (columnVisibility.city) {
        obj.City =
          app.city ||
          app.personalData?.City ||
          "-";
      }
    }

    if (columnVisibility.paymentStatus) {
      obj.PaymentStatus = app.paymentStatus || "-";
    }
    if (columnVisibility.formStatus) {
      obj.FormStatus = app.formStatus || "-";
    }

    if (columnVisibility.createdAt) {
      obj.CreatedAt = app.createdAt
        ? new Date(app.createdAt).toLocaleDateString()
        : "-";
    }

    return obj;
  });

  const filteredLeads = (leads || []).map((lead: any) => {
    const obj: any = {};

    if (columnVisibilityreport.leadId) {
      obj.LeadID = lead.leadId || "-"; // assuming _id is your lead ID
    }

    if (
      userpermission === "superadmin" &&
      columnVisibilityreport.instituteId
    ) {
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


  const filteredStudents = (students || []).map((student: any) => {
    const obj: any = {};

    if (columnVisibilitystudent.name) {
      obj.Name = `${student.firstname || ""} ${student.lastname || ""}`.trim() || "-";
    }

    if (columnVisibilitystudent.studentId) {
      obj.StudentID = student.studentId || "-";
    }
    if (columnVisibilitystudent.UniversityRegNo) {
      obj.UniversityRegNo = student.admissionUniversityRegNo || "-";
    }
    if (columnVisibilitystudent.academicYear) {
      obj.AcademicYear = student.academicYear || "-";
    }
    if (columnVisibilitystudent.bloodGroup) {
      obj.BloodGroup = student.bloodGroup || "-";
    }


    if (columnVisibilitystudent.email) {
      obj.Email = student.email || "-";
    }

    if (columnVisibilitystudent.mobile) {
      obj.Mobile = student.mobileNo || "-";
    }

    if (
      userpermission === "superadmin" &&
      columnVisibilitystudent.instituteName
    ) {
      obj.Institute =
        student.institute?.name ||
        student.instituteId ||
        "-";
    }

    if (columnVisibilitystudent.status) {
      obj.Status = student.status || "-";
    }

    return obj;
  });






  const columns = [

    columnVisibility.applicationId && {
      header: "Application Id",
      render: (a: any) =>
        a.applicationId ? a.applicationId.toUpperCase() : "—",
    },

    ...(userpermission === "superadmin" && columnVisibility.institute
      ? [{
        header: "Institute",
        render: (a: any) =>
          a.institute?.name || a.instituteId || "—",
      }]
      : []),


    columnVisibility.applicantName && {
      header: "Applicant Name",
      render: (a: any) => a.applicantName || "—",
    },

    // columnVisibility.program && {
    //   header: "Program",
    //   render: (a: any) => a.program || "—",
    // },

    columnVisibility.academicYear && {
      header: "Academic Year",
      accessor: "academicYear",
    },
    columnVisibility.city && {
      header: "City",
      render: (a: any) =>
        a.city || a?.City || "—",
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

    columnVisibility.formStatus && {
      header: "Form Status",
      render: (a: Application) => (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-medium border
        ${a.formStatus === "Complete"
              ? "bg-green-50 text-green-700 border-green-300"
              : "bg-orange-50 text-orange-700 border-orange-300"
            }`}
        >
          {a.formStatus === "Complete" ? "Completed" : a.formStatus}
        </span>
      ),
    },
    {
      header: "Application Source",
      render: (a: any) => {
        const source = a.applicationSource || "—";
        const colorMap: Record<string, string> = {
          online: "bg-green-100 text-green-800 border-green-500",
          offline: "bg-blue-100 text-blue-800 border-blue-500",
          lead: "bg-yellow-100 text-yellow-800 border-yellow-500",
        };
        const colorClass = colorMap[source.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-400";

        return (
          <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${colorClass}`}>
            {source.charAt(0).toUpperCase() + source.slice(1)}
          </span>
        );
      },
    },

    {
      header: "Follow-up Interactions",
      render: (a: any) => {
        const status = a.interactions || "—";
        const colorMap: Record<string, string> = {
          "New": "text-gray-600",
          "Followup": "text-blue-600",
          "Not Reachable": "text-red-600",
          "Switched Off": "text-yellow-600",
          "Not Picked": "text-purple-600",
          "Irrelevant": "text-pink-600",
          "Interested": "text-green-600",
          "Not Interested": "text-orange-600",
          "Cut the call": "text-indigo-600",
          "Admitted": "text-teal-600",
          "Closed": "text-gray-800",
        };

        const colorClass = colorMap[status] || "text-gray-600";

        return (
          <span className={`font-medium ${colorClass}`}>
            {status}
          </span>
        );
      },
    },

    columnVisibility.createdAt && {
      header: "Created At",
      render: (a: Application) =>
        new Date(a.createdAt).toLocaleDateString(),
    },



  ].filter(Boolean) as Column<any>[];



  const leadcolumns = [
    columnVisibilityreport.leadId && {
      header: "Lead ID",
      render: (lead: any) => lead.leadId || "—",
    },
    ...(userpermission === "superadmin" && columnVisibilityreport.instituteId
      ? [{
        header: "Institute",
        render: (lead: any) =>
          lead.institute?.name || lead.instituteId || "—",
      }]
      : []),


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
    {
      header: "Lead Source",
      render: (lead: any) => {
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

    columnVisibilityreport.createdBy && {
      header: "Created By",
      render: (lead: any) =>
        lead.creator
          ? `${lead.creator.firstname || ""} ${lead.creator.lastname || ""}`
          : "—",
    },
    {
      header: "Duplicate",
      render: (lead: Lead) => {
        const [showPopup, setShowPopup] = useState(false); //  use imported hook

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

  const studentColumns: Column<Student>[] = [

    ...(userpermission === "superadmin" && columnVisibilitystudent.instituteName
      ? [{
        header: "Institute",
        render: (s: any) =>
          s.institute?.name || "-",
      }]
      : []),


    columnVisibilitystudent.name && {
      header: "Name",
      render: (s: any) => `${s.firstname} ${s.lastname}`,
    },


    columnVisibilitystudent.studentId && {
      header: "Student ID",
      accessor: "studentId",
    },
    columnVisibilitystudent.UniversityRegNo && {
      header: "University Reg No",
      accessor: "admissionUniversityRegNo",
    },

    columnVisibilitystudent.academicYear && {
      header: "Academic Year",
      accessor: "academicYear",
    },
    columnVisibilitystudent.bloodGroup && {
      header: "Blood Group",
      accessor: "bloodGroup", // student.bloodGroup
    },

    columnVisibilitystudent.email && {
      header: "Email",
      accessor: "email",
    },

    columnVisibilitystudent.mobile && {
      header: "Mobile",
      accessor: "mobileNo",
    },



    // columnVisibilitystudent.status && {
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


  ].filter(Boolean) as Column<Student>[];

  // Dynamic header icon
  const ReportIcon =
    activeTab === "application"
      ? FileText
      : activeTab === "lead"
        ? Users
        : activeTab === "student"
          ? GraduationCap
          : BarChart3;

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
          {
            activeTab === "application"
              ? "Application Reports"
              : activeTab === "student"
                ? "Student Reports"
                : "Lead Reports"
          }

        </h1>
      </div>


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
        <button
          onClick={() => setActiveTab("student")}
          className={`flex items-center px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${activeTab === "student"
            ? "bg-gradient-to-b from-[#2a3970] to-[#5667a8] text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
        >
          <GraduationCap className="w-4 h-4 mr-2" />
          Student Report
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

            {/* 🎓 Academic Year */}
            {activeTab !== "lead" && (
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
            )}

            {/* 📅 Date Range */}

            {activeTab !== "student" && (<div className="flex flex-wrap items-center gap-2">
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
            </div>)}


            {/* Country → State → City */}


            <div className="flex gap-2">
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


            </div>
            {/* 💳 Payment Filter */}
            {activeTab !== "lead" && activeTab !== "student" && (
              <>
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
                <select
                  value={selectedFormStatus}
                  onChange={(e) => {
                    setSelectedFormStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                >
                  <option value="all">All Form Status</option>
                  <option value="Complete">Complete</option>
                  <option value="Incomplete">Incomplete</option>
                </select>



                {/* Application Source Filter */}
                <Select
                  placeholder="Select Application Source"
                  options={[
                    { value: "online", label: "Online" },
                    { value: "offline", label: "Offline" },
                    { value: "lead", label: "Lead" },
                  ]}
                  value={selectedApplicationSource ? { value: selectedApplicationSource, label: selectedApplicationSource } : null}
                  onChange={(opt) => {
                    setSelectedApplicationSource(opt?.value || "");
                    setCurrentPage(1);
                  }}
                  isClearable
                />

                {/* Applicant Interaction Filter */}
                <Select
                  placeholder="Select Interaction"
                  options={[
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
                  ]}
                  value={selectedInteraction ? { value: selectedInteraction, label: selectedInteraction } : null}
                  onChange={(opt) => {
                    setSelectedInteraction(opt?.value || "");
                    setCurrentPage(1);
                  }}
                  isClearable
                />
              </>


            )}
            {/* 🔢 Application ID */}
            {activeTab !== "lead" && activeTab !== "student" && (
              <>
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
                <input
                  type="text"
                  placeholder="Search by Program"
                  value={searchProgram}
                  onChange={(e) => {
                    setSearchProgram(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                />
              </>
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

                <select
                  value={selectedLeadSource}
                  onChange={(e) => setSelectedLeadSource(e.target.value)}
                  className="w-full sm:w-auto border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                >
                  <option value="all">All Lead Sources</option>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="application">Application</option>
                </select>
              </>
            )}

            {/* 🧍 Applicant / Lead Name */}
            {activeTab === "lead" && (
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
            )}

            {activeTab === "application" && (
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


            {/* 🔹 Phone Number Search */}
            {activeTab === "lead" && (
              <>
                <div className="relative w-full sm:w-48 md:w-60">
                  <input
                    type="text"
                    placeholder="Search by phone..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    className="w-full pl-3 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                  />
                </div>


                <div className="relative w-full sm:w-48 md:w-60">
                  <input
                    type="text"
                    placeholder="Search by Lead ID..."
                    value={leadIdSearch}
                    onChange={(e) => setLeadIdSearch(e.target.value)}
                    className="w-full pl-3 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                  />
                </div>
              </>)}



            {activeTab === "student" && (


              <>





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

              </>)}

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
          title={
            activeTab === "application"
              ? "APPLICATION REPORT"
              : activeTab === "student"
                ? "STUDENT REPORT"
                : "LEAD REPORT"
          }
          onClose={() => setOpen(false)}
          data={
            activeTab === "application"
              ? filteredApplications
              : activeTab === "student"
                ? filteredStudents
                : filteredLeads
          }
        />

        <ColumnCustomizeDialog
          open={customizeOpen}
          title={`Customize ${activeTab} Report Columns`}
          columns={
            activeTab === "application"
              ? columnOptions
              : activeTab === "student"
                ? columnOptionsstudent
                : columnOptionsreport
          }
          selected={
            activeTab === "application"
              ? columnVisibility
              : activeTab === "student"
                ? columnVisibilitystudent
                : columnVisibilityreport
          }
          onChange={(updated) => {
            if (activeTab === "application") {
              setColumnVisibility(prev => ({ ...prev, ...updated }));
            } else if (activeTab === "student") {
              setColumnVisibilitystudent(prev => ({ ...prev, ...updated }));
            } else {
              setColumnVisibilityreport(prev => ({ ...prev, ...updated }));
            }
          }}
          onClose={() => setCustomizeOpen(false)}
        />



      </div>


      <div className="bg-white shadow rounded-lg p-4">
        {activeTab === "application" && (
          <DataTable
            columns={columns}
            data={applications}
            totalEntries={totalEntries}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        {activeTab === "lead" && (
          <DataTable
            columns={leadcolumns}
            data={leads}
            loading={leadloading}
            totalEntries={leadTotalEntries}
            currentPage={leadcurrentPage}
            totalPages={totalleadPages}
            onPageChange={setleadCurrentPage}
          />
        )}

        {activeTab === "student" && (
          <DataTable
            columns={studentColumns}
            data={students}
            loading={studentLoading}
            totalEntries={studentTotalEntries}
            currentPage={studentCurrentPage}
            totalPages={studentTotalPages}
            onPageChange={setStudentCurrentPage}
          />
        )}
      </div>



    </div>
  );
}
