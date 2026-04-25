import axios from "axios";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";

/* =======================
   Types
======================= */

export interface MatTrainingData {
    _id: string;
    regId: string;
    name: string;
    mobile: string;
    email: string;
    city: string;
    ugDegree: string;
    ugCollege: string;
    studentWorking: "Student" | "Working" | string;
    paymentScreenshot?: string;
    paymentVerified: boolean;
    verifiedBy?: any;
    paymentVerifiedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMatTrainingData {
    name: string;
    mobile: string;
    email: string;
    city: string;
    ugDegree: string;
    ugCollege: string;
    studentWorking: string;
}

export interface UploadPaymentScreenshotData {
    regId: string;
    screenshot: string; // base64 string
}

export interface MatTrainingListResponse {
    docs: MatTrainingData[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
    cityOptions: string[]; // Distinct cities for filter dropdown
    statistics: {
        totalRegistrations: number;
        totalCities: number;
        totalStudents: number;
        totalWorking: number;
    };
}

export interface MatTrainingExportResponse {
    total: number;
    data: MatTrainingData[];
}

export interface CreateMatTrainingResponse {
    status: string;
    message: string;
    regId: string;
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
   MAT Training APIs
======================= */

/** 📄 List (pagination + filters + search) */
export async function listMatTrainingRequest({
    page = 1,
    limit = 10,
    search = "",
    city = "all",
    studentWorking = "all",
    startDate = "",
    endDate = "",
    paymentStatus = "all",
    verificationStatus = "all",
}: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    studentWorking?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;        // ✅ ADD THIS
    verificationStatus?: string;


}) {
    try {
        const params: any = {
            page,
            limit,
            search,
            city,
            studentWorking,
            startDate,
            endDate,
            paymentStatus,
            verificationStatus,
        };

        const response = await api.get<MatTrainingListResponse>("/mat-training", { params });
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch MAT Training registrations."
        );
    }
}

/** 📤 Export (NO pagination, full data with filters) */
export async function exportMatTrainingRequest({
    search = "",
    city = "all",
    studentWorking = "all",
    startDate = "",
    endDate = "",
    paymentStatus = "all",
    verificationStatus = "all",
}: {
    search?: string;
    city?: string;
    studentWorking?: string;
    startDate?: string;
    paymentStatus?: string;
    verificationStatus?: string;
    endDate?: string;
}) {
    try {
        const params: any = {
            search,
            city,
            studentWorking,
            startDate,
            endDate,
            paymentStatus,
            verificationStatus,
        };

        const response = await api.get<MatTrainingExportResponse>("/mat-training/export", { params });
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to export MAT Training data."
        );
    }
}
/** ✅ Verify Payment */
export async function verifyPaymentRequest(
    id: string,
    paymentVerified: boolean
) {
    try {
        const response = await api.patch<{
            message: string;
            data: MatTrainingData;
        }>(`/mat-training/verify-payment/${id}`, {
            paymentVerified,
        });

        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to verify payment."
        );
    }
}
/** 👤 Get Single */
export async function getMatTrainingRequest(id: string) {
    try {
        const response = await api.get<MatTrainingData>(`/mat-training/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch MAT Training registration details."
        );
    }
}

/** ➕ Create (Public - no auth required for registration) */
export async function createMatTrainingRequest(data: CreateMatTrainingData) {
    try {
        const response = await api.post<CreateMatTrainingResponse>("/mat-training", data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to create MAT Training registration."
        );
    }
}

/** 📸 Upload Payment Screenshot */
export async function uploadPaymentScreenshotRequest(data: UploadPaymentScreenshotData) {
    try {
        const response = await api.post<{ message: string }>(
            "/mat-training/upload-payment",
            data
        );
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to upload payment screenshot."
        );
    }
}

/** ✏️ Update */
export async function updateMatTrainingRequest(id: string, data: Partial<CreateMatTrainingData>) {
    try {
        const response = await api.put<{
            message: string;
            data: MatTrainingData;
        }>(`/mat-training/${id}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to update MAT Training registration."
        );
    }
}

/** ❌ Delete */
export async function deleteMatTrainingRequest(id: string) {
    try {
        const response = await api.delete<{ message: string }>(`/mat-training/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to delete MAT Training registration."
        );
    }
}

export default api;