import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach Authorization header
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
export interface EmailTemplate {
  _id?: string;
  instituteId: string;
  title: string;
  description: string; // HTML content
  createdBy?: {
    firstname: string;
    lastname: string;
    role: string;
    instituteId: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// ---------------- API Calls ----------------

// Create a new email template
export async function createEmailTemplateRequest(data: Partial<EmailTemplate>) {
  try {
    const response = await api.post("/email-templates", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to create email template.");
  }
}

// Get paginated email templates with optional filters
export async function getEmailTemplates(params?: {
  page?: number;
  limit?: number;
  instituteId?: string;
  title?: string;
  userId?: string;
}) {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.instituteId) searchParams.append("instituteId", params.instituteId);
    if (params?.title) searchParams.append("title", params.title);
    if (params?.userId) searchParams.append("userId", params.userId);

    const response = await api.get(`/email-templates?${searchParams.toString()}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch email templates.");
  }
}

// Get all email templates without pagination
export async function getAllEmailTemplates(filters?: {
  instituteId?: string;
  title?: string;
  userId?: string;
}) {
  try {
    const searchParams = new URLSearchParams();
    if (filters?.instituteId) searchParams.append("instituteId", filters.instituteId);
    if (filters?.title) searchParams.append("title", filters.title);
    if (filters?.userId) searchParams.append("userId", filters.userId);

    const response = await api.get(`/email-templates/all?${searchParams.toString()}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch email templates.");
  }
}

// Get a single email template by ID
export async function getEmailTemplateById(id: string) {
  try {
    const response = await api.get(`/email-templates/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch email template.");
  }
}

// Update an email template by ID
export async function updateEmailTemplateRequest(id: string, data: Partial<EmailTemplate>) {
  try {
    const response = await api.put(`/email-templates/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update email template.");
  }
}

// Delete an email template by ID
export async function deleteEmailTemplateRequest(id: string) {
  try {
    const response = await api.delete(`/email-templates/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete email template.");
  }
}
