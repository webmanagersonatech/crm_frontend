// paymentRequest.ts
// ------------------------------------------------------
// Frontend API client for all Payment endpoints
// ------------------------------------------------------

import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ---------------- REQUEST INTERCEPTOR ----------------
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------- RESPONSE INTERCEPTOR ----------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 401 || message === "SESSION_EXPIRED") {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// ======================================================
// TYPES
// ======================================================

/** Matches the backend `pagination` object exactly. */
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: Pagination;
}

export type PaymentGateway = "razorpay" | "instamojo" | "ccavenue";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface PaidPaymentStudent {
  _id: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  mobileNo?: string;
  username?: string;
  studentId?: string;
}

export interface PaidPaymentInstitute {
  _id: string;
  name?: string;
  instituteName?: string;
  code?: string;
  instituteId?: string;
}

export interface PaidPayment {
  _id: string;
  studentId: string;
  instituteId: string;
  student: PaidPaymentStudent | null;
  institute: PaidPaymentInstitute | null;
  applicationId: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  orderId: string;
  paymentId?: string;
  status: PaymentStatus;
  gateway: PaymentGateway;
  createdAt: string;
  updatedAt: string;
}

export interface PaidPaymentSummary {
  totalPaidAmount: number;
  totalBaseAmount: number;
  totalGst: number;
  totalPaidCount: number;
}

export interface PaidPaymentsFiltersEcho {
  startDate: string | null;
  endDate: string | null;
  search: string | null;
  gateway: string;
  instituteId: string | null;
}

export interface PaidPaymentsResponse
  extends PaginatedResponse<PaidPayment> {
  summary: PaidPaymentSummary;
  filters: PaidPaymentsFiltersEcho;
}

// ======================================================
// GET ALL PAID PAYMENTS
// ======================================================
export interface GetPaidPaymentsParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  gateway?: PaymentGateway | "all";
  instituteId?: string;
}


// ======================================================
// EXPORT PAID PAYMENTS
// ======================================================
export interface ExportResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  totalCount: number;
}

export type ExportPaidPaymentsParams = Omit<
  GetPaidPaymentsParams,
  "page" | "limit"
>;

export interface ExportPaidPaymentsResponse {
  success: boolean;
  message?: string;
  data: PaidPayment[];
  totalCount: number;
  filters?: PaidPaymentsFiltersEcho;
}

export async function getPaidPayments(
  params?: GetPaidPaymentsParams
): Promise<PaidPaymentsResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.gateway && params.gateway !== "all") {
      query.append("gateway", params.gateway);
    }
    if (params?.instituteId) {
      query.append("instituteId", params.instituteId);
    }

    const response = await api.get<PaidPaymentsResponse>(
      `/payments/paid?${query.toString()}`
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(extractError(error, "Failed to fetch paid payments."));
  }
}

// ======================================================
// GET ALL PAYMENTS
// ======================================================
export interface GetPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus | "all";
  gateway?: PaymentGateway | "all";
  instituteId?: string;
}

export async function getAllPayments(params?: GetPaymentsParams) {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.status && params.status !== "all") {
      query.append("status", params.status);
    }
    if (params?.gateway && params.gateway !== "all") {
      query.append("gateway", params.gateway);
    }
    if (params?.instituteId) {
      query.append("instituteId", params.instituteId);
    }

    const response = await api.get<PaginatedResponse<PaidPayment>>(
      `/payments?${query.toString()}`
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(extractError(error, "Failed to fetch payments."));
  }
}



export async function exportPaidPayments(
  params?: ExportPaidPaymentsParams
): Promise<ExportPaidPaymentsResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.gateway && params.gateway !== "all") {
      query.append("gateway", params.gateway);
    }
    if (params?.instituteId) {
      query.append("instituteId", params.instituteId);
    }

    const response = await api.get<ExportPaidPaymentsResponse>(
      `/payments/paid/export?${query.toString()}`
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(extractError(error, "Failed to export paid payments."));
  }
}

// ======================================================
// HELPERS
// ======================================================
function extractError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}