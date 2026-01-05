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
export interface Event {
    _id?: string;
    instituteId?: string;
    eventId?: string;
    name: string;
    mobile: string;
    email?: string;
    location?: string;
    eventName: string;
    enrolledDate?: string;
    extraFields?: Record<string, any>;
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

// Create a single event
export async function createEvent(data: Partial<Event>) {
    try {
        const response = await api.post("/events", data);
        return response.data;
    } catch (error: any) {
        throw new Error(
            error.response?.data?.message || "Failed to create event."
        );
    }
}

// Import CSV/XLSX
export async function importEvents(
    file: File,
    instituteId?: string
) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        if (instituteId) formData.append("instituteId", instituteId);

        const response = await api.post("/events/import", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        return response.data;
    } catch (error: any) {
        // Return full backend response for validation errors
        throw error.response?.data || {
            message: "Failed to import file",
            sheetErrors: [],
            duplicatesInSheet: [],
            duplicatesInDB: [],
        };
    }
}

// Get paginated events with filters
export async function getEvents({
    page = 1,
    limit = 10,
    instituteId,
    name,
    mobile,
    eventName,
    startDate,
    endDate,
}: {
    page?: number;
    limit?: number;
    instituteId?: string;
    name?: string;
    mobile?: string;
    eventName?: string;
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
        if (mobile) params.append("mobile", mobile);
        if (eventName) params.append("eventName", eventName);
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const response = await api.get(`/events?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to fetch events.");
    }
}

// Get a single event by ID
export async function getEventById(id: string) {
    try {
        const response = await api.get(`/events/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to fetch event.");
    }
}

// Update an event by ID
export async function updateEvent(id: string, data: Partial<Event>) {
  try {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to update event";

    return Promise.reject(message); // ✅ reject ONLY message
  }
}



// Delete an event by ID
export async function deleteEvent(id: string) {
    try {
        const response = await api.delete(`/events/${id}`);
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || "Failed to delete event.");
    }
}
