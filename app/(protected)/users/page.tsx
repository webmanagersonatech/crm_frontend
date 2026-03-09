"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Eye,
  FileDown,
  Settings,
  Plus,
  Search,
  Trash2,
  User2,
} from "lucide-react";
import {
  listUsersRequest,
  deleteUserRequest,
  toggleTempAdminRequest,
  toggleUserStatusRequest,
} from "@/app/lib/request/authRequest";
import { DataTable } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import ViewDialog from "@/components/ViewDialog";
import ExportModal from "@/components/ExportModal";
import { toast } from "react-toastify";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import { Column } from "@/components/Tablecomponents";

interface User {
  _id: string;
  firstname: string;
  lastname: string;
  username: string;
  instituteId: string;
  email: string;
  mobileNo: string;
  designation: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  lastLoginTimeDate?: string;
  userType?: string;
  tempAdminAccess?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [institutions, setInstitutions] = useState<{ value: string; label: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selected, setSelected] = useState<User | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adminConfirmOpen, setAdminConfirmOpen] = useState(false);

  const [selectedAdminUser, setSelectedAdminUser] = useState<User | null>(null);
  const [tempAdminAccess, setTempAdminAccess] = useState(false);
  const [rowTempAdmin, setRowTempAdmin] = useState<Record<string, boolean>>({});
  const [viewOpen, setViewOpen] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    username: true,
    email: true,
    mobile: true,
    role: true,
    status: true,
    designation: true,
    instituteId: true,
  });

  const columnOptions = [
    { key: "name", label: "Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },

  ];

  const [confirmType, setConfirmType] = useState<"delete" | "toggle" | null>(
    null
  );

  const [exportOpen, setExportOpen] = useState(false);
  const filteredUsers = (users || []).map((user) => {
    const obj: any = {};

    if (columnVisibility.name) {
      obj.FullName = `${user.firstname || ""} ${user.lastname || ""}`.trim() || "-";
    }

    if (columnVisibility.username) {
      obj.Username = user.username || "-";
    }

    if (columnVisibility.email) {
      obj.Email = user.email || "-";
    }

    if (columnVisibility.mobile) {
      obj.Mobile = user.mobileNo || "-";
    }

    if (columnVisibility.designation) {
      obj.Designation = user.designation || "-";
    }

    if (columnVisibility.role) {
      obj.Role = user.role || "-";
    }

    if (columnVisibility.instituteId) {
      obj.InstituteID = user.instituteId || "-";
    }

    if (columnVisibility.status) {
      obj.Status = user.status || "-";
    }

    return obj;
  });



  /** 🔹 Fetch Users */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listUsersRequest({
        page: currentPage,
        search: searchTerm,
        status: statusFilter,
        role: selectedRole,
        instituteId: selectedInstitution,
      });

      const fetchedUsers = res.users.docs || [];

      setUsers(fetchedUsers);
      setTotalPages(res.users.totalPages || 1);
      setTotalEntries(res.users?.totalDocs || 0);

      // ✅ Sync toggle state with DB
      const tempState: Record<string, boolean> = {};
      fetchedUsers.forEach((user: User) => {
        tempState[user._id] = user.tempAdminAccess ?? false;
      });

      setRowTempAdmin(tempState);

    } catch (err: any) {
      console.error("Error fetching users:", err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, selectedRole, selectedInstitution]);

  useEffect(() => {

    fetchUsers();
  }, [fetchUsers]);

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
  const handleAdminToggle = (user: User) => {
    setSelectedAdminUser(user);
    setAdminConfirmOpen(true);
  };

  const confirmAdminToggle = async () => {
    if (!selectedAdminUser) return;

    try {
      const newValue = !rowTempAdmin[selectedAdminUser._id];

      // 🔥 Call backend API
      await toggleTempAdminRequest(selectedAdminUser._id);

      // Update UI
      setRowTempAdmin((prev) => ({
        ...prev,
        [selectedAdminUser._id]: newValue,
      }));

      toast.success(
        newValue
          ? "Admin privileges granted"
          : "Admin privileges removed"
      );

      // refresh table
      await fetchUsers();

    } catch (err) {
      toast.error("Failed to update admin access");
    } finally {
      setAdminConfirmOpen(false);
      setSelectedAdminUser(null);
    }
  };
  /** 🔹 Confirm Actions */
  const handleDelete = (user: User) => {
    setSelected(user);
    setConfirmType("delete");
    setConfirmOpen(true);
  };

  const handleToggle = (user: User) => {
    setSelected(user);
    setConfirmType("toggle");
    setConfirmOpen(true);
  };

  /** 🔹 Confirmed Delete/Toggle (Superadmin only) */
  const confirmAction = async () => {
    if (!selected) return;
    try {
      if (confirmType === "delete") {
        await deleteUserRequest(selected._id);
        toast.success("User deleted successfully!");

      } else if (confirmType === "toggle") {
        const newStatus = selected.status === "active" ? "inactive" : "active";
        await toggleUserStatusRequest(selected._id, newStatus);
        toast.success(`User status changed to ${newStatus}!`);
      }

      await fetchUsers();

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
    columnVisibility.name && {
      header: "Name",
      render: (u: User) => `${u.firstname} ${u.lastname}`,
    },

    columnVisibility.username && {
      header: "Username",
      accessor: "username",
    },

    columnVisibility.email && {
      header: "Email",
      accessor: "email",
    },

    columnVisibility.mobile && {
      header: "Mobile",
      accessor: "mobileNo",
    },

    columnVisibility.role && {
      header: "Role",
      accessor: "role",
    },

    columnVisibility.status && {
      header: "Status",
      render: (u: User) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === "active"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
            }`}
        >
          {u.status}
        </span>
      ),
    },
    {
      header: "Act as Admin",
      accessor: "tempAdminAccess",
      render: (user: User) =>
        user.role === "user" && user.userType === "our_user" || user.tempAdminAccess === true ? (
          <div className="flex items-center gap-2">

            {/* Toggle */}
            <button
              onClick={() => handleAdminToggle(user)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition 
          ${rowTempAdmin[user._id] ? "bg-red-600" : "bg-gray-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition
            ${rowTempAdmin[user._id] ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>

            {/* Responsive Text */}
            <div className="text-xs sm:text-sm md:text-base font-medium text-gray-700">
              {/* Mobile */}
              <span className="sm:hidden">
                {rowTempAdmin[user._id] ? "Admin" : "User"}
              </span>

              {/* Tablet */}
              <span className="hidden sm:inline md:hidden">
                {rowTempAdmin[user._id] ? "Admin Mode" : "User Mode"}
              </span>

              {/* Desktop */}
              <span className="hidden md:inline">
                {rowTempAdmin[user._id]
                  ? "Admin Privileges Active"
                  : "Grant Admin Access"}
              </span>
            </div>

            {/* Active indicator */}
            {rowTempAdmin[user._id] && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs sm:text-sm">Not available</span>
        ),
    },
    // ❗ Always visible — cannot be hidden
    {
      header: "Actions",
      render: (user: User) => (
        <div className="flex gap-2">

          <button
            onClick={() => handleToggle(user)}
            className={`w-24 px-3 py-1 rounded-md text-center transition ${user.status === "active"
              ? "bg-red-100 text-red-700 border border-red-400 hover:bg-red-200"
              : "bg-green-100 text-green-700 border border-green-400 hover:bg-green-200"
              }`}
          >
            {user.status === "active" ? "Deactivate" : "Activate"}
          </button>

          <button
            onClick={() => {
              const viewData: any = {
                firstname: user.firstname,
                lastname: user.lastname,
                username: user.username,
                email: user.email,
                mobileNo: user.mobileNo,
                designation: user.designation,
                role: user.role,
                status: user.status,
                lastLoginTimeDate: user.lastLoginTimeDate
                  ? new Date(user.lastLoginTimeDate).toLocaleString()
                  : "Never",
                createdAt: new Date(user.createdAt).toLocaleString(),
                updatedAt: new Date(user.updatedAt).toLocaleString(),
              };
              setSelected(viewData);
              setViewOpen(true);
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md"
          >
            <Eye className="w-4 h-4" />
          </button>


          {user.role !== "superadmin" && (
            <button
              onClick={() => handleDelete(user)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ].filter(Boolean) as Column<User>[];// remove hidden columns


  return (
    <div className="p-6 space-y-6">
      {/*  Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <User2 className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-semibold">Users</h1>



        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">

          {/* Left side - Filters Group */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 flex-1">
            {/* Customize Columns Button */}
            <button
              onClick={() => setCustomizeOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] hover:from-[#2a3970] hover:to-[#4a5d9e] text-white rounded-lg transition-all shadow-sm whitespace-nowrap order-1 w-full sm:w-auto"
            >
              <Settings className="w-4 h-4" />
              <span>Customize</span>
              <span className="hidden lg:inline">Columns</span>
            </button>

            {/* Search Input - Grows on large screens */}
            <div className="relative flex-1 min-w-[200px] lg:min-w-[250px] order-2 w-full sm:w-auto">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#3a4480] focus:border-transparent bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
            </div>

            {/* Institution Filter - Fixed width */}
            <select
              value={selectedInstitution}
              onChange={(e) => {
                setSelectedInstitution(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#3a4480] focus:border-transparent bg-white dark:bg-gray-800 order-3 w-full sm:w-[160px]"
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
              className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#3a4480] focus:border-transparent bg-white dark:bg-gray-800 order-4 w-full sm:w-[130px]"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#3a4480] focus:border-transparent bg-white dark:bg-gray-800 order-5 w-full sm:w-[130px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Right side - Action Buttons Group */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:ml-auto order-last">
            {/* Export Button */}
            <button
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm bg-gradient-to-b from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white whitespace-nowrap"
            >
              <FileDown className="w-4 h-4" />
              <span>Export</span>
            </button>

            {/* Add User Button */}
            <Link
              href="/users/adduser"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] hover:from-[#2a3970] hover:to-[#4a5d9e] text-white whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add New</span>
            </Link>
          </div>
        </div>
        {/*  Export Modal */}
        <ExportModal
          open={exportOpen}
          title={"users"}
          onClose={() => setExportOpen(false)}
          data={filteredUsers}
        />
      </div>

      <DataTable
        columns={columns}
        totalEntries={totalEntries}
        data={users}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />


      <ViewDialog
        open={viewOpen}
        title="User Details"
        data={selected}
        onClose={() => setViewOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={
          confirmType === "delete" ? "Delete User" : "Change User Status"
        }
        message={
          confirmType === "delete"
            ? `Are you sure you want to delete "${selected?.firstname} ${selected?.lastname}"?`
            : `Are you sure you want to ${selected?.status === "active" ? "deactivate" : "activate"
            } "${selected?.firstname} ${selected?.lastname}"?`
        }
        onConfirm={confirmAction}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={adminConfirmOpen}
        title="Admin Access"
        message={
          rowTempAdmin[selectedAdminUser?._id || ""]
            ? `Remove admin access for "${selectedAdminUser?.firstname} ${selectedAdminUser?.lastname}"?`
            : `Grant temporary admin access for "${selectedAdminUser?.firstname} ${selectedAdminUser?.lastname}"?`
        }
        onConfirm={confirmAdminToggle}
        onCancel={() => setAdminConfirmOpen(false)}
      />

      <ColumnCustomizeDialog
        open={customizeOpen}
        title="Customize Columns"
        columns={columnOptions}
        selected={columnVisibility}
        onChange={(updated) => setColumnVisibility(prev => ({ ...prev, ...updated }))}
        onClose={() => setCustomizeOpen(false)}
      />

    </div>
  );
}
