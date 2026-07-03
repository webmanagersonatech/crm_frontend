import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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

export interface CourseYearFee {
  year: string;
  amount: number;
}

export interface CourseFeeStructure {
  courseId: string;
  name: string;
  years: CourseYearFee[];
}

export interface Referral {
  name: string;
  percentage: number;
}
export interface Installment {
  number: number;
  amount: number;
  dueDate: string;
}
export interface FeeConfiguration {
  _id?: string;
  instituteId: string;
  courseFeeStructure: CourseFeeStructure[];
  referrals: Referral[];
  createdAt?: string;
  updatedAt?: string;
}

// ---------------- API Calls ----------------

// Create / Update Fee Configuration

export async function saveFeeConfiguration(
  data: FeeConfiguration
) {
  try {
    const response = await api.post(
      "/fee-configuration",
      data
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to save fee configuration."
    );
  }
}

// Get Fee Configuration

export async function getFeeConfigurationByInstitute(
  instituteId: string
) {
  try {
    const response = await api.get(
      `/fee-configuration/${instituteId}`
    );

    return response.data.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch fee configuration."
    );
  }
}

// Delete Fee Configuration

export async function deleteFeeConfiguration(
  instituteId: string
) {
  try {
    const response = await api.delete(
      `/fee-configuration/${instituteId}`
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to delete fee configuration."
    );
  }
}