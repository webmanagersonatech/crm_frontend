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

export interface Application {
  _id?: string;
  instituteId: string;
  userId?: string;
  academicYear: string;
  personalData: Record<string, any>;
  educationData: Record<string, any>;
  status?: "Pending" | "Approved" | "Rejected";
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  pagination: {
    totalDocs: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  data: T[];
}

export interface EmailRequest {
  templateId: any;
  recipients: { name: string; email: string }[];
}


export interface EmailResponse {
  success: boolean;
  message: string;
  to?: string;
  responseId?: string | null;
}


export async function createApplication(
  data: any,
  isMultipart: boolean = false
) {
  try {
    const headers = isMultipart
      ? { "Content-Type": "multipart/form-data" }
      : { "Content-Type": "application/json" };

    const response = await api.post("/application", data, { headers });

    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to submit application."
    );
  }
}

export async function getApplications(params?: {
  page?: number;
  limit?: number;
  academicYear?: string;
  instituteId?: string;
  paymentStatus?: string;
  formStatus?: string;
  applicationId?: string;
  applicantName?: string;
  program?: string;

  startDate?: string;
  endDate?: string;
  country?: string;
  state?: string;
  city?: string;
  applicationSource?: string;
  interactions?: string;
}) {
  try {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.academicYear) queryParams.append("academicYear", params.academicYear);
    if (params?.instituteId) queryParams.append("instituteId", params.instituteId);
    if (params?.paymentStatus) queryParams.append("paymentStatus", params.paymentStatus);
    if (params?.formStatus) queryParams.append("formStatus", params.formStatus);

    if (params?.applicationId) queryParams.append("applicationId", params.applicationId);
    if (params?.applicantName) queryParams.append("applicantName", params.applicantName);
    if (params?.program) queryParams.append("program", params.program);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    if (params?.country) queryParams.append("country", params.country);
    if (params?.state) queryParams.append("state", params.state);
    if (params?.city) queryParams.append("city", params.city);
    if (params?.applicationSource) queryParams.append("applicationSource", params.applicationSource);
    if (params?.interactions) queryParams.append("interactions", params.interactions);

    const response = await api.get<PaginatedResponse<Application> & { academicYears: string[] }>(
      `/application?${queryParams.toString()}`
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch applications list."
    );
  }
}

export async function getpendingApplications(params?: {
  page?: number;
  limit?: number;
  academicYear?: string;
  instituteId?: string;
  paymentStatus?: string;
  formStatus?: string;
  applicationId?: string;
  applicantName?: string;
}) {
  try {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.academicYear) queryParams.append("academicYear", params.academicYear);
    if (params?.instituteId) queryParams.append("instituteId", params.instituteId);
    if (params?.formStatus) queryParams.append("formStatus", params.formStatus);
    if (params?.paymentStatus) queryParams.append("paymentStatus", params.paymentStatus);
    if (params?.applicationId) queryParams.append("applicationId", params.applicationId);
    if (params?.applicantName) queryParams.append("applicantName", params.applicantName);

    const response = await api.get<PaginatedResponse<Application>>(
      `/application/pending-applications?${queryParams.toString()}`
    );

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch applications list."
    );
  }
}
export async function sendMail(data: EmailRequest): Promise<EmailResponse> {
  try {
    const response = await api.post<EmailResponse>("/application/send-mail", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.message || "Failed to send email.");
  }
}




export async function getApplicationById(id: string) {
  try {
    const response = await api.get(`/application/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch application details."
    );
  }
}

export async function updateApplication(
  id: string,
  data: Partial<Application> | FormData,
  isMultipart: boolean = false
) {
  try {
    let headers: any = {};
    let payload: any = data;

    if (isMultipart && !(data instanceof FormData)) {
      // Convert JSON to FormData if not already FormData
      payload = new FormData();

      // Cast data to any to avoid TS error
      const dataAny = data as any;

      for (const key in dataAny) {
        if (typeof dataAny[key] === "object" && dataAny[key] !== null) {
          // Nested objects (like personalData or educationData)
          payload.append(key, JSON.stringify(dataAny[key]));
        } else if (dataAny[key] !== undefined) {
          payload.append(key, dataAny[key]);
        }
      }
    }

    if (isMultipart) headers["Content-Type"] = "multipart/form-data";
    else headers["Content-Type"] = "application/json";

    const response = await api.put(`/application/${id}`, payload, { headers });

    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to update application."
    );
  }
}

export const updatePaymentStatus = async (id: string, paymentStatus: string) => {
  try {
    const response = await api.patch(`/application/${id}/payment-status`, {
      paymentStatus,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || "Failed to update payment status."
    );
  }
};



export async function deleteApplication(id: string) {
  try {
    const response = await api.delete(`/application/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to delete application."
    );
  }
}
