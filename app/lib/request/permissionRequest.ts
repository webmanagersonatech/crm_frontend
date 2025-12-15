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
export interface PermissionItem {
  moduleName: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  filter: boolean;
  download: boolean;
}

export interface Permission {
  _id?: string;
  instituteId: string;
  role: "admin" | "user";
  permissions: PermissionItem[];
  createdAt?: string;
  updatedAt?: string;
}

// ---------------- API Calls ----------------

// 🟩 Create or Update Permissions
export async function savePermission(data: Permission) {
  try {
    const response = await api.post("/permissions", data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to save permissions."
    );
  }
}

// 🟦 Get Permissions (optional filters)
export async function getPermissions({
  instituteId,
  role,
}: {
  instituteId?: string;
  role?: string;
}) {
  try {
    const params = new URLSearchParams();

    if (instituteId) params.append("instituteId", instituteId);
    if (role) params.append("role", role);

    const response = await api.get(`/permissions?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch permissions."
    );
  }
}


export async function getaccesscontrol({
  instituteId,
  role,
}: {
  instituteId?: string;
  role?: string;
}) {
  try {
    const params = new URLSearchParams();

    if (instituteId) params.append("instituteId", instituteId);
    if (role) params.append("role", role);

    const response = await api.get(`/permissions/getaccesscontrol?${params.toString()}`);
    return response?.data?.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch permissions."
    );
  }
}
// 🟥 Delete Permission by ID
export async function deletePermission(id: string) {
  try {
    const response = await api.delete(`/permissions/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to delete permission."
    );
  }
}

// 🟨 Optionally: Get Single Permission by ID
export async function getPermissionById(id: string) {
  try {
    const response = await api.get(`/permissions/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch permission."
    );
  }
}
