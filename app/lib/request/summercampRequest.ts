import axios from "axios";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";

/* =======================
   Types
======================= */

export interface SportsData {
    sport_name: string;
    skill_level: "beginner" | "intermediate" | "advanced";
    duration: string;
    price: string;
    timing: string;
}

export interface SummerCamp {
    _id: string;
    regId: string;
    regno: string;

    name: string;
    mobile_no: string;
    email_id: string;

    gender: string;
    dob: string;
    age: number;

    street_address: string;
    city: string;
    state_province: string;
    zip_postal: string;

    allergies: string;
    allergyDetails?: string;

    medicalConditions: string;
    medicalConditionsDetails?: string;

    medicalsCurrentlyTaking: string;

    sports: string;
    sportsData: SportsData[];

    totalAmt: number;
    paymentStatus: "paid" | "unpaid";

    registrar: string;

    createdAt: string;
    updatedAt: string;
}

export interface CreateSummerCampData {
    regno?: string;

    name: string;
    mobile_no: string;
    email_id: string;

    gender: string;
    dob: string;
    age: number;
    paymentStatus?: string;
    street_address: string;
    city: string;
    state_province: string;
    zip_postal: string;

    allergies: string;
    allergyDetails?: string;

    medicalConditions: string;
    medicalConditionsDetails?: string;

    medicalsCurrentlyTaking: string;

    sports: string;
    sportsData: SportsData[];

    totalAmt: number;
    registrar: string;
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
   SummerCamp APIs
======================= */

/** 📄 List (pagination + filters) */

export async function listSummerCampRequest({
    page = 1,
    limit = 10,
    search = "",
    sport = "",
    startDate = "",
    endDate = "",
    paymentStatus = "all",
    registrar = "all",
}: {
    page?: number;
    limit?: number;
    search?: string;
    sport?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
    registrar?: string;
}) {
    const params: any = {
        page,
        limit,
        search,
        sport,
        startDate,
        endDate,
        paymentStatus,
        registrar
    };

    const response = await api.get("/summercamp", { params });
    return response.data;
}

/** 📤 Export (NO pagination, full data) */
export async function exportSummerCampRequest({
    search = "",
    sport = "",
    startDate = "",
    endDate = "",
    paymentStatus = "all",
    registrar = "all",
}: {
    search?: string;
    sport?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
    registrar?: string;
}) {
    try {
        const params: any = {
            search,
            sport,
            startDate,
            endDate,
            paymentStatus,
            registrar,
        };

        const response = await api.get("/summercamp/export", { params });

        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to export summer camp data."
        );
    }
}

/** 👤 Get Single */
export async function getSummerCampRequest(id: string) {
    try {
        const response = await api.get(`/summercamp/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch summer camp details."
        );
    }
}

/** ➕ Create */
export async function createSummerCampRequest(
    data: CreateSummerCampData
) {
    try {
        const response = await api.post("/summercamp", data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to create registration."
        );
    }
}

/** 💰 Update Payment Status மட்டும் */
export async function updatePaymentStatusRequest(
    id: string,
    paymentStatus: "paid" | "unpaid"
) {
    try {
        const response = await api.patch(`/summercamp/${id}/payment`, {
            paymentStatus,
        });
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to update payment status."
        );
    }
}

/** ✏️ Update */
export async function updateSummerCampRequest(
    id: string,
    data: Partial<CreateSummerCampData>
) {
    try {
        const response = await api.put(`/summercamp/${id}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to update registration."
        );
    }
}

/** ❌ Delete */
export async function deleteSummerCampRequest(id: string) {
    try {
        const response = await api.delete(`/summercamp/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to delete registration."
        );
    }
}

export default api;