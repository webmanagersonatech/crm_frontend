"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, FileDown, Settings, Search } from "lucide-react";
import toast from "react-hot-toast";

import { DataTable } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";


import {
  getDynamicForms,
  deleteDynamicForm,
  publishDynamicForm,
  DynamicForm,
} from "@/app/lib/request/dynamicfromRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import { Column } from "@/components/Tablecomponents";
import Modal from "@/components/Modal";

export default function DynamicFormsPage() {
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [institutions, setInstitutions] = useState<{ value: string; label: string }[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selectedForm, setSelectedForm] = useState<DynamicForm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | "publish" | "unpublish" | null>(null);
  const [userPermission, setUserPermission] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [academicYear, setAcademicYear] = useState("");

  const [columnVisibility, setColumnVisibility] = useState({
    title: true,
    description: true,
    institute: true,
    createdBy: true,
    createdAt: true,
    published: true,
  });
  const [exportOpen, setExportOpen] = useState(false);
  const columnOptions = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "institute", label: "Institute" },
    { key: "createdBy", label: "Created By" },
    { key: "createdAt", label: "Created At" },
    { key: "published", label: "Published" },
  ];

  /** 🔹 Fetch Permissions */
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

        if ((decoded.role === "admin" || decoded.role === "user") && decoded.instituteId) {
          const data = await getaccesscontrol({
            role: decoded.role,
            instituteId: decoded.instituteId,
          });
          const permission = data.permissions?.find(
            (p: any) => p.moduleName === "Dynamic Forms"
          );
          if (
            permission &&
            (permission.view || permission.create || permission.edit || permission.delete || permission.download)
          ) {
            setUserPermission(permission);
            setHasPermission(true);
          } else {
            setUserPermission(null);
            setHasPermission(false);
          }
        } else if (decoded.role === "superadmin") {
          setUserPermission("superadmin");
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      } catch (err) {
        console.error(err);
        setHasPermission(false);
      }
    };
    fetchPermissions();
  }, []);

  /** 🔹 Fetch Forms */
  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDynamicForms({
        page: currentPage,
        title: searchTerm,
        instituteId: selectedInstitution !== "all" ? selectedInstitution : undefined,
      });
      setForms(res.docs || []);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to fetch dynamic forms");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedInstitution]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  /** 🔹 Load Institutions if superadmin */
  useEffect(() => {
    if (userPermission !== "superadmin") return;
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
  }, [userPermission]);

  /** 🔹 Actions */
  const handlePublish = (form: DynamicForm) => {
    setSelectedForm(form);
    setAcademicYear("");
    setPublishOpen(true);
  };

  const handleUnpublish = (form: DynamicForm) => {
    setSelectedForm(form);
    setUnpublishOpen(true);
  };

  const handleDelete = (form: DynamicForm) => {
    setSelectedForm(form);
    setConfirmType("delete");
    setConfirmOpen(true);
  };




  const confirmAction = async () => {
    if (!selectedForm) return;
    try {
      if (confirmType === "delete") {
        await deleteDynamicForm(selectedForm._id!);
        toast.success("Form deleted successfully!");
      }

      fetchForms();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setConfirmOpen(false);
      setSelectedForm(null);
      setConfirmType(null);
      setAcademicYear("");
    }
  };

  /** 🔹 Table Columns */
  const columns = [
    columnVisibility.title && { header: "Title", accessor: "title" },
    columnVisibility.description && {
      header: "Description",
      render: (f: DynamicForm) => <div dangerouslySetInnerHTML={{ __html: f.description || "-" }} />
    },
    columnVisibility.institute && {
      header: "Institute",
      render: (f: any) => f.institute?.name || "-"
    },
    columnVisibility.createdBy && {
      header: "Created By",
      render: (f: DynamicForm) => f.creator ? `${f.creator.firstname} ${f.creator.lastname}` : "-"
    },
    columnVisibility.createdAt && {
      header: "Created At",
      render: (f: DynamicForm) => f.createdAt ? new Date(f.createdAt).toLocaleString() : "-"
    },
    columnVisibility.published && {
      header: "Published",
      render: (f: DynamicForm) => f.published ? "Yes" : "No"
    },
    {
      header: "Actions",
      render: (f: DynamicForm) => (
        <div className="flex gap-2">
          {/* Publish Button */}
          {(userPermission === "superadmin" || userPermission?.edit) && (
            <button
              className={`${f.published
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-green-600 hover:bg-green-700"
                } text-white px-3 py-1 rounded-md transition w-28 text-center`}

              onClick={() =>
                f.published ? handleUnpublish(f) : handlePublish(f)
              }
            >
              {f.published ? "Unpublish" : "Publish"}
            </button>


          )}

          {/* Edit Button */}
          {(userPermission === "superadmin" || userPermission?.edit) && (
            <Link
              href={`/dynamic-forms/editdynamicform/${f._id}` as any}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md"
            >
              <Pencil className="w-4 h-4" />
            </Link>
          )}

          {/* Delete Button */}
          {(userPermission === "superadmin" || userPermission?.delete) && (
            <button
              onClick={() => handleDelete(f)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md"
            >
              Delete
            </button>
          )}
        </div>
      )
    }

  ].filter(Boolean) as Column<DynamicForm>[];

  /** 🔹 Export Data */


  const filteredData = forms.map((t: any) => {
    const obj: any = {};
    if (columnVisibility.title) obj.Title = t.title || "-";
    if (columnVisibility.description) obj.Description = t.description || "-";
    if (columnVisibility.institute) obj.Institute = t.institute?.name || "-";
    if (columnVisibility.createdBy)
      obj.CreatedBy = t.creator
        ? `${t.creator.firstname} ${t.creator.lastname}`
        : "-";
    if (columnVisibility.createdAt)
      obj.CreatedAt = t.createdAt ? new Date(t.createdAt).toLocaleString() : "-";
    if (columnVisibility.published)
      obj.Published = t.published ? "Yes" : "No";
    return obj;
  });
  if (!hasPermission) {
    return <div className="p-6 text-center text-red-600">You do not have permission to access this page.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Plus className="w-6 h-6 text-blue-700" /> Dynamic Forms
        </h1>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">

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
              placeholder="Search by title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-56 pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            />
          </div>

          {(userPermission === "superadmin" && <select
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


          {(userPermission === "superadmin" || userPermission?.download) && (<button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1 bg-green-700 hover:bg-green-800 text-white px-3 py-2 text-sm rounded-md"
          >
            <FileDown className="w-4 h-4" /> Export
          </button>)}

          {(userPermission === "superadmin" || userPermission?.create) && (
            <Link
              href="/dynamic-forms/adddynamicform"
              className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
            >
              <Plus className="w-4 h-4" /> Add New
            </Link>
          )}
        </div>

        <ExportModal
          open={exportOpen}
          title="Dynamic-forms"
          onClose={() => setExportOpen(false)}
          data={filteredData}
        />
      </div>

      <DataTable
        columns={columns}
        data={forms}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={
          confirmType === "delete"
            ? "Delete Form"
            : confirmType === "unpublish"
              ? "Unpublish Form"
              : "Publish Form"
        }

        message={
          confirmType === "delete"
            ? `Are you sure you want to delete "${selectedForm?.title}"?`
            : confirmType === "unpublish"
              ? `Are you sure you want to unpublish "${selectedForm?.title}"?`
              : `Are you sure you want to publish "${selectedForm?.title}"?`
        }

        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />

      <ColumnCustomizeDialog
        open={customizeOpen}
        title="Customize Columns"
        columns={columnOptions}
        selected={columnVisibility}
        onChange={(updated) => setColumnVisibility((prev) => ({ ...prev, ...updated }))}
        onClose={() => setCustomizeOpen(false)}

      />

      <Modal open={publishOpen} title="Publish Form" onClose={() => setPublishOpen(false)}>
        <div >

          <h2 className="text-xl font-semibold mb-2">Publish Form</h2>
          <p className="text-gray-600 mb-4">
            Please enter the academic year to publish{" "}
            <b>{selectedForm?.title}</b>
          </p>

          <label className="block text-sm font-medium mb-1">
            Academic Year
          </label>
          <input
            type="text"
            placeholder="2019 - 2023"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-6"
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setPublishOpen(false)}
              className="px-4 py-2 border rounded-md"
            >
              Cancel
            </button>

            <button
              disabled={!academicYear.trim()}
              onClick={async () => {
                try {
                  await publishDynamicForm(
                    selectedForm!._id!,
                    true,
                    academicYear
                  );

                  toast.success("Form published successfully");
                  fetchForms();
                } catch {
                  toast.error("Failed to publish");
                } finally {
                  setPublishOpen(false);
                  setSelectedForm(null);
                  setAcademicYear("");
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50"
            >
              Publish
            </button>
          </div>
        </div>
      </Modal>


      <Modal
        open={unpublishOpen}
        title="Unpublish Form"
        onClose={() => setUnpublishOpen(false)}
      >
        <div >

          <h2 className="text-xl font-semibold mb-2">Unpublish Form</h2>
          <p className="text-gray-600 mb-6">
            Are you sure you want to unpublish{" "}
            <b>{selectedForm?.title}</b>?
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setUnpublishOpen(false)}
              className="px-4 py-2 border rounded-md"
            >
              Cancel
            </button>

            <button
              onClick={async () => {
                try {
                  await publishDynamicForm(selectedForm!._id!, false);
                  toast.success("Form unpublished successfully");
                  fetchForms();
                } catch {
                  toast.error("Failed to unpublish");
                } finally {
                  setUnpublishOpen(false);
                  setSelectedForm(null);
                }
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md"
            >
              Unpublish
            </button>
          </div>
        </div>
      </Modal>


    </div>
  );
}
