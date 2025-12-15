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
export interface LoginHistory {
  _id?: string;
  instituteId: string;
  userId: string;
  role: string;
  lastLoginTime: Date;
  user?: {
    firstname: string;
    lastname: string;
    email: string;
    role: string;
  };
}

// ---------------- API Calls ----------------

// Create a login history entry
export async function createLoginHistory(data: Partial<LoginHistory>) {
  try {
    const response = await api.post("/login-histories", data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to create login history."
    );
  }
}

// Get paginated login histories
export async function getLoginHistories({
  page = 1,
  limit = 10,
  instituteId,
  userId,
  role,
  startDate,
  endDate,
}: {
  page?: number;
  limit?: number;
  instituteId?: string;
  userId?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (instituteId) params.append("instituteId", instituteId);
    if (userId) params.append("userId", userId);
    if (role) params.append("role", role);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await api.get(`/login-histories?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch login histories."
    );
  }
}

// Optionally, get single login history by ID
export async function getLoginHistoryById(id: string) {
  try {
    const response = await api.get(`/login-histories/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch login history."
    );
  }
}
