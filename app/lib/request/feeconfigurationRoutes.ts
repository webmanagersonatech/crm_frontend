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
export interface ManualPaymentRequest {
  studentId: string;
  year: string;
  installmentNumber: number;
  paymentOptionId: string;
  amount: number;
  transactionId: string;
  paymentDate?: string;
  remarks?: string;
}

export interface ManualPaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment: any;
    student: {
      id: string;
      name: string;
      studentId: string;
      email: string;
      mobileNo: string;
    };
    course: {
      id: string;
      name: string;
    };
    year: string;
    installmentNumber: number;
    paymentOptionId: string;
    amount: number;
    transactionId: string;
    paymentDate: string;
    remarks: string;
    concessionApplied: {
      percentage: number;
      amount: number;
      referrals: string[];
    };
  };
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
export async function getFeeConfigurationByAdmin(
  studentId: string,
  paymentMethod?: string
) {
  try {
    const response = await api.get(
      `/fee-configuration/admin/${studentId}`,
      {
        params: paymentMethod
          ? { paymentmethod: paymentMethod }
          : {},
      }
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

export async function createManualPayment(
  data: ManualPaymentRequest
): Promise<ManualPaymentResponse> {
  try {
    const response = await api.post(
      "/tuition-fee/manual-payment",
      data
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message ||
      "Failed to create manual payment."
    );
  }
}