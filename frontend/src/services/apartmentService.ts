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

// New interface for apartment preview data
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

// New interface for apartment preview response
interface ApartmentPreviewResponse {
  apartment: ApartmentPreview;
}

// New interface for apartment details response
interface ApartmentDetailsResponse {
  apartment: any; // Full apartment object
}

// Convert Pinecone metadata to frontend Property type
const mapMetadataToProperty = (match: SearchResponseMatch): Property => {
  // Validate that metadata exists and is an object
  const metadata = match.metadata && typeof match.metadata === "object" ? match.metadata : {};

  console.log("Processing match:", match);
  console.log("Match metadata:", metadata);

  // Default image if none provided
  const defaultImage =
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80";

  // Check if image_urls exists and is an array
  let images;
  if (Array.isArray(metadata.image_urls) && metadata.image_urls.length > 0) {
    images = metadata.image_urls;
  } else if (typeof metadata.image_urls === "string") {
    // Handle the case where image_urls might be a string
    images = [metadata.image_urls];
  } else {
    images = [defaultImage];
  }

  // Parse features from amenities if available
  let features: string[] = [];
  if (metadata.amenities && typeof metadata.amenities === "object") {
    features = Object.keys(metadata.amenities)
      .filter((key) => metadata.amenities[key] === "true")
      .map((key) =>
        key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      );
  }

  // Format the address only if components exist
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

  // If we still don't have an address
  if (!address) address = "Location information unavailable";

  return {
    id: match.id || `property-${Math.random().toString(36).substr(2, 9)}`,
    title: metadata.property_name || "Apartment",
    address: address,
    price: typeof metadata.min_rent === "number" ? metadata.min_rent : 0,
    bedrooms: typeof metadata.min_beds === "number" ? metadata.min_beds : 0,
    bathrooms: typeof metadata.min_baths === "number" ? metadata.min_baths : 1,
    squareFeet: typeof metadata.square_feet === "number" ? metadata.square_feet : 0,
    images: images,
    description: metadata.description || "",
    features: features,
  };
};

// Map apartment preview to Property interface
export const mapApartmentPreviewToProperty = (preview: ApartmentPreview): Property => {
  // Extract numeric value from beds string (e.g., "Studio - 1 bd" -> 1)
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

  // Extract numeric value from baths string
  let bathrooms = 0;
  if (preview.baths) {
    const bathsMatch = preview.baths.match(/(\d+)/g);
    if (bathsMatch && bathsMatch.length > 0) {
      bathrooms = parseInt(bathsMatch[0], 10) || 0;
    }
  }

  // Extract min sqft value
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
    images: preview.photos ? preview.photos : [],
    description: "",
    features: [],
    coordinates: preview.coordinates || undefined,
  };
};

// Mock data for testing
const mockSearchResults = (query: string): Property[] => {
  console.log(`Generating mock results for query: ${query}`);
  // Return a few mock properties
  return [
    {
      id: "mock1",
      title: "Luxury Downtown Apartment",
      address: "123 Main St, Los Angeles, CA",
      price: 2500,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1200,
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
      ],
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
};

// Function to search apartments with semantic search
export const searchApartments = async (params: SearchParams): Promise<Property[]> => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append("query", params.query);

    if (params.limit) {
      queryParams.append("limit", params.limit.toString());
    }

    // Add pagination parameter
    if (params.page) {
      queryParams.append("page", params.page.toString());
    }

    // Add image URLs if provided
    if (params.imageUrls && params.imageUrls.length > 0) {
      // Join the image URLs with a delimiter that's safe for URLs
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

      // For studio apartments, set min and max bedrooms to 0
      if (filters.studio) {
        queryParams.append("min_bedrooms", "0");
        queryParams.append("max_bedrooms", "0");
      }

    }

    // Build the full API URL
    const apiUrl = `${API_ENDPOINTS.search}?${queryParams.toString()}`;

    console.log("Making API request to:", apiUrl);
    console.log("With query params:", Object.fromEntries(queryParams.entries()));

    // Set up AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    // Make sure we're using GET method, not OPTIONS
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: controller.signal,
      // Ensure this is treated as a normal request, not a preflight OPTIONS
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
    });

    // Clear the timeout
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error response:", errorText);
      throw new Error(`Failed to search apartments: ${response.status} ${response.statusText}`);
    }

    const data: SearchResponse = await response.json();
    console.log("%c API Response Data:", "background: #222; color: #bada55", data);
    console.log("Response data type:", typeof data);
    console.log("Results property:", data.results);
    console.log("Results count:", data.results?.length || 0);
    console.log("Results type:", Array.isArray(data.results) ? "array" : typeof data.results);

    // Check if API returned valid results
    if (!data.results || !Array.isArray(data.results)) {
      console.error("Invalid API response format, results not found or not an array:", data);
      return [];
    }

    // Process each result item individually for better debugging
    const mappedProperties = [];
    for (let i = 0; i < data.results.length; i++) {
      try {
        const match = data.results[i];
        console.log(`Processing result ${i}:`, match);
        const mappedProperty = mapMetadataToProperty(match);
        console.log(`Mapped property ${i}:`, mappedProperty);
        mappedProperties.push(mappedProperty);
      } catch (err) {
        console.error(`Error mapping result ${i}:`, err, data.results[i]);
      }
    }

    console.log(
      "%c Final mapped properties:",
      "background: #222; color: #bada55",
      mappedProperties
    );
    console.log(`Total mapped properties: ${mappedProperties.length}`);

    return mappedProperties;
  } catch (error) {
    console.error("Error searching apartments:", error);

    // Rethrow the error to be handled by the component
    throw error;
  }
};

// New function to fetch apartment preview by ID with optional search query
export const fetchApartmentPreview = async (id: string, query?: string): Promise<Property> => {
  try {
    // If using test data, return mock data
    if (USE_TEST_DATA) {
      return mockSearchResults("")[0];
    }

    // Increase timeout for preview requests
    const previewTimeout = API_TIMEOUT * 1.5; // 15 seconds instead of default 10

    // Set up AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(
        `Timeout (${previewTimeout}ms) reached for apartment preview ${id}, aborting request`
      );
      controller.abort("timeout");
    }, previewTimeout);

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

      // Clear the timeout as soon as response is received
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(
          `Failed to fetch apartment preview: ${response.status} ${response.statusText}`
        );
      }

      const data: ApartmentPreviewResponse = await response.json();

      // Map the preview data to Property type
      if (!data.apartment) {
        throw new Error("Invalid API response format, apartment not found");
      }

      const property = mapApartmentPreviewToProperty(data.apartment);
      return property;
    } catch (fetchError) {
      // Clear the timeout if there was an error
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    // Better error reporting
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(`Request for apartment ${id} was aborted (likely due to timeout)`);
      } else {
        console.error(`Error fetching apartment preview for ID ${id}:`, error.message);
      }
    } else {
      console.error(`Unknown error fetching apartment preview for ID ${id}:`, error);
    }
    throw error;
  }
};

// New function to fetch detailed apartment data by ID with optional search query
export const fetchApartmentDetails = async (id: string, query?: string): Promise<any> => {
  try {
    // If using test data, return mock data
    if (USE_TEST_DATA) {
      return mockSearchResults("")[0];
    }

    // Increase timeout for details requests
    const detailsTimeout = API_TIMEOUT * 2; // 20 seconds instead of default 10

    // Set up AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(
        `Timeout (${detailsTimeout}ms) reached for apartment details ${id}, aborting request`
      );
      controller.abort("timeout");
    }, detailsTimeout);

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

      // Clear the timeout as soon as response is received
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(
          `Failed to fetch apartment details: ${response.status} ${response.statusText}`
        );
      }

      const data: ApartmentDetailsResponse = await response.json();
      return data.apartment;
    } catch (fetchError) {
      // Clear the timeout if there was an error
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    // Better error reporting
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(`Details request for apartment ${id} was aborted (likely due to timeout)`);
      } else {
        console.error(`Error fetching apartment details for ID ${id}:`, error.message);
      }
    } else {
      console.error(`Unknown error fetching apartment details for ID ${id}:`, error);
    }
    throw error;
  }
};
