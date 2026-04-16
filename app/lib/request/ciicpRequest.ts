import axios from "axios";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";

/* =======================
   Types
======================= */

export interface CIICPData {
    _id: string;
    registrationId: string;
    name: string;
    fatherName: string;
    gender: string;
    dob: string;
    address: string;
    paymentStatus: "paid" | "unpaid";
    district: string;
    phone: string;
    aadhaar: string;
    qualification: string;
    courses: string[];
    batch: "FN" | "AN" | "Full" | string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCIICPData {
    name: string;
    fatherName: string;
    gender: string;
    dob: string;
    address: string;
    district: string;
    phone: string;
    aadhaar: string;
    qualification: string;
    courses: string[];
    batch: string;
}

export interface CIICPListResponse {
    docs: CIICPData[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
    courses: Array<{
        course: string;
        count: number;
    }>;
    courseOptions: string[];  // Just course names for filter dropdown
    districtOptions: string[]; // Just district names for filter dropdown
}

export interface CIICPExportResponse {
    total: number;
    data: CIICPData[];
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
   CIICP APIs
======================= */

/** 📄 List (pagination + filters + search) */
export async function listCIICPRequest({
    page = 1,
    limit = 10,
    search = "",
    batch = "all",
    district = "all",
    startDate = "",
    endDate = "",
    course = "",
    paymentStatus = "all",
    gender = "all",
}: {
    page?: number;
    limit?: number;
    search?: string;
    batch?: string;
    district?: string;
    startDate?: string;
    endDate?: string;
    course?: string;
    paymentStatus?: string;
    gender?: string;
}) {
    try {
        const params: any = {
            page,
            limit,
            search,
            batch,
            district,
            startDate,
            endDate,
            course,
            paymentStatus,
            gender,
        };

        const response = await api.get<CIICPListResponse>("/ciicp", { params });
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch CIICP registrations."
        );
    }
}
/** 💰 Update Payment Status */
export async function updateCIICPPaymentStatusRequest(
    id: string,
    status: "paid" | "unpaid" = "paid"
) {
    try {
        const response = await api.patch<{
            message: string;
            data: CIICPData;
        }>(`/ciicp/${id}/payment`, { status });

        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to update payment status."
        );
    }
}
/** 📤 Export (NO pagination, full data with filters) */
export async function exportCIICPRequest({
    search = "",
    batch = "all",
    district = "all",
    startDate = "",
    endDate = "",
    course = "",
    paymentStatus = "all",
    gender = "all",
}: {
    search?: string;
    batch?: string;
    district?: string;
    startDate?: string;
    endDate?: string;
    course?: string;
    paymentStatus?: string;
    gender?: string;
}) {
    try {
        const params: any = {
            search,
            batch,
            district,
            startDate,
            endDate,
            course,
            paymentStatus,
            gender,
        };

        const response = await api.get<CIICPExportResponse>("/ciicp/export", { params });
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to export CIICP data."
        );
    }
}

/** 👤 Get Single */
export async function getCIICPRequest(id: string) {
    try {
        const response = await api.get<CIICPData>(`/ciicp/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch CIICP registration details."
        );
    }
}

/** ➕ Create (Public - no auth required) */
export async function createCIICPRequest(data: CreateCIICPData) {
    try {
        const response = await api.post<{
            status: string;
            message: string;
            registrationId: string;
        }>("/ciicp", data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to create CIICP registration."
        );
    }
}

/** ✏️ Update */
export async function updateCIICPRequest(id: string, data: Partial<CreateCIICPData>) {
    try {
        const response = await api.put<{
            message: string;
            data: CIICPData;
        }>(`/ciicp/${id}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to update CIICP registration."
        );
    }
}

/** ❌ Delete */
export async function deleteCIICPRequest(id: string) {
    try {
        const response = await api.delete<{ message: string }>(`/ciicp/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to delete CIICP registration."
        );
    }
}

export default api;