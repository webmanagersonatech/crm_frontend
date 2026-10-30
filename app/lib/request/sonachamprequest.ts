import axios from "axios";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";

/* =======================
   Types — SONA CHAMPS '26
======================= */

export type Gender = "Male" | "Female" | "Other";
export type Category = "Junior" | "Senior";

export interface SonaChamps {
    _id: string;
    regId: string;

    // Student
    studentName: string;
    class: string;
    gender: Gender;

    // School
    schoolName: string;
    schoolLocation: string;

    // Teacher Coordinator
    teacherCoordinatorName: string;
    teacherCoordinatorMobile: string;

    // Parent / Guardian
    parentGuardianName: string;
    parentGuardianMobile: string;

    // Event
    category: Category;
    event: string;

    // Attendance
    present: boolean;
    presentAt?: string | null;
    markedBy?: string;

    createdAt: string;
    updatedAt: string;
}

export interface CreateSonaChampsData {
    studentName: string;
    class: string;
    gender: Gender;

    schoolName: string;
    schoolLocation: string;

    teacherCoordinatorName: string;
    teacherCoordinatorMobile: string;

    parentGuardianName: string;
    parentGuardianMobile: string;

    category: Category;
    event: string;
}

export interface ListSonaChampsParams {
    page?: number;
    limit?: number;
    search?: string;
    event?: string;
    category?: string;
    gender?: string;
    present?: "true" | "false";
    startDate?: string;
    endDate?: string;
}

export interface SonaChampsStats {
    totalRegistrations: number;
    totalPresent: number;
    totalAbsent: number;
}

export interface SonaChampsListResponse {
    docs: SonaChamps[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage: number | null;
    nextPage: number | null;
    statistics: SonaChampsStats;
}

/* =======================
   Axios Instance
======================= */
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");
            if (token) config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== "undefined" && error.response?.status === 401) {
            const message = error.response?.data?.message;
            if (
                message === "Session expired. Please login again." ||
                message === "Token invalid" ||
                message === "Not authorized"
            ) {
                localStorage.removeItem("token");
                alert("Session expired. Please login again.");
                window.location.href = "/";
            }
        }
        return Promise.reject(error);
    }
);

/* =======================
   CREATE (public registration)
======================= */
export async function createSonaChamps(data: CreateSonaChampsData) {
    try {
        const response = await api.post("/sona-champs", data);
        return response.data as {
            status: string;
            message: string;
            regId: string;
        };
    } catch (error: any) {
        // Surface backend validation errors (arrays of messages)
        const data = error.response?.data;
        if (data?.errors?.length) {
            throw new Error(data.errors.join(", "));
        }
        throw new Error(data?.message || "Failed to create registration.");
    }
}

/* =======================
   LIST (pagination + filters + stats)
======================= */
export async function listSonaChamps(params: ListSonaChampsParams = {}) {
    try {
        const query: any = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") query[k] = v;
        });

        const response = await api.get("/sona-champs", { params: query });
        return response.data as SonaChampsListResponse;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch registrations."
        );
    }
}

/* =======================
   EXPORT (no pagination)
======================= */
export async function exportSonaChamps(
    params: Omit<ListSonaChampsParams, "page" | "limit"> = {}
) {
    try {
        const query: any = {};
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") query[k] = v;
        });

        const response = await api.get("/sona-champs/export", { params: query });
        return response.data as { total: number; data: SonaChamps[] };
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to export registrations."
        );
    }
}

/* =======================
   GET SINGLE
======================= */
export async function getSonaChamps(id: string) {
    try {
        const response = await api.get(`/sona-champs/${id}`);
        return response.data as SonaChamps;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch registration."
        );
    }
}

/* =======================
   UPDATE (full)
======================= */
export async function updateSonaChamps(
    id: string,
    data: Partial<CreateSonaChampsData>
) {
    try {
        const response = await api.put(`/sona-champs/${id}`, data);
        return response.data as { message: string; data: SonaChamps };
    } catch (error: any) {
        const res = error.response?.data;
        if (res?.errors?.length) throw new Error(res.errors.join(", "));
        throw new Error(res?.message || "Failed to update registration.");
    }
}

/* =======================
   UPDATE ATTENDANCE
======================= */
export async function updateAttendance(
    id: string,
    payload: { present: boolean; markedBy?: string }
) {
    try {
        const response = await api.patch(
            `/sona-champs/${id}/attendance`,
            payload
        );
        return response.data as { message: string; data: SonaChamps };
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to update attendance."
        );
    }
}

/* =======================
   DELETE
======================= */
export async function deleteSonaChamps(id: string) {
    try {
        const response = await api.delete(`/sona-champs/${id}`);
        return response.data as { message: string };
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to delete registration."
        );
    }
}

/* =======================
   BULK UPLOAD (Excel/CSV) — insertMany, no SMS
======================= */
export interface BulkUploadErrorResponse {
    message: string;
    totalRows?: number;
    validRows?: number;
    rowErrors?: { row: number; message: string }[];
    duplicatesInSheet?: { key: string; rows: number[]; message: string }[];
    duplicatesInDB?: {
        studentName: string;
        event: string;
        teacherCoordinatorMobile: string;
        row: number;
        message: string;
    }[];
}

export async function bulkUploadSonaChamps(file: File) {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post(
            "/sona-champs/bulk-upload",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );

        return response.data as {
            status: string;
            message: string;
            totalInserted: number;
        };
    } catch (error: any) {
        // Throw FULL backend payload so UI can render row-level errors
        throw (error.response?.data as BulkUploadErrorResponse) || {
            message: "Failed to upload file",
        };
    }
}

/* =======================
   DOWNLOAD SAMPLE TEMPLATE
======================= */
export async function downloadSonaChampsTemplate() {
    try {
        const response = await api.get("/sona-champs/template", {
            responseType: "blob",
        });

        // Trigger browser download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "sona-champs-template.xlsx");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to download template."
        );
    }
}

export default api;