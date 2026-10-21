"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  GraduationCap,
  Search,
  Settings,
  KeyRound,
  X,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

import { DataTable, Column } from "@/components/Tablecomponents";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";

import {
  getNewAndAdmittedStudentsRequest,
  NewAndAdmittedStudent,
  adminChangeStudentPasswordRequest,
} from "@/app/lib/request/studentRequest";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";

/* ============================================================
   Password strength validator
   - min 8 chars
   - no spaces
   - at least 1 uppercase, 1 lowercase, 1 number, 1 special char
============================================================ */
function validatePassword(pwd: string): string | null {
  if (!pwd) return "Password is required.";
  if (pwd.length < 8) return "Password must be at least 8 characters.";
  if (/\s/.test(pwd)) return "Password must not contain spaces.";
  if (!/[A-Z]/.test(pwd))
    return "Password must contain at least 1 uppercase letter.";
  if (!/[a-z]/.test(pwd))
    return "Password must contain at least 1 lowercase letter.";
  if (!/[0-9]/.test(pwd))
    return "Password must contain at least 1 number.";
  if (!/[^A-Za-z0-9]/.test(pwd))
    return "Password must contain at least 1 special character.";
  return null;
}

/* ======================
   Page
======================= */
export default function NewStudentsPage() {
  /* ---------- listing state ---------- */
  const [students, setStudents] = useState<NewAndAdmittedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(10);

  /* ---------- role & institutions ---------- */
  const [role, setRole] = useState<string>("");
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [institutions, setInstitutions] = useState<
    { value: string; label: string }[]
  >([]);

  /* ---------- UI dialogs ---------- */
  const [customizeOpen, setCustomizeOpen] = useState(false);

  /* ---------- password modal ---------- */
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdStudent, setPwdStudent] = useState<NewAndAdmittedStudent | null>(
    null
  );
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  /* ---------- column visibility ---------- */
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    username: true,
    email: true,
    mobile: true,
    actions: true,
  });

  const columnOptions = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "username", label: "Username" },
      { key: "email", label: "Email" },
      { key: "mobile", label: "Mobile" },
      { key: "actions", label: "Actions" },
    ],
    []
  );

  /* ============================================================
     Decode role from JWT
  ============================================================ */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload: any = JSON.parse(atob(token.split(".")[1]));
      setRole(payload.role || "");
    } catch (e) {
      console.error("Failed to decode token", e);
    }
  }, []);

  /* ============================================================
     Load institutions (superadmin only)
  ============================================================ */
  useEffect(() => {
    if (role !== "superadmin") return;

    const load = async () => {
      try {
        const res = await getActiveInstitutions();
        setInstitutions(
          res.map((i: any) => ({
            value: i.instituteId,
            label: i.name,
          }))
        );
      } catch {
        toast.error("Failed to load institutions");
      }
    };

    load();
  }, [role]);

  /* ============================================================
     Fetch students
  ============================================================ */
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNewAndAdmittedStudentsRequest({
        page: currentPage,
        limit,
        search: searchTerm,
        instituteId:
          role === "superadmin" && selectedInstitution !== "all"
            ? selectedInstitution
            : undefined,
      });

      setStudents(res.data.docs || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalEntries(res.data.totalDocs || 0);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load students");
      setStudents([]);
      setTotalPages(1);
      setTotalEntries(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchTerm, role, selectedInstitution]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  /* ============================================================
     Change password modal handlers
  ============================================================ */
  const openPasswordModal = (s: NewAndAdmittedStudent) => {
    setPwdStudent(s);
    setNewPwd("");
    setConfirmPwd("");
    setShowNewPwd(false);
    setShowConfirmPwd(false);
    setPwdError(null);
    setPwdOpen(true);
  };

  const closePasswordModal = () => {
    if (pwdLoading) return;
    setPwdOpen(false);
    setPwdStudent(null);
    setNewPwd("");
    setConfirmPwd("");
    setShowNewPwd(false);
    setShowConfirmPwd(false);
    setPwdError(null);
  };

  const submitPasswordChange = async () => {
    if (!pwdStudent) return;

    // ✅ Strong password validation
    const pwdErrorMsg = validatePassword(newPwd);
    if (pwdErrorMsg) {
      setPwdError(pwdErrorMsg);
      return;
    }

    if (newPwd !== confirmPwd) {
      setPwdError("Passwords do not match.");
      return;
    }

    try {
      setPwdLoading(true);
      setPwdError(null);
      const res = await adminChangeStudentPasswordRequest({
        studentId: pwdStudent._id,
        newPassword: newPwd,
      });
      if (!res.success) throw new Error(res.message || "Failed");

      toast.success("Password changed successfully");
      closePasswordModal();
    } catch (err: any) {
      setPwdError(err?.message || "Failed to change password");
    } finally {
      setPwdLoading(false);
    }
  };

  /* live rule checklist */
  const rules = useMemo(
    () => [
      { ok: newPwd.length >= 8, label: "At least 8 characters" },
      { ok: newPwd.length > 0 && !/\s/.test(newPwd), label: "No spaces" },
      { ok: /[A-Z]/.test(newPwd), label: "Uppercase letter" },
      { ok: /[a-z]/.test(newPwd), label: "Lowercase letter" },
      { ok: /[0-9]/.test(newPwd), label: "Number" },
      { ok: /[^A-Za-z0-9]/.test(newPwd), label: "Special character" },
    ],
    [newPwd]
  );

  /* ============================================================
     Columns
  ============================================================ */
  const columns: Column<NewAndAdmittedStudent>[] = [
    columnVisibility.name && {
      header: "Name",
      render: (s: NewAndAdmittedStudent) => (
        <span className="font-medium text-gray-900">
          {s.firstname} {s.lastname}
        </span>
      ),
    },
    columnVisibility.username && {
      header: "Username",
      render: (s: NewAndAdmittedStudent) => (
        <code className="px-2 py-0.5 rounded bg-gray-100 text-xs">
          {s.username || "-"}
        </code>
      ),
    },
    columnVisibility.email && {
      header: "Email",
      accessor: "email",
    },
    columnVisibility.mobile && {
      header: "Mobile",
      accessor: "mobileNo",
    },
    columnVisibility.actions && {
      header: "Actions",
      render: (s: NewAndAdmittedStudent) => (
        <button
          onClick={() => openPasswordModal(s)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1"
          title="Change Password"
        >
          <KeyRound className="w-3.5 h-3.5" />
          Change Password
        </button>
      ),
    },
  ].filter(Boolean) as Column<NewAndAdmittedStudent>[];

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="p-6 space-y-6">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-semibold">Students Password Change</h1>
        </div>
      </div>

      {/* ---------- Controls card ---------- */}
      <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-sm">
        {/* Top row */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <button
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Customize Columns</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Show
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-md bg-white"
              >
                {[10, 25, 50, 100, 250, 500].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span className="text-xs font-medium text-gray-500">entries</span>
            </div>
          </div>
        </div>

        {/* Search + institution filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, username, email, phone"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            />
          </div>

          {role === "superadmin" && (
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
          )}
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* ---------- Change Password Modal ---------- */}
      <AnimatePresence>
        {pwdOpen && pwdStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closePasswordModal}
          >
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closePasswordModal}
                disabled={pwdLoading}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Change Password
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    For{" "}
                    <b>
                      {pwdStudent.firstname} {pwdStudent.lastname}
                    </b>{" "}
                    ({pwdStudent.username})
                  </p>
                </div>

                <div className="space-y-3">
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? "text" : "password"}
                        value={newPwd}
                        onChange={(e) => {
                          // 🚫 strip spaces as they type
                          setNewPwd(e.target.value.replace(/\s/g, ""));
                          setPwdError(null);
                        }}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        minLength={8}
                        className="w-full px-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showNewPwd ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPwd ? "text" : "password"}
                        value={confirmPwd}
                        onChange={(e) => {
                          setConfirmPwd(e.target.value.replace(/\s/g, ""));
                          setPwdError(null);
                        }}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        minLength={8}
                        className="w-full px-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showConfirmPwd ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Live rule checklist */}
                  {newPwd.length > 0 && (
                    <ul className="text-xs mt-1 space-y-0.5">
                      {rules.map((r) => (
                        <li
                          key={r.label}
                          className={
                            r.ok ? "text-green-600" : "text-gray-500"
                          }
                        >
                          {r.ok ? "✓" : "•"} {r.label}
                        </li>
                      ))}
                    </ul>
                  )}

                  {pwdError && (
                    <p className="text-sm text-red-600">{pwdError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={closePasswordModal}
                    disabled={pwdLoading}
                    className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitPasswordChange}
                    disabled={pwdLoading}
                    className="px-4 py-2 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 disabled:opacity-50"
                  >
                    {pwdLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {pwdLoading ? "Saving..." : "Change Password"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Customize Columns ---------- */}
      <ColumnCustomizeDialog
        open={customizeOpen}
        title="Customize Columns"
        columns={columnOptions}
        selected={columnVisibility}
        onChange={(v) => setColumnVisibility((p) => ({ ...p, ...v }))}
        onClose={() => setCustomizeOpen(false)}
      />
    </div>
  );
}