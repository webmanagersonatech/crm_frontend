import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add Authorization header automatically
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
export interface Lead {
  _id?: string;
  instituteId: string;
  applicationId: string;
  leadSource: string;
  program: string;
  counsellorName: string;
  candidateName: string;
  ugDegree?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  country?: string;
  state?: string;
  city?: string;
  status?: string;
  communication?: string;
  followUpDate?: string;
  description?: string;
  createdBy?: {
    firstname: string;
    lastname: string;
    instituteId: string;
    role: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// ---------------- API Calls ----------------

// Create a lead
export async function createLead(data: Partial<Lead>) {
  try {
    const response = await api.post("/leads", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to create lead.");
  }
}

// Get paginated leads with filters
export async function getLeads({
  page = 1,
  limit = 10,
  instituteId,
  status,
  candidateName,
  communication,
  startDate,
  endDate,
  userId,
  phoneNumber, // ✅ added
  leadId,
  leadSource,
  country,
  state,
  city,
}: {
  page?: number;
  limit?: number;
  instituteId?: string;
  status?: string;
  candidateName?: string;
  communication?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  phoneNumber?: string; // ✅ added
  leadId?: string;
  leadSource?: string;
  country?: string;
  state?: string;
  city?: string;
}) {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (instituteId) params.append("instituteId", instituteId);
    if (status) params.append("status", status);
    if (candidateName) params.append("candidateName", candidateName);
    if (communication) params.append("communication", communication);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (userId) params.append("userId", userId);
    if (phoneNumber) params.append("phoneNumber", phoneNumber);
    if (leadId) params.append("leadId", leadId);
    if (country) params.append("country", country);
    if (state) params.append("state", state);
    if (city) params.append("city", city);

    if (leadSource) params.append("leadSource", leadSource);

    const response = await api.get(`/leads?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch leads.");
  }
}



// Get a single lead by ID
export async function getLeadById(id: string) {
  try {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch lead.");
  }
}

// Update a lead by ID
export async function updateLead(id: string, data: Partial<Lead>) {
  try {
    const response = await api.put(`/leads/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update lead.");
  }
}

// Delete a lead by ID
export async function deleteLead(id: string) {
  try {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete lead.");
  }
}
