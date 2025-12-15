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
export interface DashboardData {
  totalInstitutes: number;
  totalLeads: number;
  totalApplications: number;
  paidApplications: number;
  unpaidApplications: number;
}

// ---------------- API Calls ----------------

/**
 * 🔹 Fetch Dashboard Data
 * Automatically applies role-based filters on the backend
 */
export async function getDashboardData({
  startDate,
  endDate,
  instituteId,
}: {
  startDate?: string;
  endDate?: string;
  instituteId?: string;
} = {}): Promise<DashboardData> {
  try {
    const params = new URLSearchParams();

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (instituteId && instituteId !== "all") params.append("instituteId", instituteId);

    const response = await api.get(`/dashboard?${params.toString()}`);
    return response.data.data; // server returns { success, data }
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch dashboard data."
    );
  }
}
