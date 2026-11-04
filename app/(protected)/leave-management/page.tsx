"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CalendarOff,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Types ----------
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRequest {
  _id: string;
  studentId: string;          // e.g. STU-0001
  studentName: string;        // display name
  applicationId: string;
  instituteId: string;
  instituteName: string;
  academicYear: string;
  program: string;            // course name

  fromDate: string;           // YYYY-MM-DD
  toDate: string;             // YYYY-MM-DD
  totalDays: number;
  reason: string;
  attachmentName?: string;

  status: LeaveStatus;
  requestedAt: string;        // ISO string
  reviewedBy?: string;        // manager name
  reviewedAt?: string;
  managerRemark?: string;
}

// ---------- Static dummy data ----------
const DUMMY_LEAVES: LeaveRequest[] = [
  {
    _id: "LV-1001",
    studentId: "STU-0001",
    studentName: "Arjun Kumar",
    applicationId: "APP-2201",
    instituteId: "INS-3-ZXYXKM",
    instituteName: "Sona College",
    academicYear: "2024-2025",
    program: "B.Tech CSE",
    fromDate: "2026-11-10",
    toDate: "2026-11-12",
    totalDays: 3,
    reason: "Fever and doctor advised rest.",
    attachmentName: "medical-certificate.pdf",
    status: "pending",
    requestedAt: "2026-11-04T09:15:00Z",
  },
  {
    _id: "LV-1002",
    studentId: "STU-0002",
    studentName: "Divya Ramesh",
    applicationId: "APP-2202",
    instituteId: "INS-ESTKLHCB",
    instituteName: "Sona Arts & Science",
    academicYear: "2024-2025",
    program: "B.Sc Mathematics",
    fromDate: "2026-11-06",
    toDate: "2026-11-06",
    totalDays: 1,
    reason: "Family function — brother's wedding.",
    status: "approved",
    requestedAt: "2026-11-01T13:40:00Z",
    reviewedBy: "Dr. Meena (HOD)",
    reviewedAt: "2026-11-02T10:12:00Z",
    managerRemark: "Approved. Please submit internal exam notes later.",
  },
  {
    _id: "LV-1003",
    studentId: "STU-0003",
    studentName: "Naveen Raj",
    applicationId: "APP-2203",
    instituteId: "INS-3-ZXYXKM",
    instituteName: "Sona College",
    academicYear: "2024-2025",
    program: "B.Tech ECE",
    fromDate: "2026-10-28",
    toDate: "2026-11-02",
    totalDays: 6,
    reason: "Out of station for sports tournament.",
    attachmentName: "tournament-invite.pdf",
    status: "rejected",
    requestedAt: "2026-10-25T11:00:00Z",
    reviewedBy: "Prof. Saravanan",
    reviewedAt: "2026-10-25T17:25:00Z",
    managerRemark: "Too long for one request — split into two.",
  },
  {
    _id: "LV-1004",
    studentId: "STU-0004",
    studentName: "Priya Sundar",
    applicationId: "APP-2204",
    instituteId: "INS-ESTKLHCB",
    instituteName: "Sona Arts & Science",
    academicYear: "2024-2025",
    program: "B.Com",
    fromDate: "2026-11-15",
    toDate: "2026-11-16",
    totalDays: 2,
    reason: "Dental surgery.",
    status: "pending",
    requestedAt: "2026-11-03T08:20:00Z",
  },
  {
    _id: "LV-1005",
    studentId: "STU-0005",
    studentName: "Karthik Vel",
    applicationId: "APP-2205",
    instituteId: "INS-3-ZXYXKM",
    instituteName: "Sona College",
    academicYear: "2024-2025",
    program: "B.Tech IT",
    fromDate: "2026-11-07",
    toDate: "2026-11-07",
    totalDays: 1,
    reason: "Personal emergency.",
    status: "approved",
    requestedAt: "2026-11-02T22:05:00Z",
    reviewedBy: "Dr. Meena (HOD)",
    reviewedAt: "2026-11-03T07:00:00Z",
    managerRemark: "Approved.",
  },
];

// ---------- Helpers ----------
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const statusPill = (status: LeaveStatus) => {
  const map: Record<LeaveStatus, string> = {
    pending: "bg-amber-100 text-amber-700 ring-amber-200",
    approved: "bg-green-100 text-green-700 ring-green-200",
    rejected: "bg-red-100 text-red-700 ring-red-200",
  };
  const icon: Record<LeaveStatus, React.ReactNode> = {
    pending: <Clock className="w-3.5 h-3.5" />,
    approved: <CheckCircle2 className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${map[status]}`}
    >
      {icon[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ---------- Page ----------
export default function LeaveManagementPage() {
  // In real life these would be fetched via API.
  const [leaves, setLeaves] = useState<LeaveRequest[]>(DUMMY_LEAVES);
  const [loading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeaveStatus>("all");
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [viewOpen, setViewOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewType, setReviewType] = useState<"approve" | "reject" | null>(null);
  const [reviewRemark, setReviewRemark] = useState("");
  const [selected, setSelected] = useState<LeaveRequest | null>(null);

  // -- Filtering (client-side for the demo) --
  const filtered = useMemo(() => {
    return leaves.filter((l) => {
      const matchesSearch =
        !searchTerm ||
        l.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.applicationId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || l.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leaves, searchTerm, statusFilter]);

  const totalEntries = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / limit));
  const pageItems = filtered.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, limit]);

  // -- Approve / Reject (updates local state only for now) --
  const applyReview = () => {
    if (!selected || !reviewType) return;

    if (reviewType === "reject" && !reviewRemark.trim()) {
      toast.warn("Please add a remark before rejecting.");
      return;
    }

    setLeaves((prev) =>
      prev.map((l) =>
        l._id === selected._id
          ? {
              ...l,
              status: reviewType === "approve" ? "approved" : "rejected",
              reviewedBy: "You (Manager)",
              reviewedAt: new Date().toISOString(),
              managerRemark: reviewRemark.trim() || undefined,
            }
          : l
      )
    );

    toast.success(
      reviewType === "approve"
        ? "Leave approved."
        : "Leave rejected."
    );

    setReviewOpen(false);
    setReviewType(null);
    setReviewRemark("");
    setSelected(null);
  };

  // -- Stats --
  const stats = useMemo(
    () => ({
      total: leaves.length,
      pending: leaves.filter((l) => l.status === "pending").length,
      approved: leaves.filter((l) => l.status === "approved").length,
      rejected: leaves.filter((l) => l.status === "rejected").length,
    }),
    [leaves]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-6 h-6 text-blue-700" />
          <h1 className="text-2xl font-semibold">Leave Management</h1>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Requests" value={stats.total} accent="bg-blue-50 text-blue-700" />
        <StatCard label="Pending" value={stats.pending} accent="bg-amber-50 text-amber-700" />
        <StatCard label="Approved" value={stats.approved} accent="bg-green-50 text-green-700" />
        <StatCard label="Rejected" value={stats.rejected} accent="bg-red-50 text-red-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 p-4 bg-white rounded-lg">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            >
              <option value="all">Status: All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Show</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600"
            >
              {[10, 25, 50, 100].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <span className="text-xs font-medium text-gray-500">entries</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, student ID or application ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Program</th>
                <th className="px-4 py-3 text-left">Leave Period</th>
                <th className="px-4 py-3 text-left">Days</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…
                  </td>
                </tr>
              )}

              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No leave requests found.
                  </td>
                </tr>
              )}

              {!loading &&
                pageItems.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{l.studentName}</div>
                      <div className="text-xs text-slate-500">
                        {l.studentId} • {l.applicationId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{l.program}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                    </td>
                    <td className="px-4 py-3 font-medium">{l.totalDays}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="px-4 py-3">{statusPill(l.status)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {fmtDate(l.requestedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          title="View"
                          onClick={() => {
                            setSelected(l);
                            setViewOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>

                        {l.status === "pending" && (
                          <>
                            <button
                              title="Approve"
                              onClick={() => {
                                setSelected(l);
                                setReviewType("approve");
                                setReviewRemark("");
                                setReviewOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              title="Reject"
                              onClick={() => {
                                setSelected(l);
                                setReviewType("reject");
                                setReviewRemark("");
                                setReviewOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
          <div>
            Showing{" "}
            <span className="font-medium">
              {totalEntries === 0 ? 0 : (currentPage - 1) * limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(currentPage * limit, totalEntries)}
            </span>{" "}
            of <span className="font-medium">{totalEntries}</span> entries
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-md disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 border rounded-md ${
                  currentPage === i + 1
                    ? "bg-blue-600 text-white border-blue-600"
                    : ""
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-md disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ============== View Dialog ============== */}
      <AnimatePresence>
        {viewOpen && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setViewOpen(false)}
          >
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto relative p-6"
            >
              <button
                onClick={() => setViewOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-semibold mb-1">Leave Request Details</h2>
              <p className="text-xs text-slate-500 mb-4">ID: {selected._id}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <Info label="Student" value={selected.studentName} />
                <Info label="Student ID" value={selected.studentId} />
                <Info label="Application ID" value={selected.applicationId} />
                <Info label="Institute" value={selected.instituteName} />
                <Info label="Program" value={selected.program} />
                <Info label="Academic Year" value={selected.academicYear} />
                <Info label="From" value={fmtDate(selected.fromDate)} />
                <Info label="To" value={fmtDate(selected.toDate)} />
                <Info label="Total Days" value={String(selected.totalDays)} />
                <Info label="Status" value={statusPill(selected.status)} />
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Reason</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3">
                  {selected.reason}
                </p>
              </div>

              {selected.attachmentName && (
                <div className="mt-3">
                  <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Attachment</p>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-blue-600 text-sm underline"
                  >
                    {selected.attachmentName}
                  </a>
                </div>
              )}

              {selected.reviewedBy && (
                <div className="mt-4 border-t pt-4 text-sm">
                  <p className="text-xs uppercase font-semibold text-slate-500 mb-1">
                    Manager Review
                  </p>
                  <p className="text-slate-700">
                    <strong>{selected.reviewedBy}</strong> •{" "}
                    {selected.reviewedAt ? fmtDate(selected.reviewedAt) : "-"}
                  </p>
                  {selected.managerRemark && (
                    <p className="text-slate-600 mt-1">{selected.managerRemark}</p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============== Approve / Reject Dialog ============== */}
      <AnimatePresence>
        {reviewOpen && selected && reviewType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setReviewOpen(false)}
          >
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            >
              <h2 className="text-lg font-semibold mb-1 capitalize">
                {reviewType} Leave Request
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Student: <strong>{selected.studentName}</strong> •{" "}
                {selected.totalDays} day(s)
              </p>

              <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">
                Remark {reviewType === "reject" && <span className="text-red-500">*</span>}
              </label>
              <textarea
                rows={3}
                value={reviewRemark}
                onChange={(e) => setReviewRemark(e.target.value)}
                placeholder={
                  reviewType === "approve"
                    ? "Optional note for the student…"
                    : "Reason for rejection (required)"
                }
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setReviewOpen(false)}
                  className="px-3 py-2 text-sm rounded-md bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={applyReview}
                  className={`px-3 py-2 text-sm rounded-md text-white ${
                    reviewType === "approve"
                      ? "bg-green-700 hover:bg-green-800"
                      : "bg-red-700 hover:bg-red-800"
                  }`}
                >
                  Confirm {reviewType === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Small components ----------
function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <p className="text-xs uppercase font-semibold text-slate-500">{label}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${accent}`}>
          {label === "Total Requests" ? "All" : "Count"}
        </span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase font-semibold text-slate-500">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}