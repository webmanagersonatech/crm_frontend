"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Eye, Plus, Pencil, Trash2, FileDown, FileText, Settings, Edit2, PlusCircle, X } from "lucide-react";
import { DataTable } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewDialog from "@/components/ViewDialog";
import toast from "react-hot-toast";
import { getApplications, deleteApplication, updatePaymentStatus } from "@/app/lib/request/application";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import { Column } from "@/components/Tablecomponents";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CreateLeadform from "@/components/Forms/CreateLeadForm";
import Select from "react-select";
import { Country, State, City } from "country-state-city";

interface Application {
  _id?: string;
  instituteId: any;
  userId?: any;
  academicYear: string;
  applicationId: string;
  personalData: Record<string, any>;
  educationData: Record<string, any>;
  formStatus: "Complete" | "Incomplete";
  paymentStatus: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  lead?: {
    _id: string;
    leadId: string;
  };
  leadId: string;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedPayment, setSelectedPayment] = useState("all");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [searchApplicationId, setSearchApplicationId] = useState("");
  const [searchApplicantName, setSearchApplicantName] = useState("");
  const [institutions, setInstitutions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | null>(null);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  const [selectedPaymentApp, setSelectedPaymentApp] = useState<Application | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>("");
  const [searchProgram, setSearchProgram] = useState("");
  const [selectedFormStatus, setSelectedFormStatus] = useState("all");
  const [startYear, setStartYear] = useState<string>("")
  const [endYear, setEndYear] = useState<string>("")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedApplicationSource, setSelectedApplicationSource] = useState("");
  const [selectedInteraction, setSelectedInteraction] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const [isOpen, setIsOpen] = useState(false);

  const [columnVisibility, setColumnVisibility] = useState({
    applicationId: true,
    institute: true,
    applicantName: true,
    program: true,
    academicYear: true,
    paymentStatus: true,
    formStatus: true,
    createdAt: true,
  });

  

  const filterOptions = [
    { value: "academicYear", label: "Academic Year" },
    ...(userpermission === "superadmin" ? [{ value: "instituteId", label: "Institution" }] : []),
    { value: "formStatus", label: "Form Status" },
    { value: "paymentStatus", label: "Payment Status" },
    { value: "country", label: "Country" },
    { value: "state", label: "State" },
    { value: "city", label: "City" },
    { value: "applicationSource", label: "Application Source" },
    { value: "interactions", label: "Follow-up Interaction" },
    { value: "applicationId", label: "Application ID" },
    { value: "applicantName", label: "Applicant Name" },
    { value: "program", label: "Program" },
  ];

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
  const columnOptions = [
    { key: "applicationId", label: "Application ID" },
    { key: "institute", label: "Institute" },
    { key: "applicantName", label: "Applicant Name" },
    { key: "program", label: "Program" },
    { key: "academicYear", label: "Academic Year" },
    { key: "formStatus", label: "Form Status" },
    { key: "paymentStatus", label: "Payment Status" },
    { key: "createdAt", label: "Created At" },
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

          const applicationPermission = data.permissions?.find(
            (p: any) => p.moduleName === "Application"
          );

          if (
            applicationPermission &&
            (applicationPermission.view ||
              applicationPermission.create ||
              applicationPermission.edit ||
              applicationPermission.delete ||
              applicationPermission.filter ||
              applicationPermission.download)
          ) {

            setUserpermisssion(applicationPermission);
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
    if (startYear && endYear) {
      setSelectedYear(`${startYear}-${endYear}`)
      setCurrentPage(1)
    }
  }, [startYear, endYear])


  const handleChangePaymentStatus = async () => {
    if (!selectedPaymentApp?._id || !selectedNewStatus) return;
    try {
      await updatePaymentStatus(selectedPaymentApp._id, selectedNewStatus);
      toast.success(`Payment status updated to ${selectedNewStatus}`);
      setConfirmPaymentOpen(false);
      setSelectedNewStatus("");
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment status");
    }
  };




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
        applicantName: searchApplicantName.trim() || undefined,
        program: searchProgram.trim() || undefined,
        country: selectedCountry || undefined,
        state: selectedState || undefined,
        city: selectedCity || undefined,
        applicationSource: selectedApplicationSource || undefined,
        interactions: selectedInteraction || undefined,
      });

      setApplications((res.data as Application[]) || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      toast.error("Failed to load applications");
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedYear, selectedInstitution, limit, selectedPayment, selectedCountry, selectedState, selectedCity, selectedApplicationSource, selectedInteraction, selectedFormStatus, searchApplicationId, searchApplicantName, searchProgram,]);



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

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  /** 🔹 Load Institutions */
  useEffect(() => {
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

  /** 🗑 Handle Delete */
  const handleDelete = async () => {
    if (!selected?._id) return;
    try {
      await deleteApplication(selected._id);
      toast.success("Application deleted successfully");
      setConfirmOpen(false);
      fetchApplications(); // refresh
    } catch (err: any) {
      toast.error(err.message || "Failed to delete application");
    }
  };

  /** 🔹 Table Columns */


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

    columnVisibility.createdAt && {
      header: "Created At",
      render: (a: Application) =>
        new Date(a.createdAt).toLocaleDateString(),
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
          {a.formStatus}
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



    {
      header: "Follow-ups",
      render: (a: Application) => {
        const leadId = a.lead?._id;

        return (
          <div className="flex gap-2">
            {leadId ? (
              // Update Followup
              <button
                onClick={() => router.push(`/leads/editlead/${leadId}`)}
                className="flex items-center gap-1 bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-900 border border-emerald-300 px-2 py-1 rounded-lg text-sm font-medium hover:from-emerald-200 hover:to-emerald-300 hover:shadow-md transition-all duration-200"
              >
                <Edit2 className="w-4 h-4" />
                Followup
              </button>
            ) : (
              // Create Followup
              <button
                onClick={() => {
                  setSelectedApplication(a);
                  setIsOpen(true);
                }}
                className="flex items-center gap-1 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-900 border border-indigo-300 px-2 py-1 rounded-lg text-sm font-medium hover:from-indigo-200 hover:to-indigo-300 hover:shadow-md transition-all duration-200"
              >
                <PlusCircle className="w-4 h-4" />
                Followup
              </button>
            )}
          </div>
        );
      },
    },



    {
      header: "Actions",
      render: (a: Application) => (
        <div className="flex gap-2">
          {/* 👁 View */}
          {(userpermission === "superadmin" || userpermission?.edit) && (
            <>

              <select
                value=""
                disabled={a.paymentStatus === "Paid"}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  if (!newStatus) return;

                  // 🧠 Only open confirmation if different from current status
                  if (newStatus === a.paymentStatus) {
                    toast.error(`Already marked as ${newStatus}`);
                    return;
                  }

                  // ✅ Set selected application and new status for confirmation
                  setSelectedPaymentApp(a);
                  setSelectedNewStatus(newStatus);
                  setConfirmPaymentOpen(true);
                }}
                className="border text-xs rounded-md py-1 px-2 bg-white cursor-pointer hover:bg-gray-50 focus:outline-none"
              >
                <option value="">Select Payment Status</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>

            </>

          )}

          {(userpermission === "superadmin" || userpermission?.view) && (

            <Link
              href={`/applications/${a._id} ` as any}
              className="bg-gray-400  text-white px-3 py-1 rounded-md flex items-center justify-center"
            >
              <Eye className="w-4 h-4" />
            </Link>
          )}



          {/* ✏️ Edit */}
          {(userpermission === "superadmin" || userpermission?.edit) && (
            a.paymentStatus === "Paid" ? (
              <span className="bg-gray-400 text-white px-3 py-1 rounded-md cursor-not-allowed flex items-center justify-center">
                <Pencil className="w-4 h-4" />
              </span>
            ) : (
              <Link
                href={`/applications/editapplication/${a._id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md flex items-center justify-center"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            )
          )}

          {/* 🗑 Delete */}
          {(userpermission === "superadmin" || userpermission?.delete) && (
            <button
              disabled={a.paymentStatus === "Paid"}
              onClick={() => {
                setSelected(a);
                setConfirmType("delete");
                setConfirmOpen(true);
              }}
              className={`px-3 py-1 rounded-md flex items-center justify-center text-white ${a.paymentStatus === "Paid"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
                }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

        </div>
      ),
    },

  ].filter(Boolean) as Column<any>[];


  /** 🔹 View Application Details */
  const renderDetails = (app: any) => {
    const personal = Object.entries(app.personalData || {});
    const education = Object.entries(app.educationData || {});

    return {
      Institute: app.institute?.name || "—",
      "Academic Year": app.academicYear,
      Status: app.status,
      "Submitted At": new Date(app.createdAt).toLocaleString(),
      "--- Personal Details ---": "",
      ...Object.fromEntries(personal),
      "--- Education Details ---": "",
      ...Object.fromEntries(education),
    };
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

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">

        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-semibold">Applications</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">

          {(userpermission === "superadmin" || userpermission?.filter) && (
            <>
              <button
                onClick={() => setCustomizeOpen(true)}
                className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
              >
                <Settings className="w-4 h-4" /> Customize Columns
              </button>
              <Select
                placeholder="Add filter"
                options={filterOptions.filter(f => !activeFilters.includes(f.value))}
                onChange={(opt) => {
                  if (opt?.value) {
                    setActiveFilters([...activeFilters, opt.value]);
                    setCurrentPage(1);
                  }
                }}
                isClearable
                className="w-52"
              />


              {/* Academic Year Filter (Manual) */}
              {activeFilters.includes("academicYear") && (<div className="rounded-md w-fit border p-[3px] flex items-center gap-4">
                {/* Label on left */}
                <label className="text-sm font-semibold text-gray-700">
                  Academic Year:
                </label>

                {/* Start + End Year */}
                <div className="flex gap-2">
                  {/* Start Year */}
                  <select
                    value={startYear}
                    onChange={(e) => {
                      setStartYear(e.target.value);
                      setEndYear("");
                      setSelectedYear("all");
                      setCurrentPage(1);
                    }}
                    className="border text-sm rounded-md py-2 px-2 w-28 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                  >
                    <option value="">Start</option>
                    {Array.from({ length: 2060 - 2015 + 1 }, (_, i) => 2015 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  {/* End Year */}
                  <select
                    value={endYear}
                    onChange={(e) => {
                      setEndYear(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={!startYear}
                    className="border text-sm rounded-md py-2 px-2 w-28 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                  >
                    <option value="">End</option>
                    {Array.from({ length: 2060 - Number(startYear) }, (_, i) => Number(startYear) + 1 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Output */}
                {startYear && endYear && (
                  <div className="ml-4 text-xs text-gray-600">
                    Selected Year:{" "}
                    <span className="font-semibold text-gray-800">
                      {startYear}-{endYear}
                    </span>
                  </div>
                )}
              </div>)}

              {activeFilters.includes("instituteId") && (
                <select
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


              {activeFilters.includes("formStatus") && (<select
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
              </select>)}

              {activeFilters.includes("paymentStatus") && (<select
                value={selectedPayment}
                onChange={(e) => {
                  setSelectedPayment(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              >
                <option value="all">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>

              </select>)}

              {/* Country → State → City */}
              <div className="flex gap-2">
                {activeFilters.includes("country") && (<Select
                  placeholder="Select Country"
                  options={countryOptions}
                  value={countryOptions.find(c => c.value === selectedCountry) || null}
                  onChange={(opt) => {
                    setSelectedCountry(opt?.value || "");
                    setSelectedState("");
                    setSelectedCity("");
                    setCurrentPage(1);
                  }}
                  isClearable
                />)}
                {activeFilters.includes("state") && (<Select
                  placeholder="Select State"
                  options={stateOptions}
                  value={stateOptions.find(s => s.value === selectedState) || null}
                  onChange={(opt) => {
                    setSelectedState(opt?.value || "");
                    setSelectedCity("");
                    setCurrentPage(1);
                  }}
                  isClearable
                  isDisabled={!selectedCountry}
                />)}
                {activeFilters.includes("city") && (<Select
                  placeholder="Select City"
                  options={cityOptions}
                  value={cityOptions.find(c => c.value === selectedCity) || null}
                  onChange={(opt) => setSelectedCity(opt?.value || "")}
                  isClearable
                  isDisabled={!selectedState}
                />)}
              </div>

              {/* Application Source Filter */}
              {activeFilters.includes("applicationSource") && (<Select
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
              />)}

              {/* Applicant Interaction Filter */}
              {activeFilters.includes("interactions") && (<Select
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
              />)}

              {activeFilters.includes("applicationId") && (<input
                type="text"
                placeholder="Search by Application ID"
                value={searchApplicationId}
                onChange={(e) => {
                  setSearchApplicationId(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />)}



              {/* Applicant Name Search */}
              {activeFilters.includes("applicantName") && (<input
                type="text"
                placeholder="Search by Applicant "
                value={searchApplicantName}
                onChange={(e) => {
                  setSearchApplicantName(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />)}

              {activeFilters.includes("program") && (<input
                type="text"
                placeholder="Search by Program"
                value={searchProgram}
                onChange={(e) => {
                  setSearchProgram(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />)}








            </>
          )}



          {(userpermission === "superadmin" || userpermission?.download) && (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-1 bg-green-700 hover:bg-green-800 text-white px-3 py-2 text-sm rounded-md w-full sm:w-auto transition"
            >
              <FileDown className="w-4 h-4" /> Export
            </button>)}

          {/* Add Application */}


          {(userpermission === "superadmin" || userpermission?.create) && (
            <Link
              href={"/applications/addapplication"}
              className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
            >
              <Plus className="w-4 h-4" /> New Application
            </Link>)}

        </div>
        <ExportModal
          open={open}
          title={"Applications"}
          onClose={() => setOpen(false)}
          data={filteredApplications}
        />
      </div>

      {/* ✅ Data Table */}
      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* ✅ View Dialog */}
      <ViewDialog
        open={viewOpen}
        title="Application Details"
        data={selected ? renderDetails(selected) : {}}
        onClose={() => setViewOpen(false)}
      />
      <ConfirmDialog
        open={confirmPaymentOpen}
        title="Change Payment Status"
        message={`Are you sure you want to mark this application as "${selectedNewStatus}"?`}
        onConfirm={handleChangePaymentStatus}
        onCancel={() => {
          setConfirmPaymentOpen(false);
          setSelectedNewStatus("");
        }}
      />

      {/* ⚠️ Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Application"
        message={`Are you sure you want to delete the application  ${selected?.applicationId
          } ?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <ColumnCustomizeDialog
        open={customizeOpen}
        title="Customize Application Columns"
        columns={columnOptions}
        selected={columnVisibility}
        onChange={(updated) =>
          setColumnVisibility(prev => ({ ...prev, ...updated }))
        }
        onClose={() => setCustomizeOpen(false)}
      />

      <AnimatePresence>
        {isOpen && selectedApplication && (
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

                <CreateLeadform refetch={fetchApplications} applicationId={selectedApplication.applicationId} instituteId={selectedApplication.instituteId} leadSource="application" selectedApplication={selectedApplication} onSuccess={() => setIsOpen(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



    </div>
  );
}
