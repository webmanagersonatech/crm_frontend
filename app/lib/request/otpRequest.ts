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
api.interceptors.response.use(
    (response) => response,
    (error) => {

        if (typeof window !== "undefined") {

            const status = error?.response?.status;
            const message = error?.response?.data?.message;

            // 🔴 Session expired / Unauthorized
            if (status === 401 || message === "SESSION_EXPIRED") {

                alert("Session expired. Please login again.");

                localStorage.removeItem("token");

                window.location.href = "/";
            }

            // 🔴 Other API errors
            else if (message) {
                alert(message);
            }
            else {
                alert("Something went wrong");
            }
        }

        return Promise.reject(error);
    }
);

// ---------------- Types ----------------
export interface OtpRequest {
    email: string;
}

export interface OtpVerify {
    email: string;
    otp: string;
}

// ---------------- API Calls ----------------


export async function sendOtp(data: OtpRequest) {
    try {
        const response = await api.post("/otp/create", data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to send OTP.");
    }
}


export async function verifyOtp(data: OtpVerify) {
    try {
        const response = await api.post("/otp/verify", data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to verify OTP.");
    }
}


export async function deleteOtpByEmail(email: string) {
    try {
        const response = await api.delete(`/otp/${email}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to delete OTPs.");
    }
}
