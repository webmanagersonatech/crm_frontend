
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";

export interface CreateUserData {
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    password: string;
    mobileNo: string;
    designation: string;
    role: "superadmin" | "admin" | "user";
    instituteId: string;
    status?: "active" | "inactive";
    userType?: string;
}
export interface ChangePasswordData {
    email: string;
    newPassword: string;
    confirmPassword: string;

}

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);


export async function loginRequest(email: string, password: string) {
    try {
        const response = await api.post("/auth/login", { email, password });
        return response.data;
    } catch (error: any) {

        throw new Error(
            error.response?.data?.message || "Login failed. Please try again."
        );
    }
}


export async function forgotPasswordRequest(email: string) {
    try {
        const response = await api.post("/auth/forgot-password", { email });
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Something went wrong. Try again."
        );
    }
}

export async function createUserRequest(data: CreateUserData) {
    try {
        const response = await api.post("/auth/register", data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to create user."
        );
    }
}

export async function listUsersRequest({
    page = 1,
    limit = 10,
    search = "",
    status = "all",
    role = "all",
    instituteId = "all",
}: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
    instituteId?: string;
}) {
    try {
        const response = await api.get("/auth/users", {
            params: { page, limit, search, status, role, instituteId },
        });
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message ||
            "Failed to load users. Please try again."
        );
    }
}
export async function listAllUsers(instituteId?: string) {
    try {
        let url = "/auth/list-all";

        if (instituteId && instituteId !== "all") {
            url += `?instituteId=${instituteId}`;
        }

        const response = await api.get(url);
        return response.data;
    } catch (error) {
        return [];
    }
}


export async function deleteUserRequest(userId: string) {
    try {
        const response = await api.delete(`/auth/${userId}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to delete user.");
    }
}


export async function updateUserRequest(userId: string, data: Partial<CreateUserData>) {
    try {
        const response = await api.put(`/auth/${userId}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to update user.");
    }
}


export async function toggleUserStatusRequest(userId: string, status: "active" | "inactive") {
    try {
        const response = await api.put(`/auth/${userId}`, { status });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to update status.");
    }
}

export async function changePasswordRequest(data: ChangePasswordData) {
    try {
        const response = await api.post("/auth/changenewpassword", data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to change password."
        );
    }
}

export async function changePasswordRequestvialogin(data: any) {
    try {
        const response = await api.post("/auth/changenewpasswordvialogin", data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to change password."
        );
    }
}
export default api;
