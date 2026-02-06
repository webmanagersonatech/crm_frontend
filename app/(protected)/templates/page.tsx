"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Pencil, FileDown, Settings, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

import { DataTable } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewDialog from "@/components/ViewDialog";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";

import {
  getEmailTemplates,
  deleteEmailTemplateRequest,
  EmailTemplate,
} from "@/app/lib/request/emailTemplateRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { Column } from "@/components/Tablecomponents";

interface Template extends EmailTemplate {
  id: string;
  creator?: {
    firstname: string;
    lastname: string;
    role: string;
  };
  institute?: {
    name: string;
    instituteId: string;
  };
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [institutions, setInstitutions] = useState<{ value: string; label: string }[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selected, setSelected] = useState<Template | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [totalEntries, setTotalEntries] = useState(0);


  const [columnVisibility, setColumnVisibility] = useState({
    title: true,
    description: true,
    institute: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | null>(null);

  const columnOptions = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    ...(userpermission === "superadmin"
      ? [{ key: "institute", label: "Institute" }]
      : []),
    { key: "createdBy", label: "Created By" },
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
          const templatePermission = data.permissions?.find(
            (p: any) => p.moduleName === "Email templates"
          );
          if (
            templatePermission &&
            (templatePermission.view ||
              templatePermission.create ||
              templatePermission.edit ||
              templatePermission.delete ||
              templatePermission.filter ||
              templatePermission.download)
          ) {

            setUserpermisssion(templatePermission);
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

  /** 🔹 Fetch Templates */
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmailTemplates({
        page: currentPage,
        title: searchTerm,
        instituteId: selectedInstitution !== "all" ? selectedInstitution : undefined,
      });
      setTemplates(res.docs || []);
      setTotalPages(res.totalPages || 1);
      setTotalEntries(res?.totalDocs || 0);
    } catch (err: any) {
      console.error("Error fetching templates:", err.message);
      toast.error("Failed to fetch email templates");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedInstitution]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (userpermission !== "superadmin") return;
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
  }, [userpermission]);

  /** 🔹 Confirm Actions */
  const handleDelete = (template: Template) => {
    setSelected(template);
    setConfirmType("delete");
    setConfirmOpen(true);
  };

  const confirmAction = async () => {
    if (!selected) return;
    try {
      if (confirmType === "delete") {
        await deleteEmailTemplateRequest(selected.id);
        toast.success("Template deleted successfully!");
      }
      fetchTemplates();
    } catch (err: any) {
      console.error("Action failed:", err);
      toast.error(err?.message || "Something went wrong!");
    } finally {
      setConfirmOpen(false);
      setSelected(null);
      setConfirmType(null);
    }
  };

  /** 🔹 Table Columns */
  const columns = [
    columnVisibility.title && {
      header: "Title",
      accessor: "title",
    },
    columnVisibility.description && {
      header: "Description",
      render: (t: Template) => (
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: t.description || "-" }}
        />
      ),
    },
    ...(userpermission === "superadmin" && columnVisibility.institute
      ? [{
        header: "Institute",
        render: (t: Template) => t.institute?.name || "-",
      }]
      : []),

    columnVisibility.createdBy && {
      header: "Created By",
      render: (t: Template) =>
        t.creator ? `${t.creator.firstname} ${t.creator.lastname}` : "-",
    },
    columnVisibility.createdAt && {
      header: "Created At",
      render: (t: Template) => new Date(t.createdAt || "").toLocaleString() || "-",
    },

    {
      header: "Actions",
      render: (t: Template) => (
        <div className="flex gap-2">


          {(userpermission === "superadmin" || userpermission?.edit) && (<Link
            href={`/templates/edittemplate/${t.id}` as any}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
          >
            <Pencil className="w-4 h-4" />
          </Link>)}

          {(userpermission === "superadmin" || userpermission?.delete) && (<button
            onClick={() => handleDelete(t)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md"
          >
            <Trash2 className="w-4 h-4" />
          </button>)}

        </div>
      ),
    },
  ].filter(Boolean) as Column<Template>[];

  const filteredData = templates.map((t) => {
    const obj: any = {};
    if (columnVisibility.title) obj.Title = t.title || "-";
    if (columnVisibility.description) obj.Description = t.description || "-";
    if (userpermission === "superadmin" && columnVisibility.institute) {
      obj.Institute = t.institute?.name || "-";
    }
    if (columnVisibility.createdBy)
      obj.CreatedBy = t.creator
        ? `${t.creator.firstname} ${t.creator.lastname}`
        : "-";
    if (columnVisibility.createdAt)
      obj.CreatedAt = t.createdAt ? new Date(t.createdAt).toLocaleString() : "-";
    if (columnVisibility.updatedAt)
      obj.UpdatedAt = t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "-";
    return obj;
  });
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Plus className="w-6 h-6 text-blue-700" /> Email Templates
        </h1>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {(userpermission === "superadmin" || userpermission?.filter) && (
            <>
              {/* Customize Columns */}
              <button
                onClick={() => setCustomizeOpen(true)}
                className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
              >
                <Settings className="w-4 h-4" /> Customize Columns
              </button>

              {/* Search */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-56 pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                />
              </div>

              {/* Institution Filter */}
              {(userpermission === "superadmin" && <select
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

            </>

          )}

          {/* Export */}

          {(userpermission === "superadmin" || userpermission?.download) && (<button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1 bg-green-700 hover:bg-green-800 text-white px-3 py-2 text-sm rounded-md"
          >
            <FileDown className="w-4 h-4" /> Export
          </button>)}



          {/* Add Template */}
          {(userpermission === "superadmin" || userpermission?.create) && (<Link
            href="/templates/addtemplate"
            className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
          >
            <Plus className="w-4 h-4" /> Add New
          </Link>)}
        </div>

        <ExportModal
          open={exportOpen}
          title="email-templates"
          onClose={() => setExportOpen(false)}
          data={filteredData}
        />
      </div>

      <DataTable
        columns={columns}
        data={templates}
        loading={loading}
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <ViewDialog
        open={viewOpen}
        title="Template Details"
        data={selected}
        onClose={() => setViewOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Template"
        message={`Are you sure you want to delete "${selected?.title}"?`}
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />

      <ColumnCustomizeDialog
        open={customizeOpen}
        title="Customize Columns"
        columns={columnOptions}
        selected={columnVisibility}
        onChange={(updated) =>
          setColumnVisibility((prev) => ({ ...prev, ...updated }))
        }
        onClose={() => setCustomizeOpen(false)}
      />
    </div>
  );
}
