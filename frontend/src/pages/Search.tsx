import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import SearchFilters, { SearchFilterValues } from "../components/search/SearchFilters";
import PropertyGrid from "../components/search/PropertyGrid";
import { searchApartments, fetchApartmentPreview } from "../services/apartmentService";
import { useSearch } from "../contexts/SearchContext";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon, LatLngExpression, LatLngBoundsExpression, LatLngTuple } from "leaflet";
import { Map as MapIcon, List, X, Loader2, LayoutGrid, MapPin, Bed, Bath, Square } from "lucide-react";
import { Property } from "../components/search/PropertyCard";
import { cn } from "../lib/utils";

// Number of items to fetch per page
const ITEMS_PER_PAGE = 25;

// Fix Leaflet icon issue
// @ts-ignore - Needed to fix Leaflet icon issue
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Define custom marker icon
const customIcon = new Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  shadowSize: [41, 41],
});

// Default center location (San Francisco coordinates)
const DEFAULT_CENTER: LatLngExpression = [37.7749, -122.4194];
const DEFAULT_ZOOM = 12;

// Helper component to update map view when bounds change
const MapBoundsUpdater = ({ bounds }: { bounds: LatLngBoundsExpression | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);
  return null;
};

// Calculate map bounds from property locations
const calculateMapBounds = (properties: PropertyWithLocation[]): LatLngBoundsExpression | null => {
  const propertiesWithLocation = properties.filter((p) => p.location);
  if (propertiesWithLocation.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  propertiesWithLocation.forEach((property) => {
    if (property.location) {
      minLat = Math.min(minLat, property.location.lat);
      maxLat = Math.max(maxLat, property.location.lat);
      minLng = Math.min(minLng, property.location.lng);
      maxLng = Math.max(maxLng, property.location.lng);
    }
  });

  // Add some padding to the bounds
  const latPadding = (maxLat - minLat) * 0.1;
  const lngPadding = (maxLng - minLng) * 0.1;

  return [
    [minLat - latPadding, minLng - lngPadding] as LatLngTuple,
    [maxLat + latPadding, maxLng + lngPadding] as LatLngTuple,
  ];
};

// Custom interface for property with location data
interface PropertyWithLocation extends Property {
  location?: {
    lat: number;
    lng: number;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  hasError?: boolean;
  isPlaceholder?: boolean;
}

// Shimmer effect component for loading state
const ShimmerEffect = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "animate-pulse rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
      className
    )}
  ></div>
);

// ShimmerPropertyCard component for loading state
const ShimmerPropertyCard = ({ index }: { index: number }) => {
  return (
    <div className="p-2 mb-2 rounded-lg">
      <div className="flex">
        <div className="w-40 h-40 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <ShimmerEffect className="w-full h-full" />
        </div>
        <div className="ml-3 flex-grow">
          <ShimmerEffect className="h-4 w-20 mb-2" />
          <ShimmerEffect className="h-4 w-full mb-2" />
          <ShimmerEffect className="h-3 w-3/4 mb-2" />
          <div className="flex gap-2 mt-1">
            <ShimmerEffect className="h-3 w-12" />
            <div className="w-1"></div>
            <ShimmerEffect className="h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
};

const UnifiedSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialImageUrls = searchParams.get("imageUrls")
    ? JSON.parse(searchParams.get("imageUrls") || "[]")
    : [];
  const viewParam = searchParams.get("view") || "map"; // Default to map view

  // Use the search context
  const {
    apartmentIds,
    setApartmentIds,
    searchTerm,
    setSearchTerm,
    filterValues,
    setFilterValues,
    searchPerformed,
    setSearchPerformed,
    imageUrls,
    setImageUrls,
    searchType,
    setSearchType,
    hasResults,
  } = useSearch();

  // View toggle state (map or list)
  const [currentView, setCurrentView] = useState<"map" | "list">(
    viewParam === "list" ? "list" : "map"
  );

  // Properties for map view
  const [properties, setProperties] = useState<PropertyWithLocation[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithLocation | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(DEFAULT_CENTER);
  const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | null>(null);
  const [placeholderCount, setPlaceholderCount] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // State for both views
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // State for list view pagination
  const [page, setPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Track if we've loaded property details for display
  const [loadedPropertyDetails, setLoadedPropertyDetails] = useState<Record<string, boolean>>({});

  // Reference to track if we already restored from URL
  const hasRestoredFromUrl = React.useRef(false);

  const formatSquareFeet = (sqft: number | undefined): string => {
    if (typeof sqft !== "number" || isNaN(sqft)) return "0";
    return sqft.toLocaleString();
  };

  // Update URL when view changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", currentView);
    setSearchParams(newParams, { replace: true });
  }, [currentView, setSearchParams]);

  // Reset loaded property details when search term changes
  useEffect(() => {
    setLoadedPropertyDetails({});
  }, [searchTerm, initialQuery]);

  // Add effect to update map bounds when properties change
  useEffect(() => {
    if (properties.length > 0 && currentView === "map") {
      const bounds = calculateMapBounds(properties);
      if (bounds) {
        setMapBounds(bounds);
      }
    }
  }, [properties, currentView]);

  // Update map center when a property is selected
  useEffect(() => {
    if (selectedProperty?.location) {
      setMapCenter([selectedProperty.location.lat, selectedProperty.location.lng]);
    }
  }, [selectedProperty]);

  // Perform search when the component mounts if there's an initial query or image URLs
  useEffect(() => {
    // Only run this effect once per mount or when search parameters actually change
    if (
      hasRestoredFromUrl.current &&
      !searchParams.toString().includes("q=") &&
      !searchParams.toString().includes("imageUrls=")
    )
      return;

    if (!hasRestoredFromUrl.current) {
      hasRestoredFromUrl.current = true;
    }

    // Set initial state based on URL parameters
    const setupSearch = async () => {
      console.log("Setting up search with URL parameters:", {
        query: initialQuery,
        imageUrls: initialImageUrls.length ? `${initialImageUrls.length} URLs` : "none",
        currentContext: {
          searchTerm,
          imageUrls: imageUrls.length,
          searchPerformed,
        },
        currentView,
      });

      // Check if we need to perform a search or we're returning to an existing search
      const urlHasQuery = !!initialQuery.trim();
      const urlHasImages = initialImageUrls.length > 0;
      const contextHasSearch = searchPerformed && (searchTerm || imageUrls.length > 0);

      console.log("Search state:", {
        urlHasQuery,
        urlHasImages,
        contextHasSearch,
        hasResults,
        apartmentIds: apartmentIds.length,
        propertiesLoaded: properties.length,
      });

      // Case 1: URL has new search parameters - always do a fresh search
      if (
        (urlHasQuery && initialQuery !== searchTerm) ||
        (urlHasImages && JSON.stringify(initialImageUrls) !== JSON.stringify(imageUrls))
      ) {
        // Determine search type
        let newSearchType: "text" | "image" | "both" | "none" = "none";
        if (urlHasQuery && urlHasImages) {
          newSearchType = "both";
        } else if (urlHasQuery) {
          newSearchType = "text";
        } else if (urlHasImages) {
          newSearchType = "image";
        }

        // Apply context updates
        if (urlHasImages) {
          setImageUrls(initialImageUrls);
        }

        if (urlHasQuery) {
          setSearchTerm(initialQuery);
        }

        setSearchType(newSearchType);

        // Perform the search
        console.log("Initiating fresh search from URL parameters");
        setLoading(true);

        try {
          await fetchResults(
            {
              query: initialQuery,
            },
            1
          );

          console.log("Fresh search completed successfully");
        } catch (error) {
          console.error("Error performing fresh search:", error);
        } finally {
          setLoading(false);
        }
      }
      // Case 2: URL has same search params and we have results - don't re-fetch
      else if ((urlHasQuery || urlHasImages) && hasResults) {
        console.log("URL matches existing search with results - no need to re-fetch");
        // Ensure UI reflects the current state
        if (urlHasQuery) {
          setSearchTerm(initialQuery);
        }
        if (urlHasImages) {
          setImageUrls(initialImageUrls);
        }

        // For map view, we need to load property details from IDs
        if (currentView === "map" && apartmentIds.length > 0 && properties.length === 0) {
          console.log("Loading property details for map view with existing IDs");
          loadPropertiesForMapView(apartmentIds);
        }
      }
      // Case 3: No URL params but we have a search with results in context
      else if (contextHasSearch && hasResults) {
        console.log("Using existing search results from context");
        // For map view, we need to load property details from IDs
        if (currentView === "map" && apartmentIds.length > 0 && properties.length === 0) {
          console.log("Loading property details for map view with context IDs");
          loadPropertiesForMapView(apartmentIds);
        }
      }
      // Case 4: We have search criteria but no results - need to fetch
      else if (contextHasSearch) {
        console.log("Search criteria exist but no results - fetching data");
        setLoading(true);

        try {
          await fetchResults(
            {
              query: searchTerm,
            },
            1
          );

          console.log("Search data fetch completed");
        } catch (error) {
          console.error("Error fetching search results:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    setupSearch();
    // Explicitly exclude currentView from the dependency array to prevent refetching when toggling views
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialQuery,
    initialImageUrls,
    searchTerm,
    imageUrls,
    apartmentIds.length,
    hasResults,
    searchPerformed,
  ]);

  // Improved loadPropertyDetails function with better error handling and state tracking
  const loadPropertyDetails = async (propertyId: string) => {
    // Check if property details are already loaded
    const propertyIsAlreadyLoaded = loadedPropertyDetails[propertyId];
    const existingProperty = properties.find((p) => p.id === propertyId && !p.isPlaceholder);

    // Skip loading if property is already loaded and search term hasn't changed
    if (propertyIsAlreadyLoaded && existingProperty && !searchTerm && !initialQuery) {
      console.log(`Property ${propertyId} already loaded, skipping fetch`);
      return;
    }

    console.log(
      `Loading property details for ${propertyId} with search term: ${
        searchTerm || initialQuery || "none"
      }`
    );

    // Track if this is a retry
    let retryCount = 0;
    const maxRetries = 2;

    // Mark as loading
    setLoadedPropertyDetails((prev) => ({ ...prev, [propertyId]: false }));

    const loadWithRetry = async (): Promise<void> => {
      try {
        // Pass the search term to order images by relevance to the query
        const property = await fetchApartmentPreview(propertyId, searchTerm || initialQuery);

        // Find existing placeholder for this property to maintain position on map
        const placeholder = properties.find((p) => p.id === propertyId);

        const propertyWithLocation: PropertyWithLocation = {
          ...property,
          location: property.coordinates
            ? {
                lat: property.coordinates.latitude,
                lng: property.coordinates.longitude,
              }
            : {
                // Use existing placeholder location if available, or generate random coordinates
                lat: placeholder?.location?.lat || 37.7749 + (Math.random() - 0.5) * 0.05,
                lng: placeholder?.location?.lng || -122.4194 + (Math.random() - 0.5) * 0.05,
              },
        };

        // Update the properties list by replacing the placeholder with the actual property
        setProperties((prev) => {
          // Create a new array to avoid mutation
          const updated = [...prev];

          // Find index of existing property or placeholder
          const idx = updated.findIndex((p) => p.id === propertyId);

          if (idx !== -1) {
            // Replace existing entry
            updated[idx] = propertyWithLocation;
          } else {
            // Add as new property
            updated.push(propertyWithLocation);
          }

          return updated;
        });

        // Mark as successfully loaded
        setLoadedPropertyDetails((prev) => ({ ...prev, [propertyId]: true }));

        console.log(`Successfully loaded property ${propertyId}`);
      } catch (err) {
        // Check if it's an AbortError and we haven't exceeded max retries
        if (err instanceof Error && err.name === "AbortError" && retryCount < maxRetries) {
          console.warn(
            `Retry attempt ${retryCount + 1} for property ${propertyId} after AbortError`
          );
          retryCount++;

          // Add a small delay before retrying (increases with each retry)
          await new Promise((resolve) => setTimeout(resolve, 300 * retryCount));
          return loadWithRetry();
        }

        // For other errors or if max retries reached, log and continue
        console.error(`Error loading property ${propertyId}:`, err);

        // Find existing placeholder to maintain position
        const placeholder = properties.find((p) => p.id === propertyId);

        // Create a property with error state
        const errorProperty: PropertyWithLocation = {
          id: propertyId,
          title: "Unable to load property",
          address: "Error retrieving property details",
          price: 0,
          bedrooms: 0,
          bathrooms: 0,
          squareFeet: 0,
          images: [],
          description: "",
          features: [],
          hasError: true,
          location: {
            // Use existing placeholder location if available, or generate random coordinates
            lat: placeholder?.location?.lat || 37.7749 + (Math.random() - 0.5) * 0.05,
            lng: placeholder?.location?.lng || -122.4194 + (Math.random() - 0.5) * 0.05,
          },
        };

        // Update the properties list by replacing the placeholder with the error property
        setProperties((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((p) => p.id === propertyId);
          if (idx !== -1) {
            updated[idx] = errorProperty;
          } else {
            updated.push(errorProperty);
          }
          return updated;
        });

        // Mark as loaded (with error) to prevent endless retries
        setLoadedPropertyDetails((prev) => ({ ...prev, [propertyId]: true }));
      }
    };

    // Start the loading process with retry capability
    await loadWithRetry();
  };

  // Load properties for map view based on IDs
  const loadPropertiesForMapView = async (ids: string[]) => {
    if (!ids.length) return;

    // Make sure we're working with unique IDs
    const uniqueIds = Array.from(new Set(ids));

    if (uniqueIds.length !== ids.length) {
      console.log(
        `Removed ${ids.length - uniqueIds.length} duplicate IDs from property loading list`
      );
    }

    setLoadingDetails(true);
    setError(undefined);

    try {
      // Filter out IDs that already have non-placeholder properties loaded
      const existingPropertyIds = new Set(
        properties.filter((p) => !p.isPlaceholder && !p.hasError).map((p) => p.id)
      );

      const idsToLoad = uniqueIds.filter((id) => !existingPropertyIds.has(id));

      console.log(
        `Loading properties for map view: ${idsToLoad.length} new properties to load, ${existingPropertyIds.size} already loaded`
      );

      if (idsToLoad.length === 0 && existingPropertyIds.size > 0) {
        // All properties already loaded, nothing to do
        console.log("All properties already loaded for map view");
        setLoadingDetails(false);
        return;
      }

      // Create placeholders for all properties to load
      const newPlaceholders: PropertyWithLocation[] = idsToLoad.map((id) => ({
        id,
        title: "Loading...",
        address: "Loading...",
        price: 0,
        bedrooms: 0,
        bathrooms: 0,
        squareFeet: 0,
        images: [],
        description: "",
        features: [],
        isPlaceholder: true,
        location: {
          lat: 37.7749 + (Math.random() - 0.5) * 0.05,
          lng: -122.4194 + (Math.random() - 0.5) * 0.05,
        },
      }));

      // Add all placeholders at once
      setProperties((prev) => [...prev, ...newPlaceholders]);

      // Process in batches of 10
      const batchSize = 10;
      let errorCount = 0;

      for (let i = 0; i < idsToLoad.length; i += batchSize) {
        const batch = idsToLoad.slice(i, i + batchSize);
        console.log(`Loading batch ${i / batchSize + 1}: ${batch.length} properties`);

        // Load all properties in the current batch in parallel
        const batchPromises = batch.map(async (id) => {
          try {
            await loadPropertyDetails(id);
          } catch (err) {
            errorCount++;
            console.error(`Error loading property details for ${id}:`, err);
          }
        });

        // Wait for the current batch to complete before moving to the next
        await Promise.all(batchPromises);

        // Add a small delay between batches to prevent overwhelming the API
        if (i + batchSize < idsToLoad.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(`Completed loading ${idsToLoad.length} properties with ${errorCount} errors`);

      if (errorCount > 0) {
        console.warn(`Encountered ${errorCount} errors while loading properties`);
      }
    } catch (err) {
      console.error("Error in loadPropertiesForMapView:", err);
      setError("Failed to load some property details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handler for map view search
  const handleMapSearch = async (filters: SearchFilterValues) => {
    setLoading(true);
    setError(undefined);
    setSearchTerm(filters.query);
    setFilterValues(filters);
    setPage(1);
    setHasMoreResults(true);

    // When performing a new search, clear property details to ensure we get fresh data
    setProperties([]);
    setLoadedPropertyDetails({});

    // Determine and set the searchType based on the current search parameters
    const hasQuery = !!filters.query.trim();
    const hasImages = imageUrls.length > 0;

    if (hasQuery && hasImages) {
      setSearchType("both");
    } else if (hasQuery) {
      setSearchType("text");
    } else if (hasImages) {
      setSearchType("image");
    } else {
      setSearchType("none");
    }

    try {
      // Build search params for URL
      const newSearchParams = new URLSearchParams(searchParams);
      if (filters.query) {
        newSearchParams.set("q", filters.query);
      } else {
        newSearchParams.delete("q");
      }

      // Keep image URLs in the URL if they exist
      if (initialImageUrls.length > 0) {
        newSearchParams.set("imageUrls", JSON.stringify(initialImageUrls));
      } else if (imageUrls.length > 0) {
        newSearchParams.set("imageUrls", JSON.stringify(imageUrls));
      } else {
        newSearchParams.delete("imageUrls");
      }

      // Keep view parameter
      newSearchParams.set("view", currentView);

      // Update URL query parameters
      setSearchParams(newSearchParams);

      // Perform search to get IDs
      console.log("Fetching search results with filters:", filters);
      const results = await fetchResults(filters, 1);

      // If in map view, load property details
      if (currentView === "map" && results && results.length > 0) {
        console.log(
          `Search returned ${results.length} results, loading property details for map view`
        );
        await loadPropertiesForMapView(results);
      } else {
        console.log(
          `Search returned ${results?.length || 0} results (in list view, not loading details)`
        );
      }
    } catch (err) {
      console.error("Unexpected error during search:", err);
      setError("An unexpected error occurred. Please try again.");
      setApartmentIds([]);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to load more results when scrolling (only for list view)
  const handleLoadMore = async () => {
    if (!hasMoreResults || loadingMore || loading || !filterValues || currentView !== "list")
      return;

    const nextPage = page + 1;
    console.log(`Loading more results: page ${nextPage}`);
    setLoadingMore(true);

    try {
      await fetchResults(filterValues, nextPage);
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more results:", err);
      // Don't show error UI, just stop pagination
      setHasMoreResults(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Shared function to fetch results (used by both views)
  const fetchResults = async (searchFilterValues: SearchFilterValues, pageNum: number) => {
    // Choose the correct image URLs (from the URL parameters or context)
    const urls = initialImageUrls.length > 0 ? initialImageUrls : imageUrls;

    console.log("Fetching results with parameters:", {
      query: searchFilterValues.query,
      page: pageNum,
      imageUrls: urls.length > 0 ? `${urls.length} URLs` : "none",
      searchType,
    });

    // Prepare filter parameters for API
    const searchParams = {
      query: searchFilterValues.query || initialQuery, // Use the query from URL if none in filters
      filters: {
        min_beds: searchFilterValues.min_beds,
        max_beds: searchFilterValues.max_beds,
        min_baths: searchFilterValues.min_baths,
        max_baths: searchFilterValues.max_baths,
        min_rent: searchFilterValues.min_rent,
        max_rent: searchFilterValues.max_rent,
        studio: searchFilterValues.studio,
      },
      limit: ITEMS_PER_PAGE, // Request smaller chunks
      page: pageNum, // Add page parameter
      imageUrls: urls, // Add image URLs from URL parameters or context
    };

    try {
      // Perform search
      const results = await searchApartments(searchParams);

      // If we got fewer results than requested, there are no more pages
      if (results.length < ITEMS_PER_PAGE) {
        setHasMoreResults(false);
      }

      // Extract just the IDs from the search results
      const ids = results.map((property) => property.id);

      // For the first page, replace results; otherwise append
      if (pageNum === 1) {
        console.log(`Page 1: Replacing all apartment IDs with ${ids.length} new IDs`);
        setApartmentIds(ids);
      } else {
        // Get current IDs and append new ones, removing duplicates
        const currentIds = new Set(apartmentIds);

        // Count how many new (unique) IDs we're adding
        const newUniqueIds = ids.filter((id) => !currentIds.has(id));

        console.log(
          `Page ${pageNum}: Adding ${newUniqueIds.length} new unique IDs to existing ${currentIds.size} IDs`
        );

        // Create a merged array with no duplicates
        const allIds = [...apartmentIds];

        // Only add IDs that don't already exist
        ids.forEach((id) => {
          if (!currentIds.has(id)) {
            allIds.push(id);
          }
        });

        setApartmentIds(allIds);
      }

      setSearchPerformed(true);

      console.log(`Page ${pageNum}: Loaded ${ids.length} apartment IDs`);

      // Clear any previous errors if successful
      setError(undefined);

      return ids;
    } catch (apiError: any) {
      // Handle API-specific errors
      console.error("API Error:", apiError);

      if (apiError.name === "AbortError") {
        setError("Request timed out. Please try again later.");
      } else if (
        apiError.message?.includes("Failed to fetch") ||
        apiError.message?.includes("NetworkError")
      ) {
        setError(
          "Cannot connect to the search server. Please check your connection and try again."
        );
      } else {
        // Show a more detailed error if available
        const errorMessage = apiError.message || "Unknown error occurred";
        setError(`Error searching properties: ${errorMessage}`);
      }

      // If this is the first page, clear results
      if (pageNum === 1) {
        setApartmentIds([]);
        setProperties([]);
      }

      throw apiError;
    }
  };

  // Toggle between map and list views
  const toggleView = () => {
    const newView = currentView === "map" ? "list" : "map";
    setCurrentView(newView);

    console.log(
      `Toggling view from ${currentView} to ${newView}. Current apartment IDs: ${apartmentIds.length}`
    );

    // If switching to map view and we have apartment IDs but no property details loaded, load them
    if (newView === "map" && apartmentIds.length > 0) {
      // Only load properties if we don't have them already or if there's a mismatch in counts
      const loadedPropertyCount = properties.filter((p) => !p.isPlaceholder).length;
      const mismatchInCounts = loadedPropertyCount < apartmentIds.length;

      if (properties.length === 0 || mismatchInCounts) {
        console.log(
          `Loading property details for map view: ${properties.length} properties loaded, ${apartmentIds.length} IDs available`
        );
        loadPropertiesForMapView(apartmentIds);
      } else {
        console.log(
          `Reusing existing property details for map view: ${properties.length} properties already loaded`
        );
      }
    }

    // When switching to list view, ensure we're not creating duplicates
    // The PropertyGrid component already handles pagination from the existing apartmentIds
    if (newView === "list") {
      console.log("Switched to list view - ensuring no duplicates in apartment IDs");

      // No need to modify the apartment IDs here - just ensure PropertyGrid uses them correctly
      // Reset pagination to show from the beginning
      setPage(1);
    }
  };

  // Render the map view
  const renderMapView = () => (
    <div className="flex w-full h-full">
      {/* Left sidebar for property listings */}
      <div
        className={`w-[500px] h-full bg-white border-r transition-all duration-300 transform ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Fixed header */}
        <div className="p-4 border-b bg-white sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-md font-semibold font-sans">
              {searchType === "text" && (searchTerm || initialQuery) && (
                <span>
                  <span className="whitespace-nowrap text-vibe-navy">{properties.length} results</span>
                  <span className="ml-1 font-normal text-vibe-charcoal/70">for "</span>
                  <span className="font-normal text-vibe-charcoal/70 break-all">{decodeURIComponent(searchTerm || initialQuery)}</span>
                  <span className="font-normal text-vibe-charcoal/70">"</span>
                </span>
              )}
              {searchType === "image" && (
                <span>
                  <span className="whitespace-nowrap text-vibe-navy">{properties.length} results</span>
                  <span className="ml-1 font-normal text-vibe-charcoal/70">that match your images</span>
                </span>
              )}
              {searchType === "both" && (searchTerm || initialQuery) && (
                <span>
                  <span className="whitespace-nowrap text-vibe-navy">{properties.length} results</span>
                  <span className="ml-1 font-normal text-vibe-charcoal/70"> that match your images and "</span>
                  <span className="font-normal text-vibe-charcoal/70 break-all">{decodeURIComponent(searchTerm || initialQuery)}</span>
                  <span className="font-normal text-vibe-charcoal/70">"</span>
                </span>
              )}
              {(!searchType || searchType === "none" || (searchType !== "image" && !searchTerm && !initialQuery)) && (
                <span className="whitespace-nowrap text-vibe-navy">{properties.length} results</span>
              )}
            </h2>
            <button
              className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden"
              onClick={() => setShowSidebar(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto h-[calc(100%-64px)]">
          <div className="p-2">
            {loading && properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading properties...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-500">{error}</p>
                <button
                  className="mt-2 text-primary hover:underline"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>
            ) : properties.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground">No Properties Found</p>
              </div>
            ) : (
              properties.map((property) => (
                <div
                  key={property.id}
                  className={`p-2 mb-2 mr-2 rounded-lg transition-all cursor-pointer hover:bg-gray-50 ${
                    selectedProperty?.id === property.id ? "ring-2 ring-[#0F4C81]" : ""
                  } ${property.hasError ? "opacity-60" : ""}`}
                  onClick={() => !property.hasError && setSelectedProperty(property)}
                >
                  {property.isPlaceholder ? (
                    <ShimmerPropertyCard index={Number(property.id)} />
                  ) : (
                    <div className="flex">
                      <div className="w-40 h-40 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {property.hasError ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <span className="text-gray-500 text-xs text-center px-1">
                              Unable to load
                            </span>
                          </div>
                        ) : (
                          <img
                            src={
                              property.images && property.images.length > 0
                                ? property.images[0]
                                : "https://placehold.co/600x400?text=No+Image"
                            }
                            alt={property.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://placehold.co/600x400?text=Error";
                            }}
                          />
                        )}
                      </div>
                      <div className="ml-3 flex-grow flex flex-col h-40">
                        {property.hasError ? (
                          <>
                            <p className="font-medium text-sm text-gray-600">
                              Unable to load property
                            </p>
                            <p className="text-xs text-red-500">Retry search or try again later</p>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="font-semibold text-vibe-navy font-sans line-clamp-1">{property.title}</h3>
                              <p className="font-semibold text-vibe-charcoal/70 font-sans">
                                ${property.price.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center text-vibe-charcoal/70 text-sm mb-4">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{property.address || "Address unavailable"}</span>
                            </div>
                            <div className="flex-grow"></div>
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex items-center text-vibe-charcoal/70">
                                <Bed className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
                                <span className="text-sm">
                                  {typeof property.bedrooms === "number" ? property.bedrooms : 0} bed
                                </span>
                              </div>

                              <div className="flex items-center text-vibe-charcoal/70">
                                <Bath className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
                                <span className="text-sm">
                                  {typeof property.bathrooms === "number" ? property.bathrooms : 0} bath
                                </span>
                              </div>

                              <div className="flex items-center text-vibe-charcoal/70">
                                <Square className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
                                <span className="text-sm">{formatSquareFeet(property.squareFeet)} sq ft</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          {properties.length > 0 ? (
            <MapContainer
              center={mapCenter}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mapBounds && <MapBoundsUpdater bounds={mapBounds} />}

              {properties
                .filter((p) => p.location && !p.isPlaceholder)
                .map(
                  (property) =>
                    property.location && (
                      <Marker
                        key={property.id}
                        position={[property.location.lat, property.location.lng]}
                        icon={customIcon}
                        eventHandlers={{
                          click: () => {
                            setSelectedProperty(property);
                          },
                        }}
                      >
                        <Popup>
                          <div className="text-center">
                            <h3 className="font-medium">{property.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              ${property.price.toLocaleString()}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )
                )}
            </MapContainer>
          ) : (
            <div className="h-full w-full bg-gray-100 flex items-center justify-center">
              {loading ? (
                <div className="text-center">
                  <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Loading map data...</p>
                </div>
              ) : (
                <div className="text-center">
                  <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No Properties to Display<br />
                    Try Refining Your Search!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Property popup */}
        {selectedProperty && !selectedProperty.isPlaceholder && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-[1000]">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-slide-up">
              <div className="relative">
                <img
                  src={
                    selectedProperty.images && selectedProperty.images.length > 0
                      ? selectedProperty.images[0]
                      : "https://placehold.co/600x400?text=No+Image"
                  }
                  alt={selectedProperty.title}
                  className="w-full h-48 object-cover"
                />
                <button
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-gray-700 shadow-sm"
                  onClick={() => setSelectedProperty(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{selectedProperty.title}</h3>
                  <p className="text-lg font-semibold text-primary">
                    ${selectedProperty.price.toLocaleString()}
                  </p>
                </div>

                <p className="text-muted-foreground text-sm mb-3">{selectedProperty.address}</p>

                <div className="flex items-center justify-between py-2 border-y border-gray-100">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Beds</p>
                    <p className="font-medium">{selectedProperty.bedrooms}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Baths</p>
                    <p className="font-medium">{selectedProperty.bathrooms}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Sq Ft</p>
                    <p className="font-medium">{selectedProperty.squareFeet.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <a
                    href={`/property/${selectedProperty.id}`}
                    className="block w-full py-2 bg-primary text-white rounded-lg text-center font-medium"
                  >
                    View Details
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed bottom-4 right-4 z-20 p-3 bg-white shadow-md rounded-full"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        {showSidebar ? <MapIcon className="h-6 w-6" /> : <List className="h-6 w-6" />}
      </button>
    </div>
  );

  // Render the list view
  const renderListView = () => (
    <div className="flex-1 h-full overflow-y-auto bg-white">
      <div className="container mx-auto px-4 w-full h-full py-2 bg-white">
        <PropertyGrid
          propertyIds={apartmentIds}
          loading={loading}
          error={error}
          searchTerm={searchTerm || initialQuery}
          searchType={searchType}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden">
      {/* Fixed navbar at the top */}
      <Navbar />
      
      {/* Main content container - starts after navbar height */}
      <div className="flex flex-col h-screen pt-16"> {/* pt-16 accounts for navbar height */}
        {/* Search filters section with border */}
        <div className="bg-white border-b border-gray-200 z-20">
          <div className="container mx-auto px-4 py-4">
            <SearchFilters
              onSearch={handleMapSearch}
              initialQuery={searchTerm || initialQuery}
              initialValues={filterValues || undefined}
              isLoading={loading}
              currentView={currentView}
              onViewToggle={toggleView}
            />
          </div>
        </div>

        {/* Map/List content area - takes remaining height */}
        <div className="flex-1 overflow-hidden"> 
          {currentView === "map" ? renderMapView() : renderListView()}
        </div>
      </div>
    </div>
  );
};

export default UnifiedSearchPage;
