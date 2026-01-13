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
// types/Lead.ts
export interface Followup {
  _id: string;
  status: string;
  communication?: string;
  followUpDate?: string;
  calltaken?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  _id: string;
  leadId: string;
  instituteId: string;
  program: string;
  candidateName: string;
  ugDegree?: string;
  applicationId?: string;
  phoneNumber: string;
  isduplicate: boolean;
  duplicateReason?: string;
  dateOfBirth?: string;
  country?: string;
  state?: string;
  city?: string;
  leadSource?: string;
  status: string;
  communication?: string;
  followUpDate?: string;
  description?: string;
  followups?: Followup[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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

export async function getNewAndFollowupLeads({
  startDate,
  endDate,
  instituteId,
  page = 1,
  limit = 5,
}: {
  startDate?: string;
  endDate?: string;
  instituteId?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ docs: Lead[]; totalDocs: number; totalPages: number; page: number }> {
  try {
    const params = new URLSearchParams();

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (instituteId && instituteId !== "all") params.append("instituteId", instituteId);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const response = await api.get(`/dashboard/new-followup?${params.toString()}`);
    return response.data.data; // server returns { success, data }
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch New + Followup leads."
    );
  }
}