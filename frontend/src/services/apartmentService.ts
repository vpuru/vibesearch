import { Property } from "../components/search/PropertyCard";
import { API_ENDPOINTS, USE_TEST_DATA, API_TIMEOUT } from "./config";

interface SearchFilters {
  min_rent?: number;
  max_rent?: number;
  min_beds?: number;
  max_beds?: number;
  min_baths?: number;
  max_baths?: number;
  studio?: boolean;
  has_available_units?: boolean;
}

interface SearchParams {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  page?: number;
  imageUrls?: string[];
}

interface SearchResponseMatch {
  id: string;
  score: number;
  metadata: any;
}

interface SearchResponse {
  results: SearchResponseMatch[];
}

// Interface for apartment preview data
export interface ApartmentPreview {
  id: string;
  propertyName: string;
  location: {
    city: string;
    state: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  rent: {
    min: number;
    max: number;
  };
  beds: string;
  baths: string;
  sqft: string;
  photos: string[];
}

interface ApartmentPreviewResponse {
  apartment: ApartmentPreview;
}

interface ApartmentDetailsResponse {
  apartment: any;
}

// Default fallback image
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80";

// Convert Pinecone metadata to frontend Property type
const mapMetadataToProperty = (match: SearchResponseMatch): Property => {
  const metadata = match.metadata && typeof match.metadata === "object" ? match.metadata : {};
  
  // Process images
  const images = Array.isArray(metadata.image_urls) && metadata.image_urls.length > 0 
    ? metadata.image_urls 
    : typeof metadata.image_urls === "string" 
      ? [metadata.image_urls] 
      : [DEFAULT_IMAGE];

  // Parse features from amenities
  const features: string[] = metadata.amenities && typeof metadata.amenities === "object"
    ? Object.keys(metadata.amenities)
        .filter(key => metadata.amenities[key] === "true")
        .map(key => key.split("_")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "))
    : [];

  // Format address
  let address = "";
  if (metadata.address) address += metadata.address;
  if (metadata.city) {
    if (address) address += ", ";
    address += metadata.city;
  }
  if (metadata.state) {
    if (address) address += ", ";
    address += metadata.state;
  }
  
  if (!address) address = "Location information unavailable";

  return {
    id: match.id || `property-${Math.random().toString(36).substr(2, 9)}`,
    title: metadata.property_name || "Apartment",
    address,
    price: typeof metadata.min_rent === "number" ? metadata.min_rent : 0,
    bedrooms: typeof metadata.min_beds === "number" ? metadata.min_beds : 0,
    bathrooms: typeof metadata.min_baths === "number" ? metadata.min_baths : 1,
    squareFeet: typeof metadata.square_feet === "number" ? metadata.square_feet : 0,
    images,
    description: metadata.description || "",
    features,
  };
};

// Map apartment preview to Property interface
export const mapApartmentPreviewToProperty = (preview: ApartmentPreview): Property => {
  // Extract numeric values
  let bedrooms = 0;
  if (preview.beds) {
    if (preview.beds.toLowerCase().includes("studio")) {
      bedrooms = 0;
    } else {
      const bedsMatch = preview.beds.match(/(\d+)/g);
      if (bedsMatch && bedsMatch.length > 0) {
        bedrooms = parseInt(bedsMatch[bedsMatch.length - 1], 10) || 0;
      }
    }
  }

  let bathrooms = 0;
  if (preview.baths) {
    const bathsMatch = preview.baths.match(/(\d+)/g);
    if (bathsMatch && bathsMatch.length > 0) {
      bathrooms = parseInt(bathsMatch[0], 10) || 0;
    }
  }

  let squareFeet = 0;
  if (preview.sqft) {
    const sqftMatch = preview.sqft.match(/(\d+)/g);
    if (sqftMatch && sqftMatch.length > 0) {
      squareFeet = parseInt(sqftMatch[0], 10) || 0;
    }
  }

  return {
    id: preview.id,
    title: preview.propertyName || "Apartment",
    address: preview.location
      ? `${preview.location.city || ""}, ${preview.location.state || ""}`
      : "Location unavailable",
    price: preview.rent ? preview.rent.min || 0 : 0,
    bedrooms,
    bathrooms,
    squareFeet,
    images: preview.photos || [],
    description: "",
    features: [],
    coordinates: preview.coordinates,
  };
};

// Mock data for testing
const mockSearchResults = (): Property[] => [
  {
    id: "mock1",
    title: "Luxury Downtown Apartment",
    address: "123 Main St, Los Angeles, CA",
    price: 2500,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    images: [DEFAULT_IMAGE],
    description: "A beautiful apartment in downtown with all amenities",
    features: ["Pool", "Gym", "Parking"],
  },
  {
    id: "mock2",
    title: "Cozy Studio Apartment",
    address: "456 Oak Ave, San Francisco, CA",
    price: 1800,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 550,
    images: [
      "https://images.unsplash.com/photo-1502005097973-6a7082348e28?ixlib=rb-4.0.3&auto=format&fit=crop&w=2344&q=80",
    ],
    description: "Perfect studio apartment for singles or couples",
    features: ["Laundry", "Pets Allowed"],
  },
];

// Function to search apartments with semantic search
export const searchApartments = async (params: SearchParams): Promise<Property[]> => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);
    
    if (params.limit) {
      queryParams.append("limit", params.limit.toString());
    }
    
    if (params.page) {
      queryParams.append("page", params.page.toString());
    }
    
    if (params.imageUrls && params.imageUrls.length > 0) {
      queryParams.append("imageUrls", JSON.stringify(params.imageUrls));
    }
    
    if (params.filters) {
      const { filters } = params;
      
      // Map frontend filter names to backend parameter names
      if (filters.min_rent !== undefined)
        queryParams.append("min_price", filters.min_rent.toString());
      if (filters.max_rent !== undefined)
        queryParams.append("max_price", filters.max_rent.toString());
      if (filters.min_beds !== undefined)
        queryParams.append("min_bedrooms", filters.min_beds.toString());
      if (filters.max_beds !== undefined)
        queryParams.append("max_bedrooms", filters.max_beds.toString());
      if (filters.min_baths !== undefined)
        queryParams.append("min_bathrooms", filters.min_baths.toString());
      if (filters.max_baths !== undefined)
        queryParams.append("max_bathrooms", filters.max_baths.toString());
      
      // For studio-only apartments, set min and max bedrooms to 0
      // This block is only needed if we have a specific studio flag, 
      // but we're handling studios through min_beds=0 now
      if (filters.studio) {
        queryParams.append("min_bedrooms", "0");
        queryParams.append("max_bedrooms", "0");
      }
    }
    
    // Build the full API URL
    const apiUrl = `${API_ENDPOINTS.search}?${queryParams.toString()}`;
    
    // Set up AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
      // Make the API request
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to search apartments: ${response.status} ${response.statusText}`);
      }
      
      const data: SearchResponse = await response.json();
      
      // Check if API returned valid results
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }
      
      // Process results
      const mappedProperties = data.results
        .map(match => {
          try {
            return mapMetadataToProperty(match);
          } catch (err) {
            return null;
          }
        })
        .filter((p): p is Property => p !== null);
      
      return mappedProperties;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred during apartment search');
  }
};

// Fetch apartment preview by ID with optional search query
export const fetchApartmentPreview = async (id: string, query?: string): Promise<Property> => {
  try {
    // If using test data, return mock data
    if (USE_TEST_DATA) {
      return mockSearchResults()[0];
    }
    
    // Set up AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT * 1.5);
    
    // Build URL with query parameter if provided
    let url = `${API_ENDPOINTS.apartmentPreview}/${id}`;
    if (query) {
      url += `?query=${encodeURIComponent(query)}`;
    }
    
    try {
      // Make the API request
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch apartment preview: ${response.status} ${response.statusText}`);
      }
      
      const data: ApartmentPreviewResponse = await response.json();
      
      if (!data.apartment) {
        throw new Error("Invalid API response format, apartment not found");
      }
      
      return mapApartmentPreviewToProperty(data.apartment);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unknown error fetching apartment preview for ID ${id}`);
  }
};

// Fetch detailed apartment data by ID with optional search query
export const fetchApartmentDetails = async (id: string, query?: string): Promise<any> => {
  try {
    // If using test data, return mock data
    if (USE_TEST_DATA) {
      return mockSearchResults()[0];
    }
    
    // Set up AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT * 2);
    
    // Build URL with query parameter if provided
    let url = `${API_ENDPOINTS.apartmentDetails}/${id}`;
    if (query) {
      url += `?query=${encodeURIComponent(query)}`;
    }
    
    try {
      // Make the API request
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch apartment details: ${response.status} ${response.statusText}`);
      }
      
      const data: ApartmentDetailsResponse = await response.json();
      return data.apartment;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unknown error fetching apartment details for ID ${id}`);
  }
};
