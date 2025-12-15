import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Attach token if available
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

// ============================
// Types
// ============================

export interface FormField {
  fieldType: string;
  maxLength?: number;
  fieldName: string;
  fieldFor: "Personal" | "Education";
  sectionName?: string;
  visibility: "Yes" | "No";
  required: boolean;
  options?: string[];
  
}

export interface FormManager {
  _id?: string;
  instituteId: string;
  personalFields: FormField[];
  educationFields: FormField[];
  createdAt?: string;
  updatedAt?: string;
}



export async function saveFormConfiguration(data: FormManager) {
  try {
    const response = await api.post("/form-manager", data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to save form configuration."
    );
  }
}


export async function getAllFormConfigurations() {
  try {
    const response = await api.get("/form-manager");
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch form configurations."
    );
  }
}

export async function getFormByInstituteId(instituteId: string) {
  try {
    const response = await api.get(`/form-manager?instituteId=${instituteId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch form configuration for this institute."
    );
  }
}


export async function deleteFormConfiguration(id: string) {
  try {
    const response = await api.delete(`/form-manager/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to delete form configuration."
    );
  }
}
