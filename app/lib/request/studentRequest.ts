import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.example.com";

/* =======================
   Student Types
======================= */

export interface Student {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  mobileNo: string;
  instituteId: string;
  studentId: string;
  country?: string;
  state?: string;
  city?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentData {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  mobileNo: string;
  instituteId: string;
  country?: string;
  state?: string;
  city?: string;
  status?: "active" | "inactive";
}

/* =======================
   Axios Instance
======================= */

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* =======================
   Student APIs
======================= */

/** 📄 List Students (pagination + filters) */
export async function listStudentsRequest({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
  instituteId = "all",
  bloodGroup = "all",
  bloodDonate = "all",
  hostelWilling = "all",
  quota = "all",
  country = "all",
  state = "all",
  city = "all",
  feedbackRating = "all",       // ✅ new
  familyOccupation = "all",
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  instituteId?: string;
  bloodGroup?: string;
  bloodDonate?: string;
  hostelWilling?: string;
  quota?: string;
  country?: string;
  state?: string;
  city?: string;
  feedbackRating?: string;      // ✅ new
  familyOccupation?: string;
}) {
  try {
    const response = await api.get("/student", {
      params: {
        page,
        limit,
        search,
        status,
        instituteId,
        bloodGroup,
        bloodDonate,
        hostelWilling,
        quota,
        country,
        state,
        city,
        feedbackRating,       // ✅ send to backend
        familyOccupation,     // ✅ send to backend
      },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to load students. Please try again.");
  }
}


/** 👤 Get Single Student */
export async function getStudentRequest(studentId: string) {
  try {
    const response = await api.get(`/student/${studentId}`);
    return response?.data?.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch student details."
    );
  }
}

/** ➕ Create Student */
export async function createStudentRequest(data: CreateStudentData) {
  try {
    const response = await api.post("/student", data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to create student."
    );
  }
}

/** ✏️ Update Student */
export async function updateStudentRequest(
  studentId: string,
  data: Partial<CreateStudentData>
) {
  try {
    const response = await api.put(`/student/${studentId}`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to update student."
    );
  }
}

/** 🔁 Toggle Student Status */
export async function toggleStudentStatusRequest(
  studentId: string,
  status: "active" | "inactive"
) {
  try {
    const response = await api.put(`/student/${studentId}`, { status });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to update student status."
    );
  }
}

export async function updateStudentIndividualRequest(
  studentId: string,
  data: any
) {
  try {
    const response = await api.put(`/student/${studentId}`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to update student details."
    );
  }
}



/** ❌ Delete Student (if enabled) */
export async function deleteStudentRequest(studentId: string) {
  try {
    const response = await api.delete(`/student/${studentId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to delete student."
    );
  }
}

export default api;
