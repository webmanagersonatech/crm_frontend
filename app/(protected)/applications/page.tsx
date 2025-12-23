"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Eye, Plus, Pencil, Trash2, FileDown, FileText, Settings } from "lucide-react";
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

export default function ApplicationsPage() {
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


  const [columnVisibility, setColumnVisibility] = useState({
    applicationId: true,
    institute: true,
    applicantName: true,
    program: true,
    academicYear: true,
    paymentStatus: true,
    createdAt: true,
  });


  const columnOptions = [
    { key: "applicationId", label: "Application ID" },
    { key: "institute", label: "Institute" },
    { key: "applicantName", label: "Applicant Name" },
    { key: "program", label: "Program" },
    { key: "academicYear", label: "Academic Year" },
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
        applicationId: searchApplicationId.trim() || undefined,
        applicantName: searchApplicantName.trim() || undefined,
        program: searchProgram.trim() || undefined,
      });

      setApplications((res.data as Application[]) || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      toast.error("Failed to load applications");
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedYear, selectedInstitution, limit, selectedPayment, searchApplicationId, searchApplicantName, searchProgram]);



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

    {
      header: "Actions",
      render: (a: Application) => (
        <div className="flex gap-2">
          {/* 👁 View */}
          {(userpermission === "superadmin" || userpermission?.edit) && (
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
              <input
                type="text"
                placeholder="Search by Application ID"
                value={searchApplicationId}
                onChange={(e) => {
                  setSearchApplicationId(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />


              {/* Applicant Name Search */}
              <input
                type="text"
                placeholder="Search by Applicant "
                value={searchApplicantName}
                onChange={(e) => {
                  setSearchApplicantName(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
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

              {/* Institution Filter */}

              {(userpermission === "superadmin" &&
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


              <select
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

              </select>

              {/* Academic Year Filter */}
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              >
                <option value="all">All Years</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
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
        message={`Are you sure you want to delete the application from "${selected?.instituteId?.name || "Unknown Institute"
          }"?`}
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



    </div>
  );
}
