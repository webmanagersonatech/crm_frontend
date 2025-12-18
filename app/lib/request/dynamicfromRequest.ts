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
export interface FormField {
    label: string;
    type: "text" | "number" | "email" | "select" | "radio" | "checkbox" | "date"  | "textarea" | "file";
    required: boolean;
    options?: string[];
}

export interface DynamicForm {
    _id?: string;
    formId?: string;
    instituteId: string;
    published?: boolean;
    title: string;
    description?: string;
    fields: FormField[];
    creator?: {
        firstname: string;
        lastname: string;
        role: string;
        instituteId: string;
    };
    status?: "Active" | "Inactive";
    createdAt?: string;
    updatedAt?: string;
}

// ---------------- API Calls ----------------

// Create Dynamic Form
export async function createDynamicForm(data: Partial<DynamicForm>) {
    try {
        const response = await api.post("/dynamic-form-manage", data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to create dynamic form."
        );
    }
}

// Get paginated forms with optional filters
export async function getDynamicForms({
    page = 1,
    limit = 10,
    instituteId,
    title,

    startDate,
    endDate,
    userId,
}: {
    page?: number;
    limit?: number;
    instituteId?: string;
    title?: string;
    status?: "Active" | "Inactive";
    startDate?: string;
    endDate?: string;
    userId?: string;
}) {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (instituteId) params.append("instituteId", instituteId);
        if (title) params.append("title", title);

        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (userId) params.append("userId", userId);

        const response = await api.get(`/dynamic-form-manage?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch dynamic forms."
        );
    }
}

// Get a single form by ID
export async function getDynamicFormById(id: string) {
    try {
        const response = await api.get(`/dynamic-form-manage/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch dynamic form."
        );
    }
}
// Publish dynamic form
export async function publishDynamicForm(
    id: string,
    published: boolean,
    academicYear?: string
) {
    try {
        const response = await api.put(`/dynamic-form-manage/${id}`, {
            published,
            ...(academicYear && { academicYear }),
        });
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to update publish status."
        );
    }
}



// Update a form by ID
export async function updateDynamicForm(id: string, data: Partial<DynamicForm>) {
    try {
        const response = await api.put(`/dynamic-form-manage/${id}`, data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to update dynamic form."
        );
    }
}

// Delete a form by ID
export async function deleteDynamicForm(id: string) {
    try {
        const response = await api.delete(`/dynamic-form-manage/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to delete dynamic form."
        );
    }
}

