"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Eye, Plus, Loader2, Pencil, Trash2, FileDown, FileText, Settings, Edit2, PlusCircle, X } from "lucide-react";
import { DataTable } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewDialog from "@/components/ViewDialog";
import { toast } from "react-toastify";
import { getApplications, deleteApplication, updatePaymentStatus, exportApplications } from "@/app/lib/request/application";
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
import BulkUploadForm from "@/components/sheetupload";

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


export interface FilterMeta {
  metaKey: string;   // original key from backend (Blood Group)
  label: string;
  type: string;
  options?: string[];
  multiple?: boolean;
}

export interface UiFilter extends FilterMeta {
  searchKey: string; // normalized key (bloodgroup)
  value: string;
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
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [endYear, setEndYear] = useState<string>("")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [exportData, setExportData] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const [selectedApplicationSource, setSelectedApplicationSource] = useState("");
  const [selectedInteraction, setSelectedInteraction] = useState("");
  const [totalEntries, setTotalEntries] = useState(0);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [uiFilters, setUiFilters] = useState<UiFilter[]>([]);
  const [availableFilterFields, setAvailableFilterFields] =
    useState<FilterMeta[]>([]);
  const [searchAny, setSearchAny] = useState("");

  const [isOpen, setIsOpen] = useState(false);

  const [columnVisibility, setColumnVisibility] = useState({
    applicationId: true,
    institute: true,
    applicantName: true,

    program: true,
    // academicYear: true,
    city: true,
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
    ...(userpermission === "superadmin"
      ? [{ key: "institute", label: "Institute" }]
      : []),
    { key: "applicantName", label: "Applicant Name" },
    { key: "program", label: "Program" },
    { key: "city", label: "City" },
    // { key: "academicYear", label: "Academic Year" },
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
        city: selectedCities.length ? selectedCities : undefined,
        applicationSource: selectedApplicationSource || undefined,
        interactions: selectedInteraction || undefined,
        q: searchAny.trim() || undefined,
      });

      setApplications((res.data as Application[]) || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalEntries(res.pagination?.totalDocs || 0);

      if (res.academicYears) {
        setAcademicYears(res.academicYears);
      }
      const r: any = res;

      if (r.filters) {
        const merged = [
          ...(r.filters.personalDetails || []),
          ...(r.filters.educationDetails || [])
        ].map((f: any) => ({
          metaKey: f.key,
          label: f.label,
          type: f.type,
          options: f.options || [],
          multiple: f.multiple || false
        }));

        setAvailableFilterFields(merged);
      }




    } catch (err: any) {
      toast.error("Failed to load applications");
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchAny,
    selectedYear, selectedInstitution, limit, selectedPayment, selectedCountry, selectedState, selectedCities, selectedApplicationSource, selectedInteraction, selectedFormStatus, searchApplicationId, searchApplicantName, searchProgram,]);

  const handleExport = async () => {
    try {
      setExportLoading(true); // You'll need to add this state

      // Call the export API with the same filters (without pagination)
      const exportResult = await exportApplications({
        academicYear: selectedYear !== "all" ? selectedYear : undefined,
        instituteId: selectedInstitution !== "all" ? selectedInstitution : undefined,
        paymentStatus: selectedPayment !== "all" ? selectedPayment : undefined,
        formStatus: selectedFormStatus !== "all" ? selectedFormStatus : undefined,
        applicationId: searchApplicationId.trim() || undefined,
        applicantName: searchApplicantName.trim() || undefined,
        program: searchProgram.trim() || undefined,
        country: selectedCountry || undefined,
        state: selectedState || undefined,
        city: selectedCities.length ? selectedCities : undefined,
        applicationSource: selectedApplicationSource || undefined,
        interactions: selectedInteraction || undefined,
        q: searchAny.trim() || undefined,
      });

      // Transform the exported data for display in modal
      const exportedData = (exportResult.data || []).map((app: any) => {
        const obj: any = {};

        if (columnVisibility.applicationId) {
          obj.ApplicationId = app.applicationId || "-";
        }

        if (userpermission === "superadmin" && columnVisibility.institute) {
          obj.Institute = app.institute?.name || app.instituteId || "-";
        }

        if (columnVisibility.applicantName) {
          obj.ApplicantName = app.applicantName || app.personalData?.["Full Name"] || "-";
        }

        // if (columnVisibility.academicYear) {
        //   obj.AcademicYear = app.academicYear || "-";
        // }

        if (columnVisibility.city) {
          obj.City = app.city || app?.City || "-";
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

      // Set the exported data to the modal
      setExportData(exportedData); // You'll need to add this state
      setOpen(true); // Open the modal with exported data

    } catch (error: any) {
      toast.error("Failed to export applications");
      console.error("Error exporting applications:", error);
    } finally {
      setExportLoading(false);
    }
  };

  // UTILS
  const normalizeKey = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]/g, "");

  // ADD FILTER
  const addUiFilter = () => {
    setUiFilters(prev => [
      ...prev,
      {
        metaKey: "",
        searchKey: "",
        label: "",
        type: "text",
        value: ""
      }
    ]);
  };



  // APPLY
  const updateValue = (index: number, value: string) => {
    setUiFilters(prev => {
      const copy = [...prev];

      copy[index] = {
        ...copy[index],
        value: value.toLowerCase()
      };

      return copy;
    });

    // ⬇️ Auto apply after value change
    setTimeout(() => {
      const updatedFilters = uiFilters.map((f, i) =>
        i === index ? { ...f, value: value.toLowerCase() } : f
      );

      const query = updatedFilters
        .filter(f => f.searchKey && f.value)
        .map(f => `${f.searchKey}:${f.value.trim()}`)
        .join(" ");

      setSearchAny(query);
      setCurrentPage(1);



    }, 0);
  };

  const removeUiFilter = (index: number) => {
    setUiFilters(prev => {
      const updated = prev.filter((_, i) => i !== index);

      // rebuild query from remaining filters
      const query = updated
        .filter(f => f.searchKey && f.value)
        .map(f => `${f.searchKey}:${f.value.toLowerCase().trim()}`)
        .join(" ");

      setSearchAny(query);
      setCurrentPage(1);

      return updated;
    });
  };


  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);



  /** 🔹 Load Institutions */
  useEffect(() => {
    const loadInstitutions = async () => {
      if (userpermission !== "superadmin") return;
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
  }, [userpermission]);

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

    columnVisibility.program && {
      header: "Program",
      render: (a: any) => a.program || "—",
    },

    // columnVisibility.academicYear && {
    //   header: "Academic Year",
    //   accessor: "academicYear",
    // },

    columnVisibility.createdAt && {
      header: "Created At",
      render: (a: Application) =>
        new Date(a.createdAt).toLocaleDateString(),
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
    columnVisibility.city && {
      header: "City",
      render: (a: any) =>
        a.city || a?.City || "—",
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
    columnVisibility.paymentStatus && {
      header: "Payment Status",
      render: (a: Application) => {
        const isSuperAdmin = userpermission === "superadmin";
        const canEdit = userpermission?.edit === true;
        const isPaid = a.paymentStatus === "Paid";

        const disableSelect = isPaid || (!isSuperAdmin && !canEdit);

        return (
          <>
            {(isSuperAdmin || canEdit) ? (
              <select
                value={a.paymentStatus}
                disabled={disableSelect}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  if (!newStatus) return;

                  if (newStatus === a.paymentStatus) {
                    toast.error(`Already marked as ${newStatus}`);
                    return;
                  }

                  // 🚨 Prevent payment if form incomplete
                  if (newStatus === "Paid" && a.formStatus !== "Complete") {
                    toast.warning("Form is incomplete. Please complete the form before marking payment as Paid.");

                    // reset dropdown back to original value
                    e.target.value = a.paymentStatus;
                    return;
                  }

                  setSelectedPaymentApp(a);
                  setSelectedNewStatus(newStatus);
                  setConfirmPaymentOpen(true);
                }}
                className={`border text-xs rounded-md py-1 px-2 cursor-pointer focus:outline-none
              ${a.paymentStatus === "Paid"
                    ? "bg-green-50 text-green-700 border-green-300"
                    : a.paymentStatus === "Partially"
                      ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                      : "bg-red-50 text-red-700 border-red-300"
                  }
              ${disableSelect ? "opacity-70 cursor-not-allowed" : ""}
            `}
              >
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            ) : (
              <span
                className={`px-2 py-1 rounded-lg text-xs font-medium border
              ${a.paymentStatus === "Paid"
                    ? "bg-green-50 text-green-700 border-green-300"
                    : a.paymentStatus === "Partially"
                      ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                      : "bg-red-50 text-red-700 border-red-300"
                  }
            `}
              >
                {a.paymentStatus}
              </span>
            )}
          </>
        );
      },
    },


    {
      header: "Follow-ups",
      render: (a: Application) => {
        const leadId = a.lead?._id;

        const isSuperAdmin = userpermission === "superadmin";
        const canEdit = userpermission?.edit === true;
        const isDisabled = !isSuperAdmin && !canEdit;

        return (
          <div className="flex gap-2">
            {leadId ? (
              // Update Followup
              <button
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  router.push(`/leads/editlead/${leadId}`);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-all duration-200
              ${isDisabled
                    ? "bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-900 border border-emerald-300 hover:from-emerald-200 hover:to-emerald-300 hover:shadow-md"
                  }
            `}
              >
                <Edit2 className="w-4 h-4" />
                Followup
              </button>
            ) : (
              // Create Followup
              <button
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedApplication(a);
                  setIsOpen(true);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-all duration-200
              ${isDisabled
                    ? "bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-900 border border-indigo-300 hover:from-indigo-200 hover:to-indigo-300 hover:shadow-md"
                  }
            `}
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
            userpermission === "superadmin" || a.paymentStatus !== "Paid" ? (
              <Link
                href={`/applications/editapplication/${a._id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md flex items-center justify-center"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            ) : (
              <span className="bg-gray-400 text-white px-3 py-1 rounded-md cursor-not-allowed flex items-center justify-center">
                <Pencil className="w-4 h-4" />
              </span>
            )
          )}

          {/* 🗑 Delete */}
          {(userpermission === "superadmin" || userpermission?.delete) && (
            <button
              disabled={!(userpermission === "superadmin") && a.paymentStatus === "Paid"}
              onClick={() => {
                setSelected(a);
                setConfirmType("delete");
                setConfirmOpen(true);
              }}
              className={`px-3 py-1 rounded-md flex items-center justify-center text-white ${!(userpermission === "superadmin") && a.paymentStatus === "Paid"
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
        {/* <BulkUploadForm /> */}
        <div className="flex flex-col gap-4 p-3 sm:p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">

          {/* Header Section - Always at top */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">


            {/* Entries selector - Left side on large screens */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Show</span>
              <div className="flex rounded-md border border-gray-200 dark:border-gray-700 divide-x divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {[10, 50, 100, 250, 500].map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setLimit(value);
                      setCurrentPage(1);
                    }}
                    className={`px-2 sm:px-3 py-1.5 text-xs font-medium transition-all ${limit === value
                      ? 'bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white shadow-inner'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">entries</span>
            </div>

            {/* Action Buttons - Right side on large screens */}
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
              {/* Export Button */}
              {(userpermission === "superadmin" || userpermission?.download) && (
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium rounded-md transition-all shadow-sm whitespace-nowrap flex-1 sm:flex-initial ${exportLoading
                    ? 'bg-green-400 text-white cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-b from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                    }`}
                >
                  {exportLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden xs:inline">Exporting...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Export</span>
                    </>
                  )}
                </button>
              )}

              {/* Add Application Button */}
              {(userpermission === "superadmin" || userpermission?.create) && (
                <Link
                  href="/applications/addapplication"
                  className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] hover:from-[#2a3970] hover:to-[#4a5d9e] text-white rounded-md transition-all shadow-sm whitespace-nowrap flex-1 sm:flex-initial"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">New</span>
                  <span className="hidden sm:inline">Application</span>
                </Link>
              )}
            </div>
          </div>

          {/* Filter Section - Main content */}
          {(userpermission === "superadmin" || userpermission?.filter) && (
            <div className="flex flex-col gap-3">
              {/* Filter Controls Row - Horizontal on large screens */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-2">
                {/* Customize Button */}
                <button
                  onClick={() => setCustomizeOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm w-full lg:w-auto lg:flex-none"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Customize Columns</span>
                </button>

                {/* Filter Selector - Takes remaining space on large screens */}
                <div className="flex-1 min-w-0 lg:flex-1">
                  <Select
                    placeholder="Add filter"
                    options={filterOptions}
                    isMulti
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    value={filterOptions.filter(opt => activeFilters.includes(opt.value))}
                    onChange={(selectedOptions) => {
                      const values = selectedOptions?.map(opt => opt.value) || [];
                      const removedFilters = activeFilters.filter(filter => !values.includes(filter));

                      removedFilters.forEach((filter) => {
                        switch (filter) {
                          case "academicYear": setSelectedYear("all"); break;
                          case "instituteId": setSelectedInstitution("all"); break;
                          case "formStatus": setSelectedFormStatus("all"); break;
                          case "paymentStatus": setSelectedPayment("all"); break;
                          case "country": setSelectedCountry(""); break;
                          case "state": setSelectedState(""); break;
                          case "city": setSelectedCities([]); break;
                          case "applicationSource": setSelectedApplicationSource(""); break;
                          case "interactions": setSelectedInteraction(""); break;
                          case "applicationId": setSearchApplicationId(""); break;
                          case "applicantName": setSearchApplicantName(""); break;
                          case "program": setSearchProgram(""); break;
                        }
                      });

                      setActiveFilters(values);
                      setCurrentPage(1);
                    }}
                    className="text-sm w-full"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '36px',
                        borderColor: '#e5e7eb',
                        boxShadow: 'none',
                        '&:hover': { borderColor: '#d1d5db' }
                      })
                    }}
                  />
                </div>
              </div>

              {/* Dynamic Filters - Horizontal wrapping on large screens */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Academic Year Filter */}
                {activeFilters.includes("academicYear") && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-md border border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="text-xs border-0 bg-transparent focus:ring-0 py-1 w-20"
                    >
                      <option value="all">All</option>
                      {academicYears.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Institution Filter */}
                {activeFilters.includes("instituteId") && (
                  <select
                    value={selectedInstitution}
                    onChange={(e) => {
                      setSelectedInstitution(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480] bg-white dark:bg-gray-800 min-w-[140px]"
                  >
                    <option value="all">All Institutions</option>
                    {institutions.map((inst) => (
                      <option key={inst.value} value={inst.value}>{inst.label}</option>
                    ))}
                  </select>
                )}

                {/* Form Status Filter */}
                {activeFilters.includes("formStatus") && (
                  <select
                    value={selectedFormStatus}
                    onChange={(e) => {
                      setSelectedFormStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480] bg-white dark:bg-gray-800 min-w-[130px]"
                  >
                    <option value="all">All Form Status</option>
                    <option value="Complete">Complete</option>
                    <option value="Incomplete">Incomplete</option>
                  </select>
                )}

                {/* Payment Status Filter */}
                {activeFilters.includes("paymentStatus") && (
                  <select
                    value={selectedPayment}
                    onChange={(e) => {
                      setSelectedPayment(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480] bg-white dark:bg-gray-800 min-w-[130px]"
                  >
                    <option value="all">All Payments</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                )}
              </div>

              {/* Location and Complex Filters - Horizontal on large screens */}
              <div className="flex flex-wrap items-start lg:items-center gap-2">
                {/* Location Filters Group */}
                {(activeFilters.includes("country") || activeFilters.includes("state") || activeFilters.includes("city")) && (
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-800">
                    {activeFilters.includes("country") && (
                      <div className="w-full sm:w-[130px]">
                        <Select
                          placeholder="Country"
                          options={countryOptions}
                          value={countryOptions.find(c => c.value === selectedCountry) || null}
                          onChange={(opt) => {
                            setSelectedCountry(opt?.value || "");
                            setSelectedState("");
                            setSelectedCities([]);
                            setCurrentPage(1);
                          }}
                          isClearable
                          className="text-xs"
                          styles={{
                            control: (base) => ({ ...base, minHeight: '32px', border: 'none', background: 'transparent' })
                          }}
                        />
                      </div>
                    )}

                    {activeFilters.includes("state") && (
                      <div className="w-full sm:w-[130px]">
                        <Select
                          placeholder="State"
                          options={stateOptions}
                          value={stateOptions.find(s => s.value === selectedState) || null}
                          onChange={(opt) => {
                            setSelectedState(opt?.value || "");
                            setSelectedCities([]);
                            setCurrentPage(1);
                          }}
                          isClearable
                          isDisabled={!selectedCountry}
                          className="text-xs"
                          styles={{
                            control: (base) => ({ ...base, minHeight: '32px', border: 'none', background: 'transparent' })
                          }}
                        />
                      </div>
                    )}

                    {activeFilters.includes("city") && (
                      <div className="w-full sm:w-[130px]">
                        <Select
                          placeholder="City"
                          options={cityOptions}
                          value={cityOptions.filter(c => selectedCities.includes(c.value))}
                          onChange={(opts) => setSelectedCities(opts ? opts.map(o => o.value) : [])}
                          isMulti
                          isClearable
                          isDisabled={!selectedState}
                          className="text-xs"
                          styles={{
                            control: (base) => ({ ...base, minHeight: '32px', border: 'none', background: 'transparent' })
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Application Source Filter */}
                {activeFilters.includes("applicationSource") && (
                  <div className="w-full sm:w-[150px]">
                    <Select
                      placeholder="Source"
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
                      className="text-xs"
                    />
                  </div>
                )}

                {/* Interaction Filter */}
                {activeFilters.includes("interactions") && (
                  <div className="w-full sm:w-[150px]">
                    <Select
                      placeholder="Interaction"
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
                      className="text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Search Inputs - Horizontal on large screens */}
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.includes("applicationId") && (
                  <div className="relative flex-1 min-w-[160px]">
                    <input
                      type="text"
                      placeholder="Search by App ID"
                      value={searchApplicationId}
                      onChange={(e) => {
                        setSearchApplicationId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480]"
                    />
                  </div>
                )}

                {activeFilters.includes("applicantName") && (
                  <div className="relative flex-1 min-w-[160px]">
                    <input
                      type="text"
                      placeholder="Search by Applicant"
                      value={searchApplicantName}
                      onChange={(e) => {
                        setSearchApplicantName(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480]"
                    />
                  </div>
                )}

                {activeFilters.includes("program") && (
                  <div className="relative flex-1 min-w-[160px]">
                    <input
                      type="text"
                      placeholder="Search by Program"
                      value={searchProgram}
                      onChange={(e) => {
                        setSearchProgram(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-md focus:ring-1 focus:ring-[#3a4480] focus:border-[#3a4480]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>





        <ExportModal
          open={open}
          title={"Applications"}
          onClose={() => {
            setOpen(false);
            setExportData([]);
          }}
          data={exportData}
          loading={exportLoading}
        />
      </div>



      <div className="w-full bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-6">

        <h1 className="text-lg font-semibold text-gray-800 mb-4">
          Search Anything in Personal Details & Educational Details
        </h1>

        {/* SEARCH PREVIEW */}
        <div className="mb-6">
          {/* <label className="block text-sm font-semibold text-gray-700 mb-2">
            Search Preview
          </label> */}
          {/* <div className="relative">
            <input
              type="text"
              placeholder="bloodgroup:o+ hostelrequired:yes"
              value={searchAny}
              disabled
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            /> */}

          {/* <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /> */}
          {/* </div> */}

        </div>

        {/* FILTER ROWS */}
        <div className="space-y-4">
          {uiFilters.map((filter, index) => {
            const meta = availableFilterFields.find(f => f.metaKey === filter.metaKey);

            return (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-gray-50 rounded-lg p-3 border border-gray-200 hover:shadow-md transition"
              >
                {/* FIELD SELECT */}
                <div className="sm:col-span-5">
                  <select
                    value={filter.metaKey}
                    onChange={(e) => {
                      const selected = availableFilterFields.find(f => f.metaKey === e.target.value);
                      if (!selected) return;
                      setUiFilters(prev => {
                        const copy = [...prev];
                        copy[index] = {
                          ...selected,
                          metaKey: selected.metaKey,
                          searchKey: normalizeKey(selected.label),
                          value: ""
                        };
                        return copy;
                      });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  >
                    <option value="">Select field</option>
                    {availableFilterFields.map(f => (
                      <option key={f.metaKey} value={f.metaKey}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* VALUE INPUT */}
                <div className="sm:col-span-5">
                  {meta?.type === "text" && (
                    <input
                      type="text"
                      placeholder={`Enter ${meta.label}`}
                      value={filter.value}
                      onChange={(e) => updateValue(index, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  )}
                  {meta?.type === "number" && (
                    <input
                      type="number"
                      placeholder={`Enter ${meta.label}`}
                      value={filter.value}
                      onChange={(e) => updateValue(index, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  )}
                  {meta?.type === "email" && (
                    <input
                      type="email"
                      placeholder={`Enter ${meta.label}`}
                      value={filter.value}
                      onChange={(e) => updateValue(index, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                  )}
                  {meta?.type === "select" && (
                    <select
                      value={filter.value}
                      onChange={(e) => updateValue(index, e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    >
                      <option value="">Select {meta.label}</option>
                      {meta.options?.map(opt => (
                        <option key={opt} value={opt.toLowerCase()}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                  {meta?.type === "radio" && (
                    <div className="flex flex-wrap gap-3">
                      {meta.options?.map(opt => (
                        <label key={opt} className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name={filter.metaKey}
                            checked={filter.value === opt.toLowerCase()}
                            onChange={() => updateValue(index, opt.toLowerCase())}
                            className="accent-blue-500"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {meta?.type === "checkbox" && (
                    <div className="flex flex-wrap gap-3">
                      {meta.options?.map(opt => {
                        const values = filter.value ? filter.value.split(",") : [];
                        return (
                          <label key={opt} className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={values.includes(opt.toLowerCase())}
                              onChange={() => {
                                const updated = values.includes(opt.toLowerCase())
                                  ? values.filter(v => v !== opt.toLowerCase())
                                  : [...values, opt.toLowerCase()];
                                updateValue(index, updated.join(","));
                              }}
                              className="accent-blue-500"
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* REMOVE */}
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    onClick={() => removeUiFilter(index)}
                    className="text-red-500 hover:text-red-700 text-sm px-2 py-1 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
          <button
            onClick={addUiFilter}
            className="bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91]  text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition"
          >
            + Add Filter
          </button>


        </div>
      </div>






      {/*  Data Table */}
      <DataTable
        columns={columns}
        data={applications}
        loading={loading}
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/*  View Dialog */}
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
