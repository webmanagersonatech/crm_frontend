"use client";
import { useState, useEffect, useCallback } from "react";
import { Eye, Pencil, FileDown, Users, Plus, Settings, Trash2, Search, FileText, X, Clock } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { DataTable } from "@/components/Tablecomponents";
import ViewDialog from "@/components/ViewDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getActivedata } from "@/app/lib/request/institutionRequest";
import AddapplicationForm from "@/components/Forms/Addapplicationform";
import { getLeads, deleteLead, updateLead } from "@/app/lib/request/leadRequest";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";


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
  createdBy?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
}

export default function LeadsPage() {
  const router = useRouter();
  // ------------------ STATE ------------------
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [institutions, setInstitutions] = useState<OptionType[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCommunication, setSelectedCommunication] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userList, setUserList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<"delete" | "status" | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState({
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

  // ------------------ OPTIONS ------------------

  const columnOptions = [
    { key: "instituteId", label: "Institute" },
    { key: "candidateName", label: "Candidate" },
    { key: "program", label: "Program" },
    { key: "phoneNumber", label: "Phone" },
    { key: "communication", label: "Communication" },
    { key: "followUp", label: "Follow Up" },
    { key: "createdBy", label: "Created By" },
    { key: "status", label: "Status" },
    { key: "applicationStatus", label: "Application Status" },
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





  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload = token.split(".")[1];
      const decoded: any = JSON.parse(atob(payload));
      setRole(decoded.role);
    } catch {
      console.error("Token decode error");
    }
  }, []);

  useEffect(() => {
    const fetchActiveData = async () => {
      try {
        const data = await getActivedata(
          selectedInstitution !== "all" ? selectedInstitution : undefined
        );
        setUserList(data.users || []);
        setInstitutions(
          (data.institutions || []).map((inst: any) => ({
            value: inst.instituteId,
            label: inst.name,
          }))
        );
      } catch (error: any) {
        console.error("Failed to fetch active data:", error.message);
      }
    };

    fetchActiveData();
  }, [selectedInstitution]);


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

        if ((decoded.role === "admin" || decoded.role === "user") && decoded.instituteId) {
          const data = await getaccesscontrol({
            role: decoded.role,
            instituteId: decoded.instituteId
          });
          const leadPermission = data.permissions?.find(
            (p: any) => p.moduleName === "Lead Manager"
          );
          if (
            leadPermission &&
            (leadPermission.view ||
              leadPermission.create ||
              leadPermission.edit ||
              leadPermission.delete ||
              leadPermission.filter ||
              leadPermission.download)
          ) {

            setUserpermisssion(leadPermission);
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



  // ------------------ FETCH LEADS ------------------
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeads({
        page: currentPage,
        limit: 10,
        instituteId: selectedInstitution !== "all" ? selectedInstitution : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        communication: selectedCommunication !== "all" ? selectedCommunication : undefined,
        candidateName: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: selectedUserId || undefined,
      });
      setLeads(res.docs || []);
      setTotalPages(res.totalPages || 1);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedInstitution, selectedStatus, selectedCommunication, searchTerm, startDate, endDate, selectedUserId]);


  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);



  const filteredLeads = (leads || []).map((lead: any) => {
    const obj: any = {};

    if (columnVisibility.instituteId) {
      obj.Institute = lead.institute?.name || lead.instituteId || "-";
    }

    if (columnVisibility.candidateName) {
      obj.Candidate = lead.candidateName || "-";
    }

    if (columnVisibility.program) {
      obj.Program = lead.program || "-";
    }

    if (columnVisibility.phoneNumber) {
      obj.Phone = lead.phoneNumber || "-";
    }

    if (columnVisibility.communication) {
      obj.Communication = lead.communication || "-";
    }

    if (columnVisibility.followUp) {
      obj.FollowUpDate = lead.followUpDate
        ? new Date(lead.followUpDate).toLocaleString()
        : "-";
    }

    if (columnVisibility.createdBy) {
      obj.CreatedBy = lead.creator
        ? `${lead.creator.firstname || ""} ${lead.creator.lastname || ""}`.trim()
        : "-";
    }

    if (columnVisibility.status) {
      obj.Status = lead.status || "-";
    }

    if (columnVisibility.applicationStatus) {
      obj.ApplicationStatus = lead.applicationId
        ? "Applied"
        : lead.status === "Interested"
          ? "Pending Application"
          : "Pending";
    }

    return obj;
  });



  // ------------------ CONFIRM ACTION ------------------
  const confirmAction = async () => {
    if (!selectedLead || !confirmType) return;
    try {
      if (confirmType === "delete") {
        await deleteLead(selectedLead._id);
        toast.success("Lead deleted successfully");
      } else if (confirmType === "status" && newStatus) {
        await updateLead(selectedLead._id, { status: newStatus });
        toast.success(`Status changed to "${newStatus}"`);
      }
      await fetchLeads();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setConfirmOpen(false);
      setConfirmType(null);
      setSelectedLead(null);
      setNewStatus(null);
    }
  };


  const handleDelete = (lead: Lead) => {
    setSelectedLead(lead);
    setConfirmType("delete");
    setConfirmOpen(true);
  };

  // ------------------ STATUS CHANGE ------------------
  const handleStatusChange = (lead: Lead, status: string) => {
    setSelectedLead(lead);
    setNewStatus(status);
    setConfirmType("status");
    setConfirmOpen(true);
  };

  // ------------------ COLUMNS ------------------

  const columns = [
    columnVisibility.instituteId && {
      header: "Institute",
      render: (lead: any) =>
        lead.institute?.name || lead.instituteId || "—",
    },

    columnVisibility.candidateName && {
      header: "Candidate",
      accessor: "candidateName",
    },

    columnVisibility.program && {
      header: "Program",
      accessor: "program",
    },

    columnVisibility.phoneNumber && {
      header: "Phone",
      accessor: "phoneNumber",
    },

    columnVisibility.communication && {
      header: "Communication",
      accessor: "communication",
    },

    columnVisibility.followUp && {
      header: "Follow Up",
      render: (lead: Lead) =>
        lead.followUpDate
          ? new Date(lead.followUpDate).toLocaleString()
          : "—",
    },

    columnVisibility.createdBy && {
      header: "Created By",
      render: (lead: any) =>
        lead.creator
          ? `${lead.creator.firstname || ""} ${lead.creator.lastname || ""}`
          : "—",
    },

    columnVisibility.status && {
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

    columnVisibility.applicationStatus && {
      header: "Application Status",
      render: (lead: Lead) => {
        if (lead.status === "Interested") {
          if (lead.applicationId) {
            // ✅ View existing application
            return (
              <div
                onClick={() =>
                  router.push(`/applications/${lead.applicationId}`)
                }
                className="flex items-center gap-2 text-emerald-600 cursor-pointer hover:text-emerald-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="font-medium">View</span>
              </div>
            );
          } else {
            // 🟦 Apply new application
            return (
              <div
                onClick={() => {
                  setSelectedLead(lead);
                  setIsOpen(true);
                }}
                className="flex items-center gap-2 text-indigo-600 cursor-pointer hover:text-indigo-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="font-medium">Apply</span>
              </div>
            );
          }
        }

        // ⏳ Default pending
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="italic">Pending</span>
          </div>
        );
      },
    },

    // Always visible (actions etc.)
    {
      header: "Actions",
      render: (lead: Lead) => (
        <div className="flex  gap-2">


          {(userpermission === "superadmin" || userpermission?.edit) && (<select
            onChange={(e) => handleStatusChange(lead, e.target.value)}
            defaultValue=""
            disabled={!!lead?.applicationId}
            className="border text-sm rounded-md py-1 px-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
          >
            <option value="">Change Status</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>)}


          {(userpermission === "superadmin" || userpermission?.view) && (

            <button
              onClick={() => {
                const limitedLead: any = {
                  candidateName: lead.candidateName,
                  phoneNumber: lead.phoneNumber,
                  program: lead.program,
                  status: lead.status,
                  communication: lead.communication,
                  followUpDate: lead.followUpDate
                    ? new Date(lead.followUpDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : '-',
                  createdAt: lead.createdAt
                    ? new Date(lead.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : '-',
                  dateOfBirth: lead.dateOfBirth
                    ? new Date(lead.dateOfBirth).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                    : '-',
                  country: lead.country || '-',
                  state: lead.state || '-',
                  city: lead.city || '-',
                  description: lead.description || '-',
                  instituteId: lead.instituteId || '-',
                };
                setSelectedLead(limitedLead);
                setViewOpen(true);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
            >
              <Eye className="w-4 h-4" />
            </button>)}


          {(userpermission === "superadmin" || userpermission?.edit) && (
            <button
              onClick={() => router.push(`/leads/editlead/${lead._id}`)}
              disabled={!!lead?.applicationId}
              className={`flex items-center justify-center px-3 py-1 rounded-md text-white transition-all duration-200
      ${lead?.applicationId
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              <Pencil className="w-4 h-4" />
            </button>)}

          {(userpermission === "superadmin" || userpermission?.delete) && (
            <button
              onClick={() => handleDelete(lead)}
              disabled={!!lead?.applicationId}
              className={`flex items-center justify-center px-3 py-1 rounded-md text-white transition-all duration-200
      ${lead?.applicationId
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : "bg-red-600 hover:bg-red-700"
                }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>)}
        </div>
      ),
    },
  ].filter(Boolean) as any;


  if (!hasPermission) {
    return (
      <div className="p-6 text-center text-red-600">
        You do not have permission to access this page. Please contact your superadmin.
      </div>
    );
  }
  // ------------------ RENDER ------------------
  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold">Leads</h1>
        </div>

        {/* FILTERS */}


        <div className="flex flex-wrap items-center gap-3 sm:justify-end w-full">

          {(userpermission === "superadmin" || userpermission?.filter) && (
            <>

              <button
                onClick={() => setCustomizeOpen(true)}
                className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
              >
                <Settings className="w-4 h-4" /> Customize Columns
              </button>
              {/* 🔍 Candidate Search */}
              <div className="relative w-full sm:w-48 md:w-60">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                />
              </div>

              {/* 🏫 Institution Filter */}


              {(userpermission === "superadmin" && <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full sm:w-auto border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              >
                <option value="all">All Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.value} value={inst.value}>
                    {inst.label}
                  </option>
                ))}
              </select>)}

              {/* 👤 User Select Filter */}

              {role !== "user" && (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full sm:w-auto border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                >
                  <option value="">Select User</option>

                  {userList.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.firstname} {user.lastname}
                    </option>
                  ))}
                </select>)}


              {/* 📊 Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full sm:w-auto border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              >
                <option value="all">All Status</option>
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              {/* 💬 Communication Filter */}
              <select
                value={selectedCommunication}
                onChange={(e) => setSelectedCommunication(e.target.value)}
                className="w-full sm:w-auto border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
              >
                <option value="all">All Communication</option>
                {communicationOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-auto border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                />

                {/* Center Icon */}
                <span className="flex items-center justify-center text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-auto border text-sm rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480] transition"
                />
              </div>
            </>
          )}

          {/* 📤 Export */}
          {(userpermission === "superadmin" || userpermission?.download) && (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-1 bg-green-700 hover:bg-green-800 text-white px-3 py-2 text-sm rounded-md w-full sm:w-auto transition"
            >
              <FileDown className="w-4 h-4" /> Export
            </button>)}

          {/* ➕ Add Lead */}
          {(userpermission === "superadmin" || userpermission?.create) && (
            <Link
              href="/leads/addlead"
              className="flex items-center justify-center gap-1 bg-gradient-to-b from-[#2a3970] to-[#5667a8] hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-md w-full sm:w-auto transition"
            >
              <Plus className="w-4 h-4" /> Add
            </Link>)}

        </div>
        <ExportModal
          open={open}
          title={"Leads"}
          onClose={() => setOpen(false)}
          data={filteredLeads}
        />
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* VIEW MODAL */}
      <ViewDialog open={viewOpen} title="Lead Details" data={selectedLead} onClose={() => setViewOpen(false)} />

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmType === "delete" ? "Delete Lead" : "Change Status"}
        message={
          confirmType === "delete"
            ? `Are you sure you want to delete "${selectedLead?.candidateName}"?`
            : `Change status of "${selectedLead?.candidateName}" to "${newStatus}"?`
        }
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />

      <ColumnCustomizeDialog
        open={customizeOpen}
        title="Customize Lead Columns"
        columns={columnOptions}
        selected={columnVisibility}
        onChange={(updated) => setColumnVisibility(prev => ({ ...prev, ...updated }))}
        onClose={() => setCustomizeOpen(false)}
      />

      <AnimatePresence>
        {isOpen && selectedLead && (
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
                {/* ✅ Pass the lead ID safely */}
                <AddapplicationForm refetch={fetchLeads} instituteId={selectedLead.instituteId} LeadId={selectedLead.leadId} onSuccess={() => setIsOpen(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



    </div>


  );
}
