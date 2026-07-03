import axios from "axios";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";

/* =======================
   Fee Concession Types
======================= */

export interface FeeConcession {
    _id: string;
    studentId: {
        _id: string;
        firstname: string;
        lastname: string;
        studentId: string;
        email: string;
        mobileNo: string;
    } | string;
    institutionId: string;
    reason: string;
    referralIds: string[];
    counsellorName: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    createdBy: {
        _id: string;
        firstname: string;
        lastname: string;
    } | string;
    approvedBy?: {
        _id: string;
        firstname: string;
        lastname: string;
    } | string;
    rejectedBy?: {
        _id: string;
        firstname: string;
        lastname: string;
    } | string;
    cancelledBy?: {
        _id: string;
        firstname: string;
        lastname: string;
    } | string;
    approvedAt?: Date;
    rejectedAt?: Date;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateFeeConcessionData {
    studentId: string;
    reason: string;
    referralIds: string[];
    counsellorName: string;
}

export interface UpdateFeeConcessionData {
    reason?: string;
    referralIds?: string[];
    counsellorName?: string;
    discountPercentage?: number;
    discountedAmount?: number;
}

export interface FeeConcessionListResponse {
    success: boolean;
    data: {
        docs: FeeConcession[];
        totalDocs: number;
        limit: number;
        totalPages: number;
        page: number;
        pagingCounter: number;
        hasPrevPage: boolean;
        hasNextPage: boolean;
        prevPage: number | null;
        nextPage: number | null;
    };
}

export interface FeeConcessionSingleResponse {
    success: boolean;
    data: FeeConcession;
}

export interface FeeConcessionStatsResponse {
    success: boolean;
    data: {
        total: number;
        stats: Array<{
            _id: string;
            count: number;
        }>;
    };
}

/* =======================
   Axios Instance
======================= */

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/* =======================
   Fee Concession APIs
======================= */

/**
 * 📄 List Fee Concessions (pagination + filters)
 */
export async function listFeeConcessionsRequest({
    page = 1,
    limit = 10,
    search = "",
    status = "all",
}: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}) {
    try {
        const params: any = {
            page,
            limit,
            search,
            status,
        };

        const response = await api.get<FeeConcessionListResponse>(
            "/fee-concession",
            { params }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to load fee concessions. Please try again."
        );
    }
}

/**
 * 👤 Get Fee Concession by Student ID
 */
export async function getFeeConcessionByStudentRequest(studentId: string) {
    try {
        const response = await api.get<FeeConcessionSingleResponse>(
            `/fee-concession/student/${studentId}`
        );
        return response.data.data;
    } catch (error: any) {
        if (error.response?.status === 404) {
            return null; // No fee concession found
        }
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch fee concession details."
        );
    }
}

/**
 * 👤 Get Single Fee Concession by ID
 */
export async function getFeeConcessionRequest(id: string) {
    try {
        const response = await api.get<FeeConcessionSingleResponse>(
            `/fee-concession/${id}`
        );
        return response.data.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch fee concession details."
        );
    }
}

/**
 * ➕ Create or Update Fee Concession (Upsert)
 */
export async function createFeeConcessionRequest(
    data: CreateFeeConcessionData
) {
    try {
        const response = await api.post<FeeConcessionSingleResponse>(
            "/fee-concession",
            data
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to create fee concession."
        );
    }
}

/**
 * ✏️ Update Fee Concession
 */
export async function updateFeeConcessionRequest(
    id: string,
    data: UpdateFeeConcessionData
) {
    try {
        const response = await api.put<FeeConcessionSingleResponse>(
            `/fee-concession/${id}`,
            data
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to update fee concession."
        );
    }
}

/**
 * ✅ Approve Fee Concession (Admin only)
 */
export async function approveFeeConcessionRequest(id: string) {
    try {
        const response = await api.patch<FeeConcessionSingleResponse>(
            `/fee-concession/${id}/approve`
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to approve fee concession."
        );
    }
}

/**
 * ❌ Reject Fee Concession (Admin only)
 */
export async function rejectFeeConcessionRequest(id: string) {
    try {
        const response = await api.patch<FeeConcessionSingleResponse>(
            `/fee-concession/${id}/reject`
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to reject fee concession."
        );
    }
}

/**
 * ⏹️ Cancel Fee Concession
 */
export async function cancelFeeConcessionRequest(id: string) {
    try {
        const response = await api.patch<FeeConcessionSingleResponse>(
            `/fee-concession/${id}/cancel`
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to cancel fee concession."
        );
    }
}

/**
 * 🗑️ Delete Fee Concession
 */
export async function deleteFeeConcessionRequest(id: string) {
    try {
        const response = await api.delete(`/fee-concession/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to delete fee concession."
        );
    }
}

/**
 * 📊 Get Fee Concession Statistics (Admin only)
 */
export async function getFeeConcessionStatsRequest() {
    try {
        const response = await api.get<FeeConcessionStatsResponse>(
            "/fee-concession/stats"
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch fee concession statistics."
        );
    }
}

/* =======================
   Utility Functions
======================= */

/**
 * Check if fee concession can be modified
 */
export function canModifyFeeConcession(
    feeConcession: FeeConcession
): boolean {
    return feeConcession.status === "pending" || feeConcession.status === "cancelled";
}

/**
 * Check if fee concession can be approved
 */
export function canApproveFeeConcession(
    feeConcession: FeeConcession
): boolean {
    return feeConcession.status === "pending";
}

/**
 * Check if fee concession can be rejected
 */
export function canRejectFeeConcession(
    feeConcession: FeeConcession
): boolean {
    return feeConcession.status === "pending";
}

/**
 * Check if fee concession can be cancelled
 */
export function canCancelFeeConcession(
    feeConcession: FeeConcession
): boolean {
    return feeConcession.status === "pending";
}

/**
 * Get status badge color
 */
export function getFeeConcessionStatusColor(status: string): string {
    const colors = {
        pending: "warning",
        approved: "success",
        rejected: "danger",
        cancelled: "secondary",
    };
    return colors[status as keyof typeof colors] || "secondary";
}

/**
 * Get status label
 */
export function getFeeConcessionStatusLabel(status: string): string {
    const labels = {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        cancelled: "Cancelled",
    };
    return labels[status as keyof typeof labels] || status;
}

export default api;