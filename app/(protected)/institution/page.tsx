"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Pencil,
  Trash2,
  Plus,
  Eye,
  FileDown,
  Building2,
  Search,
  Settings,
} from "lucide-react";
import {
  getAllInstitutions,
  deleteInstitution,
  updateInstitution,
} from "@/app/lib/request/institutionRequest";
import { DataTable } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewDialog from "@/components/ViewDialog";
import ExportModal from "@/components/ExportModal";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { Column } from "@/components/Tablecomponents";
import toast from "react-hot-toast";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | "toggle" | null>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);

  const [columnVisibilityInstitute, setColumnVisibilityInstitute] = useState({
    instituteId: true,
    name: true,
    email: true,
    phoneNo: true,
    status: true,
  });

  const columnOptionsInstitute = [
    { key: "instituteId", label: "Institute ID" },
    { key: "name", label: "Institution Name" },
    { key: "email", label: "Email" },
    { key: "phoneNo", label: "Phone" },
    { key: "status", label: "Status" },
  ];
  const filteredInstitutions = (institutions || []).map((inst: any) => {
    const obj: any = {};

    if (columnVisibilityInstitute.instituteId) {
      obj.InstituteId = inst.instituteId || "-";
    }

    if (columnVisibilityInstitute.name) {
      obj.InstitutionName = inst.name || "-";
    }

    if (columnVisibilityInstitute.email) {
      obj.Email = inst.email || "-";
    }

    if (columnVisibilityInstitute.phoneNo) {
      obj.Phone = inst.phoneNo || "-";
    }

    if (columnVisibilityInstitute.status) {
      obj.Status = inst.status || "-";
    }

    return obj;
  });



  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
      });
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);

      const data = await getAllInstitutions({
        page: currentPage,
        search: searchTerm,
        status: statusFilter,
      });

      setInstitutions(data?.institutions?.docs || []);
    } finally {
      setLoading(false);
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

        if ((decoded.role === "admin" || decoded.role === "user") && decoded.instituteId) {
          const data = await getaccesscontrol({
            userId: decoded.id,
            instituteId: decoded.instituteId
          });

          const institutionPermission = data.permissions?.find(
            (p: any) => p.moduleName === "Institution"
          );

          if (
            institutionPermission &&
            (institutionPermission.view ||
              institutionPermission.create ||
              institutionPermission.edit ||
              institutionPermission.delete ||
              institutionPermission.filter ||
              institutionPermission.download)
          ) {
            // At least one permission is true → has access
            setUserpermisssion(institutionPermission);
            setHasPermission(true);
          } else {
            // No permission at all → show message
            setUserpermisssion(null);
            setHasPermission(false);
          }
        } else if (decoded.role === "superadmin") {
          // Superadmin has all access
          setUserpermisssion("superadmin");
          setHasPermission(true);
        } else {
          // Unknown role → no permission
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
    fetchInstitutions();
  }, [currentPage, searchTerm, statusFilter]);

  const handleDelete = (inst: any) => {
    setSelected(inst);
    setConfirmType("delete");
    setConfirmOpen(true);
  };

  const handleToggle = (inst: any) => {
    setSelected(inst);
    setConfirmType("toggle");
    setConfirmOpen(true);
  };

  const confirmAction = async () => {
    if (!selected) return;

    const loadingId = toast.loading(
      confirmType === "delete"
        ? "Deleting institution..."
        : "Updating status..."
    );

    try {
      if (confirmType === "delete") {
        await deleteInstitution(selected._id);
        toast.success("Institution deleted successfully ✅");
      } else if (confirmType === "toggle") {
        const newStatus =
          selected.status === "active" ? "inactive" : "active";

        await updateInstitution(selected._id, { status: newStatus });

        toast.success(
          `Institution ${newStatus === "active" ? "activated" : "deactivated"
          } successfully ✅`
        );
      }

      await fetchInstitutions();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Something went wrong. Please try again ❌"
      );
    } finally {
      toast.dismiss(loadingId);
      setConfirmOpen(false);
      setSelected(null);
      setConfirmType(null);
    }
  };



  const columns = [
    columnVisibilityInstitute.instituteId && {
      header: "Institute ID",
      accessor: "instituteId",
    },

    columnVisibilityInstitute.name && {
      header: "Institution Name",
      accessor: "name",
    },

    columnVisibilityInstitute.email && {
      header: "Email",
      accessor: "email",
    },

    columnVisibilityInstitute.phoneNo && {
      header: "Phone",
      accessor: "phoneNo",
    },

    columnVisibilityInstitute.status && {
      header: "Status",
      accessor: "status",
    },
    {
      header: "Action",
      render: (inst: any) => (
        <div className="flex gap-2">
          {userpermission === "superadmin" || userpermission?.edit ? (<button
            onClick={() => handleToggle(inst)}
            className={`w-28 px-3 py-1 rounded-md text-center ${inst.status === "active"
              ? "bg-red-300/50 text-red-700 border border-red-400 hover:bg-red-300"
              : "bg-green-300/50 text-green-700 border border-green-400 hover:bg-green-300"
              }`}
          >
            {inst.status === "active" ? "Deactivate" : "Activate"}
          </button>) : null}


          {userpermission === "superadmin" || userpermission?.view ? (
            <button
              onClick={() => {
                const limitedData = {
                  name: inst.name,
                  email: inst.email,
                  phone: inst.phoneNo,
                  location: inst.location,
                  contactPerson: inst.contactPerson,
                  country: inst.country,
                  state: inst.state,
                  instituteType: inst.instituteType,
                  status: inst.status,
                };
                setSelected(limitedData);
                setViewOpen(true);
              }}
              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
            >
              <Eye className="w-4 h-4" />
            </button>
          ) : null}


          {userpermission === "superadmin" || userpermission?.edit ? (
            <Link
              href={`/institution/editinstitution?id=${inst._id}` as any}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
            >
              <Pencil className="w-4 h-4" />
            </Link>
          ) : null}

          {userpermission === "superadmin" || userpermission?.delete ? (
            <button
              onClick={() => handleDelete(inst)
              }
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md"
            >
              <Trash2 className="w-4 h-4" />
            </button >
          ) : null}
        </div >
      ),
    },
  ].filter(Boolean) as Column<any>[];;


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
          <Building2 className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-semibold">Institutions</h1>
        </div>


        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {userpermission === "superadmin" || userpermission?.filter
            ? (
              <>

                <button
                  onClick={() => setCustomizeOpen(true)}
                  className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
                >
                  <Settings className="w-4 h-4" /> Customize Columns
                </button>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full sm:w-48 md:w-64 pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480] "
                  />
                </div>


                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480] "
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </>
            ) : null}

          {/* Export */}
          {userpermission === "superadmin" || userpermission?.download ? (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-1 w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white px-3 py-2 text-sm rounded-md"
            >
              <FileDown className="w-4 h-4" /> Export
            </button>
          ) : null}

          {userpermission === "superadmin" || userpermission?.create ? (<Link
            href="/institution/addinstitution"
            className="flex items-center justify-center gap-1 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-md"
          >
            <Plus className="w-4 h-4" /> Add New
          </Link>
          ) : null}

        </div>
        <ExportModal
          open={open}
          title={"Institution"}
          onClose={() => setOpen(false)}
          data={filteredInstitutions}
        />

      </div>



      <DataTable
        columns={columns}
        data={institutions}
        loading={loading}
        currentPage={currentPage}
        totalPages={1}
        onPageChange={setCurrentPage}
      />


      <ViewDialog
        open={viewOpen}
        title="Institution Details"
        data={selected}
        onClose={() => setViewOpen(false)}
      />

      <ColumnCustomizeDialog
        open={customizeOpen}
        title="Customize Institute Columns"
        columns={columnOptionsInstitute}
        selected={columnVisibilityInstitute}
        onChange={(updated) => setColumnVisibilityInstitute(prev => ({ ...prev, ...updated }))}
        onClose={() => setCustomizeOpen(false)}
      />


      <ConfirmDialog
        open={confirmOpen}
        title={confirmType === "delete" ? "Delete Institution" : "Change Status"}
        message={
          confirmType === "delete"
            ? `Are you sure you want to delete "${selected?.name}"?`
            : `Are you sure you want to ${selected?.status === "active" ? "deactivate" : "activate"
            } "${selected?.name}"?`
        }
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />


    </div>
  );
}
