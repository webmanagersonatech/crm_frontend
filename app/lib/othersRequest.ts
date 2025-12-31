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
export interface Other {
    _id?: string;
    instituteId?: string;
    name: string;
    phone: string;
    date?: string;
    dataSource: string;
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

// Create a record
export async function createOther(data: Partial<Other>) {
    try {
        const response = await api.post("/others", data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to create record.");
    }
}

// Import CSV/XLSX
// othersRequest.ts
export async function importOthers(
    file: File,
    dataSource: string,
    instituteId?: string
) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dataSource", dataSource);
        if (instituteId) formData.append("instituteId", instituteId);

        const response = await api.post("/others/import", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return response.data;
    } catch (error: any) {
        // ✅ THROW FULL BACKEND RESPONSE
        throw error.response?.data || {
            message: "Failed to import file",
            missingFields: [],
            duplicatesInSheet: [],
            duplicatesInDB: []
        };
    }
}


// Get paginated records with filters
export async function getOthers({
    page = 1,
    limit = 10,
    instituteId,
    name,
    phone,
    dataSource,
    startDate,
    endDate,
}: {
    page?: number;
    limit?: number;
    instituteId?: string;
    name?: string;
    phone?: string;
    dataSource?: string;
    startDate?: string;
    endDate?: string;
}) {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (instituteId) params.append("instituteId", instituteId);
        if (name) params.append("name", name);
        if (phone) params.append("phone", phone);
        if (dataSource) params.append("dataSource", dataSource);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const response = await api.get(`/others?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to fetch records.");
    }
}

// Get a single record by ID
export async function getOtherById(id: string) {
    try {
        const response = await api.get(`/others/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to fetch record.");
    }
}

// Update a record by ID
export async function updateOther(id: string, data: Partial<Other>) {
    try {
        const response = await api.put(`/others/${id}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to update record.");
    }
}

// Delete a record by ID
export async function deleteOther(id: string) {
    try {
        const response = await api.delete(`/others/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to delete record.");
    }
}
