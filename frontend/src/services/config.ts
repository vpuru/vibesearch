// Frontend configuration

// API base URL - can be overridden with environment variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5001";

// API endpoints
export const API_ENDPOINTS = {
  search: `${API_BASE_URL}/api/search`,
  health: `${API_BASE_URL}/api/health`,
  apartmentPreview: `${API_BASE_URL}/api/apartment/preview`,
  apartmentDetails: `${API_BASE_URL}/api/apartment/details`,
  processImages: `${API_BASE_URL}/api/process-images`,
};

// Configuration for testing mode
export const USE_TEST_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_TEST_DATA === "true";

// Max API request timeout
export const API_TIMEOUT = 10000; // 10 seconds
