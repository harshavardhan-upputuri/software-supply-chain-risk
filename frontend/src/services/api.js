/** Centralized Axios API client */
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorDetails = {
      message: error.response?.data?.detail || error.response?.data?.error || error.message || "An unexpected error occurred",
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(errorDetails);
  }
);

export default apiClient;
