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
export interface ExportResponse<T> {
  status: boolean;
  message?: string;
  data: T[];
  totalCount: number;
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
api.interceptors.response.use(
  (response) => response,
  (error) => {

    if (typeof window !== "undefined") {

      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      // 🔴 Session expired / Unauthorized
      if (status === 401 || message === "SESSION_EXPIRED") {

        alert("Session expired. Please login again.");

        localStorage.removeItem("token");

        window.location.href = "/";
      }

      // 🔴 Other API errors
      else if (message) {
        alert(message);
      }
      else {
        alert("Something went wrong");
      }
    }

    return Promise.reject(error);
  }
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
  academicYear = "all",
  bloodGroup = "all",
  bloodDonate = "all",
  hostelWilling = "all",
  quota = "all",
  country = "all",
  state = "all",
  city = "all",
  feedbackRating = "all",
  familyOccupation = "all",
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  instituteId?: string;
  academicYear?: string;
  bloodGroup?: string;
  bloodDonate?: string;
  hostelWilling?: string;
  quota?: string;
  country?: string;
  state?: string;
  city?: string | string[];
  feedbackRating?: string;
  familyOccupation?: string;
}) {
  try {
    const params: any = {
      page,
      limit: limit,
      search,
      status,
      instituteId,
      academicYear,
      bloodGroup,
      bloodDonate,
      hostelWilling,
      quota,
      country,
      state,
      feedbackRating,
      familyOccupation,
    };

    //  multi-city safe handling
    if (city !== "all") {
      params.city = city;
    }

    const response = await api.get("/student", { params });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      "Failed to load students. Please try again."
    );
  }
}

export async function exportStudentsRequest({
  search = "",
  status = "all",
  instituteId = "all",
  academicYear = "all",
  bloodGroup = "all",
  bloodDonate = "all",
  hostelWilling = "all",
  quota = "all",
  country = "all",
  state = "all",
  city = "all",
  feedbackRating = "all",
  familyOccupation = "all",
}: {
  search?: string;
  status?: string;
  instituteId?: string;
  academicYear?: string;
  bloodGroup?: string;
  bloodDonate?: string;
  hostelWilling?: string;
  quota?: string;
  country?: string;
  state?: string;
  city?: string | string[];
  feedbackRating?: string;
  familyOccupation?: string;
}) {
  try {
    const params: any = {
      search,
      status,
      instituteId,
      academicYear,
      bloodGroup,
      bloodDonate,
      hostelWilling,
      quota,
      country,
      state,
      feedbackRating,
      familyOccupation,
    };

    // Handle multi-city safely
    if (city !== "all") {
      params.city = city;
    }

    const response = await api.get<ExportResponse<Student>>("/student/export", { params });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to export students."
    );
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
export async function uploadStudentImageByAdmin(
  studentId: string,
  file: File
): Promise<{ success: boolean; message: string; filename: string }> {
  try {
    // Create FormData
    const formData = new FormData();
    formData.append("studentImage", file);

    // Make API request
    const response = await api.post(
      `/student/admin/upload-image/${studentId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to upload student image"
    );
  }
}

export function validateStudentImage(file: File): boolean {
  // Allowed file types
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

  // Max file size (5MB)
  const maxSize = 5 * 1024 * 1024;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PNG, WebP, and JPEG images are allowed");
  }

  // Check file extension
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    throw new Error("Invalid file extension. Only .jpg, .jpeg, .png, .webp are allowed");
  }

  // Check file size
  if (file.size > maxSize) {
    throw new Error("File size must be less than 5MB");
  }

  return true;
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



/**  Delete Student (if enabled) */
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
