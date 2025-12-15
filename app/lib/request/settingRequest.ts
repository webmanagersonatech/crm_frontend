import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Attach token automatically
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
export interface Settings {
  _id?: string;
  instituteId: string;
  logo?: string; // Base64 string
  courses?: string[];
  merchantId?: string;
  apiKey?: string;
  authToken?: string;
  contactEmail?: string;
  contactNumber?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------- API Calls ----------------

// 🟩 Create or Update Settings
export async function saveSettings(data: Settings) {
  try {
    const response = await api.post("/settings", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to save settings.");
  }
}

// 🟦 Get Settings by Institute ID
export async function getSettingsByInstitute(instituteId: string) {
  try {
    const response = await api.get(`/settings/${instituteId}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch settings.");
  }
}

// 🟪 Get All Settings (admin or system-wide)
export async function getAllSettings() {
  try {
    const response = await api.get(`/settings`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch all settings.");
  }
}

// 🟥 Delete Settings by Institute ID
export async function deleteSettings(instituteId: string) {
  try {
    const response = await api.delete(`/settings/${instituteId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to delete settings.");
  }
}

// 🟨 Optionally: You can fetch single setting by ID if needed
export async function getSettingById(id: string) {
  try {
    const response = await api.get(`/settings/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch setting.");
  }
}
