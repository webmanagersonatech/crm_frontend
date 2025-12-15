"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  FileDown,
  HistoryIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/Tablecomponents";
import ViewDialog from "@/components/ViewDialog";
import ExportModal from "@/components/ExportModal";

import { getLoginHistories } from "@/app/lib/request/login-histroy";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";


interface LoginHistory {
  _id: string;
  userId: string;
  role: string;
  instituteId: string;
  lastLoginTime: string;
  userRole: string;
  user?: {
    firstname: string;
    lastname: string;
    email: string;
    role: string;
  };
}

export default function LoginHistoryPage() {
  const [histories, setHistories] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [institutions, setInstitutions] = useState<{ value: string; label: string }[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  /** 🔹 Fetch Login Histories */
  const fetchHistories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLoginHistories({
        page: currentPage,
        limit: 10,
        instituteId: selectedInstitution !== "all" ? selectedInstitution : undefined,
        role: selectedRole !== "all" ? selectedRole : undefined,
      });

      setHistories(res.histories.docs || []);
      setTotalPages(res.histories.totalPages || 1);
    } catch (err: any) {
      console.error("Error fetching login histories:", err.message);
      toast.error("Failed to load login histories");
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedInstitution, selectedRole]);

  useEffect(() => {
    fetchHistories();
  }, [fetchHistories]);

  /** 🔹 Load Institutions for Filter */
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

  /** 🔹 Table Columns */
  const columns = [
    {
      header: "Institute",
      render: (h: LoginHistory) => {
        const inst = institutions.find(inst => inst.value === h.instituteId);
        return inst ? inst.label : h.instituteId; // fallback to ID if not found
      }
    },
    {
      header: "Name",
      render: (h: LoginHistory) => h.user ? `${h.user.firstname} ${h.user.lastname}` : "-"
    },
    {
      header: "Email",
      render: (h: LoginHistory) => h.user?.email || "-"
    },
    {
      header: "Role",
      accessor: "role"
    },

    {
      header: "Last Login",
      render: (h: LoginHistory) => h.lastLoginTime ? new Date(h.lastLoginTime).toLocaleString() : "Never"
    },
    {
      header: "Actions",
      render: (h: any) => (
        <button
          onClick={() => {
            if (!h) return;

            // Map instituteId to name
            const institute = institutions.find(inst => inst.value === h.instituteId);

            const viewData = {
              instituteName: institute ? institute.label : h.instituteId,
              lastLoginTimeFormatted: h.lastLoginTime ? new Date(h.lastLoginTime).toLocaleString() : "Never",
              userFullName: h.user ? `${h.user.firstname} ${h.user.lastname}` : "-",
              userEmail: h.user?.email || "-",
              userRole: h.role || "-",
            };

            setSelected(viewData);
            setViewOpen(true);
          }}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
        >
          <Eye className="w-4 h-4" />
        </button>


      )
    },
  ];


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold">Login History</h1>
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {/* Institution Filter */}
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
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setCurrentPage(1);
            }}
            className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>

          {/* Export */}
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1 bg-green-700 hover:bg-green-800 text-white px-3 py-2 text-sm rounded-md"
          >
            <FileDown className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={histories}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* View Modal */}
      <ViewDialog
        open={viewOpen}
        title="Login History Details"
        data={selected}
        onClose={() => setViewOpen(false)}
      />

      {/* Export Modal */}
      {/* <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} /> */}
    </div>
  );
}
