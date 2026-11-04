"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Award,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Loader2,
  X,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Types ----------
type CertStatus = "pending" | "approved" | "rejected";

type CertType =
  | "bonafide"
  | "transfer"
  | "conduct"
  | "course-completion"
  | "internship"
  | "character";

interface CertificationRequest {
  _id: string;
  studentId: string;
  studentName: string;
  applicationId: string;
  instituteId: string;
  instituteName: string;
  academicYear: string;
  program: string;

  certType: CertType;
  purpose: string;            // "For bank loan", "Higher studies", etc.
  copies: number;             // how many printed copies
  remarks?: string;           // student notes

  status: CertStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  managerRemark?: string;
  certificateNo?: string;     // filled once approved
}

// ---------- Static dummy data ----------
const DUMMY_CERTS: CertificationRequest[] = [
  {
    _id: "CR-2001",
    studentId: "STU-0001",
    studentName: "Arjun Kumar",
    applicationId: "APP-2201",
    instituteId: "INS-3-ZXYXKM",
    instituteName: "Sona College",
    academicYear: "2024-2025",
    program: "B.Tech CSE",
    certType: "bonafide",
    purpose: "For bank education loan",
    copies: 2,
    remarks: "Needs stamp and principal signature.",
    status: "pending",
    requestedAt: "2026-11-04T08:20:00Z",
  },
  {
    _id: "CR-2002",
    studentId: "STU-0002",
    studentName: "Divya Ramesh",
    applicationId: "APP-2202",
    instituteId: "INS-ESTKLHCB",
    instituteName: "Sona Arts & Science",
    academicYear: "2024-2025",
    program: "B.Sc Mathematics",
    certType: "transfer",
    purpose: "Transferring to another college",
    copies: 1,
    status: "approved",
    requestedAt: "2026-11-01T11:10:00Z",
    reviewedBy: "Registrar Office",
    reviewedAt: "2026-11-02T09:30:00Z",
    managerRemark: "Approved and dispatched.",
    certificateNo: "TC/2024/0231",
  },
  {
    _id: "CR-2003",
    studentId: "STU-0003",
    studentName: "Naveen Raj",
    applicationId: "APP-2203",
    instituteId: "INS-3-ZXYXKM",
    instituteName: "Sona College",
    academicYear: "2024-2025",
    program: "B.Tech ECE",
    certType: "course-completion",
    purpose: "Higher studies application",
    copies: 3,
    status: "rejected",
    requestedAt: "2026-10-26T15:40:00Z",
    reviewedBy: "Dr. Meena (HOD)",
    reviewedAt: "2026-10-27T10:15:00Z",
    managerRemark: "Pending fee clearance — reapply after dues are paid.",
  },
  {
    _id: "CR-2004",
    studentId: "STU-0004",
    studentName: "Priya Sundar",
    applicationId: "APP-2204",
    instituteId: "INS-ESTKLHCB",
    instituteName: "Sona Arts & Science",
    academicYear: "2024-2025",
    program: "B.Com",
    certType: "conduct",
    purpose: "Visa application",
    copies: 2,
    status: "pending",
    requestedAt: "2026-11-03T06:55:00Z",
  },
  {
    _id: "CR-2005",
    studentId: "STU-0005",
    studentName: "Karthik Vel",
    applicationId: "APP-2205",
    instituteId: "INS-3-ZXYXKM",
    instituteName: "Sona College",
    academicYear: "2024-2025",
    program: "B.Tech IT",
    certType: "internship",
    purpose: "Completed summer internship at TCS",
    copies: 1,
    status: "approved",
    requestedAt: "2026-11-02T19:30:00Z",
    reviewedBy: "Placement Cell",
    reviewedAt: "2026-11-03T08:00:00Z",
    managerRemark: "Verified internship letter.",
    certificateNo: "INT/2024/0089",
  },
];

// ---------- Helpers ----------
const CERT_LABELS: Record<CertType, string> = {
  bonafide: "Bonafide Certificate",
  transfer: "Transfer Certificate",
  conduct: "Conduct Certificate",
  "course-completion": "Course Completion Certificate",
  internship: "Internship Certificate",
  character: "Character Certificate",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const statusPill = (status: CertStatus) => {
  const map: Record<CertStatus, string> = {
    pending: "bg-amber-100 text-amber-700 ring-amber-200",
    approved: "bg-green-100 text-green-700 ring-green-200",
    rejected: "bg-red-100 text-red-700 ring-red-200",
  };
  const icon: Record<CertStatus, React.ReactNode> = {
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
export default function CertificationPage() {
  const [requests, setRequests] = useState<CertificationRequest[]>(DUMMY_CERTS);
  const [loading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CertStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CertType>("all");
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [viewOpen, setViewOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewType, setReviewType] = useState<"approve" | "reject" | null>(null);
  const [reviewRemark, setReviewRemark] = useState("");
  const [certificateNo, setCertificateNo] = useState("");
  const [selected, setSelected] = useState<CertificationRequest | null>(null);

  // Filtering
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.applicationId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesType = typeFilter === "all" || r.certType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchTerm, statusFilter, typeFilter]);

  const totalEntries = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / limit));
  const pageItems = filtered.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, limit]);

  // Stats
  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests]
  );

  // Approve / Reject
  const applyReview = () => {
    if (!selected || !reviewType) return;

    if (reviewType === "reject" && !reviewRemark.trim()) {
      toast.warn("Please add a remark before rejecting.");
      return;
    }

    if (reviewType === "approve" && !certificateNo.trim()) {
      toast.warn("Please enter a certificate number before approving.");
      return;
    }

    setRequests((prev) =>
      prev.map((r) =>
        r._id === selected._id
          ? {
              ...r,
              status: reviewType === "approve" ? "approved" : "rejected",
              reviewedBy: "You (Manager)",
              reviewedAt: new Date().toISOString(),
              managerRemark: reviewRemark.trim() || undefined,
              certificateNo:
                reviewType === "approve" ? certificateNo.trim() : undefined,
            }
          : r
      )
    );

    toast.success(
      reviewType === "approve"
        ? "Certificate approved & generated."
        : "Certificate request rejected."
    );

    setReviewOpen(false);
    setReviewType(null);
    setReviewRemark("");
    setCertificateNo("");
    setSelected(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Award className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-semibold">Certification</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Requests" value={stats.total} accent="bg-blue-50 text-blue-700" />
        <StatCard label="Pending" value={stats.pending} accent="bg-amber-50 text-amber-700" />
        <StatCard label="Approved" value={stats.approved} accent="bg-green-50 text-green-700" />
        <StatCard label="Rejected" value={stats.rejected} accent="bg-red-50 text-red-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 p-4 bg-white rounded-lg">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 flex-wrap">
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
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="border text-sm rounded-md py-2 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            >
              <option value="all">Type: All</option>
              {Object.entries(CERT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
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
                <th className="px-4 py-3 text-left">Certificate</th>
                <th className="px-4 py-3 text-left">Purpose</th>
                <th className="px-4 py-3 text-left">Copies</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…
                  </td>
                </tr>
              )}

              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No certification requests found.
                  </td>
                </tr>
              )}

              {!loading &&
                pageItems.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.studentName}</div>
                      <div className="text-xs text-slate-500">
                        {r.studentId} • {r.applicationId}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {CERT_LABELS[r.certType]}
                      </div>
                      <div className="text-xs text-slate-500">{r.program}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[220px] truncate" title={r.purpose}>
                      {r.purpose}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.copies}</td>
                    <td className="px-4 py-3">{statusPill(r.status)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {fmtDate(r.requestedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          title="View"
                          onClick={() => {
                            setSelected(r);
                            setViewOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>

                        {r.status === "pending" && (
                          <>
                            <button
                              title="Approve"
                              onClick={() => {
                                setSelected(r);
                                setReviewType("approve");
                                setReviewRemark("");
                                setCertificateNo(
                                  `CERT/${new Date().getFullYear()}/${
                                    Math.floor(Math.random() * 9000) + 1000
                                  }`
                                );
                                setReviewOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              title="Reject"
                              onClick={() => {
                                setSelected(r);
                                setReviewType("reject");
                                setReviewRemark("");
                                setCertificateNo("");
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

              <h2 className="text-lg font-semibold mb-1">Certification Request</h2>
              <p className="text-xs text-slate-500 mb-4">ID: {selected._id}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <Info label="Student" value={selected.studentName} />
                <Info label="Student ID" value={selected.studentId} />
                <Info label="Application ID" value={selected.applicationId} />
                <Info label="Institute" value={selected.instituteName} />
                <Info label="Program" value={selected.program} />
                <Info label="Academic Year" value={selected.academicYear} />
                <Info label="Certificate" value={CERT_LABELS[selected.certType]} />
                <Info label="Copies" value={String(selected.copies)} />
                <Info label="Status" value={statusPill(selected.status)} />
                {selected.certificateNo && (
                  <Info label="Certificate No" value={selected.certificateNo} />
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Purpose</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3">
                  {selected.purpose}
                </p>
              </div>

              {selected.remarks && (
                <div className="mt-3">
                  <p className="text-xs uppercase font-semibold text-slate-500 mb-1">
                    Student Remarks
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-3">
                    {selected.remarks}
                  </p>
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
                {reviewType} Certification Request
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Student: <strong>{selected.studentName}</strong> •{" "}
                {CERT_LABELS[selected.certType]}
              </p>

              {reviewType === "approve" && (
                <>
                  <label className="block text-xs uppercase font-semibold text-slate-500 mb-1">
                    Certificate No <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={certificateNo}
                    onChange={(e) => setCertificateNo(e.target.value)}
                    className="w-full border rounded-md p-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                    placeholder="e.g. TC/2024/0231"
                  />
                </>
              )}

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