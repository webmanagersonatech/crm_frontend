import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ---------------- Types ----------------

export interface RoomType {
    id: string;
    name: string;
    amount: number;
    description: string;
}

export interface HostelYearFee {
    dueDate?: string;
    year: string;
    roomTypes: RoomType[];
}

export interface AdditionalFeeConfiguration {
    _id?: string;
    instituteId: string;
    hostelFeeStructure: HostelYearFee[];
    createdAt?: string;
    updatedAt?: string;
}

// ---------------- API Calls ----------------

// Create / Update Additional Fee Configuration
export async function saveAdditionalFeeConfiguration(
    data: AdditionalFeeConfiguration
) {
    try {
        const response = await api.post(
            "/additional-fee-configuration",
            data
        );

        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to save additional fee configuration."
        );
    }
}

// Get Additional Fee Configuration by Institute
export async function getAdditionalFeeConfigurationByInstitute(
    instituteId: string
) {
    try {
        const response = await api.get(
            `/additional-fee-configuration/${instituteId}`
        );

        return response.data.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch additional fee configuration."
        );
    }
}

// Get Additional Fee Configuration for Student (Logged-in Student)
export async function getAdditionalFeeConfigurationForStudent() {
    try {
        const response = await api.get(
            "/additional-fee-configuration/student"
        );

        return response.data.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch additional fee configuration for student."
        );
    }
}

// Get Additional Fee Configuration for Admin (by Student ID)
export async function getAdditionalFeeConfigurationByAdmin(
    studentId: string
) {
    try {
        const response = await api.get(
            `/additional-fee-configuration/admin/${studentId}`
        );

        return response.data.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to fetch additional fee configuration."
        );
    }
}

// Delete Additional Fee Configuration by Institute ID
export async function deleteAdditionalFeeConfiguration(
    instituteId: string
) {
    try {
        const response = await api.delete(
            `/additional-fee-configuration/${instituteId}`
        );

        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to delete additional fee configuration."
        );
    }
}