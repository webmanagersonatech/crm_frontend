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

export interface Institution {
  _id?: string;
  name: string;
  country: string;
  state?: string;
  location?: string;
  contactPerson?: string;
  email?: string;
  phoneNo?: string;
  instituteType?: string;
  status?: "active" | "inactive";
}

export async function createInstitution(data: Institution) {
  try {
    const response = await api.post("/institutions", data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to create institution."
    );
  }
};


export async function getAllInstitutions({
  page = 1,
  limit = 10,
  search = "",
  status = "all",
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search.trim()) params.append("search", search.trim());
    if (status !== "all") params.append("status", status);

    const response = await api.get(`/institutions?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    console.log(error, "error");
    throw new Error(
      error.response?.data?.message || "Failed to fetch institutions."
    );
  }
}




export async function getInstitutionById(id: string) {
  try {
    const response = await api.get(`/institutions/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch institution details."
    );
  }
}
export async function getActiveInstitutions() {
  try {
    const response = await api.get("/institutions/active");
    return response.data.data; // because backend wraps inside { status, data }
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch active institutions."
    );
  }
}

// frontend: institutionRequest.ts
export async function getActivedata(instituteId?: string) {
  try {
    const response = await api.get("/institutions/activedata", {
      params: instituteId ? { instituteId } : {},
    });

    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch active institutions."
    );
  }
}



export async function updateInstitution(id: string, data: Partial<Institution>) {
  try {
    const response = await api.put(`/institutions/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to update institution."
    );
  }
}


export async function deleteInstitution(id: string) {
  try {
    const response = await api.delete(`/institutions/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to delete institution."
    );
  }
}


