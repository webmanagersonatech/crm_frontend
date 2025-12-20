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
// TYPES (SECTION BASED)
// ============================

export interface SectionField {
  fieldName: string;
  label?: string;
  type: string;
  required?: boolean;
  options?: string[];
  multiple?: boolean;
}

export interface FormSection {
  sectionName: string;
  fields: SectionField[];
}

export interface FormBuilderPayload {
  _id?: string;
  instituteId: string;
  personalDetails: FormSection[];
  educationDetails: FormSection[];
  createdAt?: string;
  updatedAt?: string;
}

// ============================
// API FUNCTIONS
// ============================

export async function saveFormConfiguration(
  data: FormBuilderPayload
) {
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
    const response = await api.get(`/form-manager/${instituteId}`)
    return response.data
  } catch (error: any) {
    // Pass backend message clearly
    throw new Error(
      error?.response?.data?.message || 'Unable to fetch form configuration'
    )
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
