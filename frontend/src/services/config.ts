// Frontend configuration

// API base URL - use relative path for Docker/Nginx setup
export const API_BASE_URL = "https://vibesearch-backend-oey7i.ondigitalocean.app/";

console.log("API_BASE_URL", API_BASE_URL);

// API endpoints
export const API_ENDPOINTS = {
  search: `${API_BASE_URL}api/search`,
  health: `${API_BASE_URL}api/health`,
  apartmentPreview: `${API_BASE_URL}api/apartment/preview`,
  apartmentDetails: `${API_BASE_URL}api/apartment/details`,
};

// Configuration for testing mode
export const USE_TEST_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_TEST_DATA === "true";

// Max API request timeout
export const API_TIMEOUT = 10000; // 10 seconds
