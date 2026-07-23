"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  listFeeConcessionsRequest,
  deleteFeeConcessionRequest,
  updateFeeConcessionStatusRequest,
} from "@/app/lib/request/feeConcessionRequest";
import {
  Eye,
  FileDown,
  Settings,
  Search,
  X,
  Loader2,
  Trash2,
  Filter,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import ViewDialog from "@/components/ViewDialog";
import { DataTable, Column } from "@/components/Tablecomponents";
import ConfirmDialog from "@/components/ConfirmDialog";
import { getaccesscontrol } from "@/app/lib/request/permissionRequest";
import ExportModal from "@/components/ExportModal";
import ColumnCustomizeDialog from "@/components/ColumnCustomizeDialog";
import { getActiveInstitutions } from "@/app/lib/request/institutionRequest";

// Updated interface to match backend response
interface FeeConcessionDoc {
  _id: string;
  student: {
    _id: string;
    studentId: string;
    applicationId: string;
    programId: string;
    firstname: string;
    lastname: string;
    fullName: string;
    email: string;
    mobileNo: string;
    institute: string;
    feeConcessiondeatils: {
      courseId: string;
      name: string;
      amount: number;
      tuitionFee: number;
      otherFee: number;
      discountedTuition: number;
      discountAmount: number;
      totalDiscountPercentage: number;
      finalAmount: number;
      referrals: Array<{
        referralId: string;
        name: string;
        percentage: number;
      }>;
      reason: string;
      counsellorName: string;
      status: string;
      paymentOptionId?: string | null; // ADDED: Payment option ID
      paymentOption?: { // ADDED: Full payment option details
        paymentOptionId: string;
        name: string;
        type: string;
        installmentCount: number;
      } | null;
      createdAt: string;
      breakdown: {
        tuitionFee: number;
        otherFee: number;
        discountApplied: string;
        finalTuition: number;
        finalTotal: number;
      };
    };
  };
  createdBy: {
    _id: string;
    firstname: string;
    lastname: string;
    designation: string;
    role: string;
  } | null;
  approvedBy: {
    _id: string;
    firstname: string;
    lastname: string;
    designation: string;
    role: string;
  } | null;
}

interface Statistics {
  total: number;
  stats: Array<{
    _id: string;
    count: number;
  }>;
}

// Helper functions
const getStudentFullName = (concession: FeeConcessionDoc) => {
  return concession.student?.fullName || `${concession.student?.firstname || ''} ${concession.student?.lastname || ''}`.trim() || 'Unknown';
};

const getTotalReferralPercentage = (concession: FeeConcessionDoc) => {
  return concession.student?.feeConcessiondeatils?.totalDiscountPercentage || 0;
};

const getFeeConcessionStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
};

const getFeeConcessionStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    cancelled: "secondary",
  };
  return colors[status] || "secondary";
};

// Format currency
const formatCurrency = (amount: number) => {
  if (!amount) return "-";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function FeeConcessionApprovalPage() {
  const [concessions, setConcessions] = useState<FeeConcessionDoc[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    stats: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConcession, setSelectedConcession] = useState<FeeConcessionDoc | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [userpermission, setUserpermisssion] = useState<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [confirmType, setConfirmType] = useState<"approve" | "reject" | "cancel" | "delete" | "statusChange" | null>(null);
  const [exportData, setExportData] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [limit, setLimit] = useState(10);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string; newStatus: string } | null>(null);

  // Institute filter states
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [institutions, setInstitutions] = useState<{ value: string; label: string }[]>([]);

  // Status options for filter
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  // Format data for view dialog - UPDATED to show breakdown
  // Format data for view dialog - UPDATED to show breakdown and payment option
  const formattedConcession = useMemo(() => {
    if (!selectedConcession) return {};

    const feeDetails = selectedConcession.student?.feeConcessiondeatils;

    // Format payment option display
    let paymentOptionDisplay = "-";
    if (feeDetails?.paymentOption) {
      const option = feeDetails.paymentOption;
      paymentOptionDisplay = `${option.name} (${option.installmentCount} installments)`;
    } else if (feeDetails?.paymentOptionId) {
      paymentOptionDisplay = feeDetails.paymentOptionId;
    }

    return {
      "Student Name": getStudentFullName(selectedConcession),
      "Student ID": selectedConcession.student?.studentId || "-",
      "Student Email": selectedConcession.student?.email || "-",
      "Student Mobile": selectedConcession.student?.mobileNo || "-",
      "Student Institute": selectedConcession.student?.institute || "-",
      "Application ID": selectedConcession.student?.applicationId || "-",
      "Program ID": selectedConcession.student?.programId || "-",

      "Course": feeDetails?.name || "-",

      // Fee Breakdown
      "Tuition Fee": feeDetails?.tuitionFee ? formatCurrency(feeDetails.tuitionFee) : "-",
      "Other Fee": feeDetails?.otherFee ? formatCurrency(feeDetails.otherFee) : "-",
      "Original Total": feeDetails?.amount ? formatCurrency(feeDetails.amount) : "-",

      "Discount Percentage": `${feeDetails?.totalDiscountPercentage || 0}%`,
      "Discount Applied (on Tuition)": feeDetails?.discountAmount ? formatCurrency(feeDetails.discountAmount) : "-",
      "Discounted Tuition": feeDetails?.discountedTuition ? formatCurrency(feeDetails.discountedTuition) : "-",
      "Final Amount": feeDetails?.finalAmount ? formatCurrency(feeDetails.finalAmount) : "-",

      // Payment Option
      "Payment Option": paymentOptionDisplay,

      "Reason": feeDetails?.reason || "-",
      "Counsellor Name": feeDetails?.counsellorName || "-",
      "Status": getFeeConcessionStatusLabel(feeDetails?.status || "pending"),

      "Referrals": feeDetails?.referrals?.length
        ? feeDetails.referrals
          .map(
            (ref, i) =>
              `${i + 1}. ${ref.name} - ${ref.percentage}%`
          )
          .join("\n")
        : "No referrals",

      "Created By": selectedConcession.createdBy
        ? `${selectedConcession.createdBy.firstname} ${selectedConcession.createdBy.lastname}`
        : "-",
      "Created At": feeDetails?.createdAt
        ? new Date(feeDetails.createdAt).toLocaleString()
        : "-",
      "Approved By": selectedConcession.approvedBy
        ? `${selectedConcession.approvedBy.firstname} ${selectedConcession.approvedBy.lastname}`
        : "-",
    };
  }, [selectedConcession]);

  // Load institutions for superadmin
  useEffect(() => {
    if (role === "superadmin") {
      const loadInstitutions = async () => {
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
      loadInstitutions();
    }
  }, [role]);

  // Fetch permissions
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

        if ((decoded.role === "admin" || decoded.role === "user") && decoded.instituteId && decoded.id) {
          const data = await getaccesscontrol({
            userId: decoded.id,
            instituteId: decoded.instituteId
          });
          const permissions = data.permissions?.find(
            (p: any) => p.moduleName === "Fee Concession Approval"
          );
          if (permissions && (permissions.view || permissions.edit || permissions.delete)) {
            setUserpermisssion(permissions);
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
        console.error("Failed to fetch permissions:", error);
        setHasPermission(false);
      }
    };

    fetchPermissions();
  }, []);

  // Get role from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload: any = JSON.parse(atob(token.split(".")[1]));
      setRole(payload.role);
    } catch (error) {
      console.error("Failed to decode token", error);
    }
  }, []);

  // Fetch concessions
  const fetchConcessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFeeConcessionsRequest({
        limit,
        page: currentPage,
        search: searchTerm,
        status: statusFilter,
        instituteId: selectedInstitution,
      });

      setConcessions(res.data.docs || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalEntries(res.data.totalDocs || 0);

      const statsData = res.data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 };

      setStatistics({
        total: statsData.total || 0,
        stats: [
          { _id: 'pending', count: statsData.pending || 0 },
          { _id: 'approved', count: statsData.approved || 0 },
          { _id: 'rejected', count: statsData.rejected || 0 },
          { _id: 'cancelled', count: 0 },
        ]
      });
    } catch (err: any) {
      const errorMessage = err.message || "Something went wrong";
      toast.error(errorMessage);
      console.error("Failed to fetch concessions:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, limit, statusFilter, selectedInstitution]);

  useEffect(() => {
    fetchConcessions();
  }, [fetchConcessions]);

  // Handle status change from dropdown
  const handleStatusChange = (id: string, newStatus: string) => {
    setPendingStatusChange({ id, newStatus });
    setConfirmType("statusChange");
    setConfirmOpen(true);
  };

  // Handle actions
  const handleAction = async () => {
    // Handle status change using the new unified API
    if (confirmType === "statusChange" && pendingStatusChange) {
      setActionLoading(pendingStatusChange.id);
      try {
        const result = await updateFeeConcessionStatusRequest(
          pendingStatusChange.id,
          pendingStatusChange.newStatus as 'approved' | 'rejected'
        );

        if (result.success) {
          toast.success(result.message || `Status changed to ${getFeeConcessionStatusLabel(pendingStatusChange.newStatus)} successfully!`);
          await fetchConcessions();
        } else {
          toast.error(result.message || "Failed to update status");
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to update status");
        console.error("Status update error:", err);
      } finally {
        setActionLoading(null);
        setConfirmOpen(false);
        setPendingStatusChange(null);
        setConfirmType(null);
      }
      return;
    }

    // Handle delete action
    if (!selectedConcession || !confirmType) return;

    setActionLoading(selectedConcession._id);
    try {
      if (confirmType === "delete") {
        await deleteFeeConcessionRequest(selectedConcession._id);
        toast.success("Fee concession deleted successfully!");
        await fetchConcessions();
      }
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setActionLoading(null);
      setConfirmOpen(false);
      setSelectedConcession(null);
      setConfirmType(null);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSelectedInstitution("all");
    setCurrentPage(1);
  };

  // Export handler
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const res = await listFeeConcessionsRequest({
        limit: 1000,
        page: 1,
        search: searchTerm,
        status: statusFilter,
        instituteId: selectedInstitution,
      });

      const exportData = res.data.docs.map((concession: FeeConcessionDoc) => {
        const obj: any = {};
        const feeDetails = concession.student?.feeConcessiondeatils;

        if (columnVisibility.studentName) {
          obj["Student Name"] = getStudentFullName(concession);
        }
        if (columnVisibility.studentId) {
          obj["Student ID"] = concession.student?.studentId || "-";
        }
        if (columnVisibility.email) {
          obj["Email"] = concession.student?.email || "-";
        }
        if (columnVisibility.mobile) {
          obj["Mobile"] = concession.student?.mobileNo || "-";
        }
        if (columnVisibility.course) {
          obj["Course"] = feeDetails?.name || "-";
        }
        if (columnVisibility.concessionAmount) {
          obj["Tuition Fee"] = feeDetails?.tuitionFee ? formatCurrency(feeDetails.tuitionFee) : "-";
          obj["Other Fee"] = feeDetails?.otherFee ? formatCurrency(feeDetails.otherFee) : "-";
          obj["Original Total"] = feeDetails?.amount ? formatCurrency(feeDetails.amount) : "-";
          obj["Discount %"] = `${feeDetails?.totalDiscountPercentage || 0}%`;
          obj["Discount Amount"] = feeDetails?.discountAmount ? formatCurrency(feeDetails.discountAmount) : "-";
          obj["Final Amount"] = feeDetails?.finalAmount ? formatCurrency(feeDetails.finalAmount) : "-";
        }
        if (columnVisibility.referrals) {
          obj["Referrals"] = feeDetails?.referrals
            ?.map(ref => `${ref.name} (${ref.percentage}%)`)
            .join(", ") || "-";
        }
        if (columnVisibility.counsellor) {
          obj["Counsellor"] = feeDetails?.counsellorName || "-";
        }
        if (columnVisibility.status) {
          obj["Status"] = getFeeConcessionStatusLabel(feeDetails?.status || "pending");
        }
        if (columnVisibility.createdBy) {
          obj["Created By"] = concession.createdBy
            ? `${concession.createdBy.firstname} ${concession.createdBy.lastname}`
            : "-";
        }
        if (columnVisibility.createdAt) {
          obj["Created At"] = feeDetails?.createdAt
            ? new Date(feeDetails.createdAt).toLocaleString()
            : "-";
        }

        return obj;
      });

      setExportData(exportData);
      setExportOpen(true);
    } catch (error: any) {
      toast.error("Failed to export: " + (error.message || "Unknown error"));
    } finally {
      setExportLoading(false);
    }
  };

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState({
    studentName: true,
    studentId: true,
    email: true,
    mobile: true,
    course: true,
    concessionAmount: true,
    paymentPlan: true,
    referrals: true,
    counsellor: true,
    status: true,
    createdBy: true,
    createdAt: true,
  });

  const columnOptions = [
    { key: "studentName", label: "Student Name" },
    { key: "studentId", label: "Student ID" },
    { key: "email", label: "Email" },
    { key: "mobile", label: "Mobile" },
    { key: "course", label: "Course" },
    { key: "concessionAmount", label: "Concession Amount" },
    { key: "referrals", label: "Referrals" },
    { key: "paymentPlan", label: "Payment Plan" },
    { key: "counsellor", label: "Counsellor" },
    { key: "status", label: "Status" },
    { key: "createdBy", label: "Created By" },
    { key: "createdAt", label: "Created At" },
  ];

  // Table columns - UPDATED to show tuition/other fee breakdown
  const columns: Column<FeeConcessionDoc>[] = [
    columnVisibility.studentName && {
      header: "Student Name",
      render: (concession: FeeConcessionDoc) => (
        <div className="font-medium">
          {getStudentFullName(concession)}
        </div>
      ),
    },
    columnVisibility.studentId && {
      header: "Student ID",
      render: (concession: FeeConcessionDoc) => (
        <span className="text-sm text-gray-600">
          {concession.student?.studentId || "-"}
        </span>
      ),
    },
    columnVisibility.email && {
      header: "Email",
      render: (concession: FeeConcessionDoc) => (
        <span className="text-sm">
          {concession.student?.email || "-"}
        </span>
      ),
    },
    columnVisibility.mobile && {
      header: "Mobile",
      render: (concession: FeeConcessionDoc) => (
        <span className="text-sm">
          {concession.student?.mobileNo || "-"}
        </span>
      ),
    },
    columnVisibility.course && {
      header: "Course",
      render: (concession: FeeConcessionDoc) => (
        <span className="text-sm font-medium text-blue-600">
          {concession.student?.feeConcessiondeatils?.name || "-"}
        </span>
      ),
    },
    columnVisibility.concessionAmount && {
      header: "Fee Breakdown",
      render: (concession: FeeConcessionDoc) => {
        const feeDetails = concession.student?.feeConcessiondeatils;
        const tuitionFee = feeDetails?.tuitionFee || 0;
        const otherFee = feeDetails?.otherFee || 0;
        const discountAmount = feeDetails?.discountAmount || 0;
        const finalAmount = feeDetails?.finalAmount || 0;
        const discountPercentage = feeDetails?.totalDiscountPercentage || 0;

        return (
          <div className="text-sm">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-xs">Tuition:</span>
                <span className="font-medium text-gray-700">
                  {formatCurrency(tuitionFee)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-xs">Other:</span>
                <span className="font-medium text-gray-700">
                  {formatCurrency(otherFee)}
                </span>
              </div>
              {discountPercentage > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-500 text-xs">Discount:</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(discountAmount)}
                  </span>
                  <span className="text-xs text-green-500 bg-green-50 px-1.5 py-0.5 rounded">
                    {discountPercentage}%
                  </span>
                  <span className="text-xs text-gray-400">(on tuition)</span>
                </div>
              )}
              <div className="flex items-center gap-1 border-t border-gray-100 pt-0.5 mt-0.5">
                <span className="text-gray-500 text-xs">Final:</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(finalAmount)}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    columnVisibility.referrals && {
      header: "Referrals",
      render: (concession: FeeConcessionDoc) => {
        const referrals = concession.student?.feeConcessiondeatils?.referrals;
        const totalDiscount = concession.student?.feeConcessiondeatils?.totalDiscountPercentage || 0;

        if (referrals?.length > 0) {
          return (
            <div className="text-sm">
              <span className="font-medium text-green-600">
                {totalDiscount}%
              </span>
              <div className="text-xs text-gray-500">
                {referrals.map(ref => ref.name).join(', ')}
              </div>
            </div>
          );
        }
        return <span className="text-sm text-gray-400">No referrals</span>;
      },
    },
    // Add this column after the "Counsellor" column or wherever you want
    columnVisibility.paymentPlan &&{
      header: "Payment Plan",
      render: (concession: FeeConcessionDoc) => {
        const feeDetails = concession.student?.feeConcessiondeatils;
        const paymentOption = feeDetails?.paymentOption;
        const paymentOptionId = feeDetails?.paymentOptionId;

        if (paymentOption) {
          return (
            <div className="text-sm">
              <span className="font-medium text-purple-600">
                {paymentOption.name}
              </span>
              <div className="text-xs text-gray-500">
                {paymentOption.installmentCount} installments
              </div>
            </div>
          );
        } else if (paymentOptionId) {
          return (
            <span className="text-sm text-gray-500">
              {paymentOptionId}
            </span>
          );
        }
        return <span className="text-sm text-gray-400">-</span>;
      },
    },
    columnVisibility.counsellor && {
      header: "Counsellor",
      render: (concession: FeeConcessionDoc) => (
        <span className="text-sm">
          {concession.student?.feeConcessiondeatils?.counsellorName || "-"}
        </span>
      ),
    },
    columnVisibility.status && {
      header: "Status",
      render: (concession: FeeConcessionDoc) => {
        const status = concession.student?.feeConcessiondeatils?.status || "pending";
        const color = getFeeConcessionStatusColor(status);
        const label = getFeeConcessionStatusLabel(status);
        const isLoading = actionLoading === concession._id;

        const colorClasses = {
          warning: "bg-yellow-100 text-yellow-800 border-yellow-400",
          success: "bg-green-100 text-green-800 border-green-400",
          danger: "bg-red-100 text-red-800 border-red-400",
          secondary: "bg-gray-100 text-gray-800 border-gray-400",
        };

        if (status === "pending") {
          return (
            <div className="relative">
              <select
                className={`px-2 py-1 rounded-lg text-xs font-medium border border-yellow-400 bg-yellow-50 text-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  if (newStatus !== status) {
                    handleStatusChange(concession._id, newStatus);
                  }
                }}
                disabled={isLoading}
              >
                <option value="pending">Pending</option>
                <option value="approved">✅ Approve</option>
                <option value="rejected">❌ Reject</option>
              </select>
              {isLoading && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-yellow-600" />
              )}
            </div>
          );
        }

        return (
          <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.secondary}`}>
            {label}
          </span>
        );
      },
    },
    columnVisibility.createdBy && {
      header: "Created By",
      render: (concession: FeeConcessionDoc) => (
        <span className="text-sm">
          {concession.createdBy
            ? `${concession.createdBy.firstname} ${concession.createdBy.lastname}`
            : "-"}
        </span>
      ),
    },
    columnVisibility.createdAt && {
      header: "Created At",
      render: (concession: FeeConcessionDoc) => (
        <span className="text-sm">
          {concession.student?.feeConcessiondeatils?.createdAt
            ? new Date(concession.student.feeConcessiondeatils.createdAt).toLocaleDateString()
            : "-"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (concession: FeeConcessionDoc) => {
        const status = concession.student?.feeConcessiondeatils?.status || "pending";
        const isActionLoading = actionLoading === concession._id;

        return (
          <div className="flex gap-1">
            <button
              onClick={() => {
                setSelectedConcession(concession);
                setViewOpen(true);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white p-1.5 rounded-md"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>

            {(status === "pending") &&
              (role === "superadmin" || userpermission?.delete) && (
                <button
                  onClick={() => {
                    setSelectedConcession(concession);
                    setConfirmType("delete");
                    setConfirmOpen(true);
                  }}
                  disabled={isActionLoading}
                  className="bg-red-700 hover:bg-red-800 text-white p-1.5 rounded-md disabled:opacity-50"
                  title="Delete"
                >
                  {isActionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
          </div>
        );
      },
    },
  ].filter(Boolean) as Column<FeeConcessionDoc>[];

  // Check if user can perform actions
  const getConfirmTitle = () => {
    if (confirmType === "statusChange") {
      const status = pendingStatusChange?.newStatus || "";
      return `Change Status to ${getFeeConcessionStatusLabel(status)}`;
    }
    switch (confirmType) {
      case "approve": return "Approve Fee Concession";
      case "reject": return "Reject Fee Concession";
      case "cancel": return "Cancel Fee Concession";
      case "delete": return "Delete Fee Concession";
      default: return "Confirm Action";
    }
  };

  const getConfirmMessage = () => {
    if (confirmType === "statusChange" && pendingStatusChange) {
      const student = concessions.find(c => c._id === pendingStatusChange.id);
      const studentName = student ? getStudentFullName(student) : "Unknown Student";
      const newStatusLabel = getFeeConcessionStatusLabel(pendingStatusChange.newStatus);
      return `Are you sure you want to change the status for "${studentName}" to "${newStatusLabel}"? This action cannot be undone.`;
    }

    if (!selectedConcession) return "";
    const studentName = getStudentFullName(selectedConcession);
    const status = selectedConcession.student?.feeConcessiondeatils?.status || "pending";

    if (status !== "pending" && confirmType !== "delete") {
      return `This fee concession is already ${status}. Only pending concessions can be ${confirmType}d.`;
    }

    switch (confirmType) {
      case "approve":
        return `Are you sure you want to approve the fee concession for "${studentName}"? This will grant them the concession.`;
      case "reject":
        return `Are you sure you want to reject the fee concession for "${studentName}"? This will deny the concession.`;
      case "cancel":
        return `Are you sure you want to cancel the fee concession for "${studentName}"? This action can be undone.`;
      case "delete":
        return `Are you sure you want to delete the fee concession for "${studentName}"? This action cannot be undone.`;
      default:
        return "Are you sure you want to perform this action?";
    }
  };

  const getConfirmVariant = () => {
    if (confirmType === "statusChange") {
      const status = pendingStatusChange?.newStatus || "";
      if (status === "approved") return "success";
      if (status === "rejected") return "danger";
      return "warning";
    }
    switch (confirmType) {
      case "approve": return "success";
      case "reject": return "danger";
      case "cancel": return "warning";
      case "delete": return "danger";
      default: return "warning";
    }
  };

  if (!hasPermission) {
    return (
      <div className="p-6 text-center text-red-600">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-12 h-12" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p className="text-sm text-gray-500">Please contact your superadmin.</p>
        </div>
      </div>
    );
  }

  // Get status counts for stats
  const getStatusCount = (status: string) => {
    const stat = statistics.stats?.find(s => s._id === status);
    return stat?.count || 0;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold">Fee Concession Approval</h1>
        </div>

        <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-sm">
          {/* Top Row */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex gap-2 order-1">
              <button
                onClick={() => setCustomizeOpen(true)}
                className="flex items-center gap-1 bg-gradient-to-b from-[#1e2a5a] to-[#3d4f91] text-white px-3 py-2 text-sm rounded-md"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Customize Columns</span>
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm rounded-md"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>

            <div className="flex items-center gap-2 order-2 ml-auto">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Show
                </span>
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-600 pr-8 focus:outline-none focus:ring-2 focus:ring-[#1e2a5a] cursor-pointer appearance-none"
                  >
                    {[10, 25, 50, 100].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500">entries</span>
              </div>

              <button
                onClick={handleExport}
                disabled={exportLoading}
                className={`flex items-center gap-1 px-3 py-2 text-sm rounded-md ${exportLoading
                  ? "bg-green-400 cursor-not-allowed"
                  : "bg-green-700 hover:bg-green-800"
                  } text-white`}
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Exporting...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Show Entries */}
          <div className="flex sm:hidden items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Show entries:
            </span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border text-sm rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Search Row */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name, email, phone no, student ID, counsellor name, ..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2 p-4 bg-gray-50 rounded-lg border">
              {/* Institution Filter - Superadmin only */}
              {role === "superadmin" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Institution
                  </label>
                  <select
                    value={selectedInstitution}
                    onChange={(e) => {
                      setSelectedInstitution(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                  >
                    <option value="all">All Institutions</option>
                    {institutions.map((inst) => (
                      <option key={inst.value} value={inst.value}>
                        {inst.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#3a4480]"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {(searchTerm || statusFilter !== "all" || selectedInstitution !== "all") && (
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {searchTerm && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Search: {searchTerm}
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Status: {getFeeConcessionStatusLabel(statusFilter)}
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-purple-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedInstitution !== "all" && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                  Institution: {institutions.find(i => i.value === selectedInstitution)?.label || selectedInstitution}
                  <button
                    onClick={() => {
                      setSelectedInstitution("all");
                      setCurrentPage(1);
                    }}
                    className="hover:text-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-blue-500">
          <div className="text-sm text-gray-500">Total Requests</div>
          <div className="text-2xl font-bold">{statistics.total || 0}</div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-yellow-500">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {getStatusCount("pending")}
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-green-500">
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            {getStatusCount("approved")}
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-red-500">
          <div className="text-sm text-gray-500">Rejected</div>
          <div className="text-2xl font-bold text-red-600">
            {getStatusCount("rejected")}
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-gray-500">
          <div className="text-sm text-gray-500">Cancelled</div>
          <div className="text-2xl font-bold text-gray-600">
            {getStatusCount("cancelled")}
          </div>
        </div>

        {/* Approval Rate */}
        <div className="bg-white rounded-xl shadow-md p-4 border-b-4 border-purple-500">
          <div className="text-sm text-gray-500">Approval Rate</div>
          <div className="text-2xl font-bold text-purple-600">
            {statistics.total > 0
              ? Math.round((getStatusCount("approved") / statistics.total) * 100)
              : 0}%
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={concessions}
        loading={loading}
        totalEntries={totalEntries}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* View Dialog */}
      <ViewDialog
        open={viewOpen}
        title="Fee Concession Details"
        data={formattedConcession}
        onClose={() => setViewOpen(false)}
      />

      {/* Confirm Dialog for Actions */}
      <ConfirmDialog
        open={confirmOpen}
        title={getConfirmTitle()}
        message={getConfirmMessage()}
        onConfirm={handleAction}
        onCancel={() => {
          setConfirmOpen(false);
          setSelectedConcession(null);
          setConfirmType(null);
          setPendingStatusChange(null);
        }}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        title="Fee Concessions"
        data={exportData}
        onClose={() => {
          setExportOpen(false);
          setTimeout(() => setExportData([]), 300);
        }}
        loading={exportLoading}
      />

      {/* Column Customize Dialog */}
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