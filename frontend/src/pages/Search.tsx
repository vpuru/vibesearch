import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import SearchFilters, { SearchFilterValues } from "../components/search/SearchFilters";
import PropertyGrid from "../components/search/PropertyGrid";
import { searchApartments, fetchApartmentPreview } from "../services/apartmentService";
import { useSearch } from "../contexts/SearchContext";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon, LatLngExpression, LatLngBoundsExpression, LatLngTuple } from "leaflet";
import {
  Map as MapIcon,
  List,
  X,
  Loader2,
  MapPin,
  Bed,
  Bath,
  Square,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Property } from "../components/search/PropertyCard";
import { cn } from "../lib/utils";
import { useQueryClient } from "@tanstack/react-query";

// Constants
const ITEMS_PER_PAGE = 25;
const DEFAULT_CENTER: LatLngExpression = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
const MIN_ZOOM = 2;
const MAX_ZOOM = 18;

// Fix Leaflet icon issue
// @ts-ignore - Needed to fix Leaflet icon issue
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Better visually contrasting custom marker icon
const customIcon = new Icon({
  iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
  className: 'map-marker-icon' // For potential CSS styling
});

// Interfaces
interface PropertyWithLocation extends Property {
  location: {
    lat: number;
    lng: number;
  };
  isPlaceholder?: boolean;
  hasError?: boolean;
}

// Helper Components
const MapBoundsUpdater = ({ bounds, isSwitchingViews }: { bounds: LatLngBoundsExpression | null, isSwitchingViews?: boolean }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      // Add a slight delay when switching views to ensure the container is fully rendered
      if (isSwitchingViews) {
        setTimeout(() => {
          map.invalidateSize(); // Force recalculation of map size
          map.fitBounds(bounds, { 
            padding: [50, 50], // Add consistent padding
            maxZoom: 15 // Prevent excessive zoom on small areas
          });
        }, 100);
      } else {
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 15
        });
      }
    }
  }, [bounds, map, isSwitchingViews]);
  
  return null;
};

// Improved Map Resize Handler
const MapResizeHandler = () => {
  const map = useMap();
  
  useEffect(() => {
    // Handle window resize
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial invalidation after component mounts
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  
  return null;
};

const ShimmerEffect = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "animate-pulse rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]",
      className
    )}
  ></div>
);

const ShimmerPropertyCard = () => (
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

// Helper Functions
const calculateMapBounds = (properties: PropertyWithLocation[]): LatLngBoundsExpression | null => {
  const propertiesWithLocation = properties.filter((p) => p.location && !p.isPlaceholder);
  if (propertiesWithLocation.length === 0) return null;

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;

  propertiesWithLocation.forEach(property => {
    minLat = Math.min(minLat, property.location.lat);
    maxLat = Math.max(maxLat, property.location.lat);
    minLng = Math.min(minLng, property.location.lng);
    maxLng = Math.max(maxLng, property.location.lng);
  });

  // Add padding based on the geographical size
  // Smaller areas get more padding for better visibility
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  
  // Use dynamic padding based on the area size
  const latPadding = Math.max(latDiff * 0.2, 0.01); // Minimum padding of 0.01 degrees
  const lngPadding = Math.max(lngDiff * 0.2, 0.01);

  return [
    [minLat - latPadding, minLng - lngPadding] as LatLngTuple,
    [maxLat + latPadding, maxLng + lngPadding] as LatLngTuple,
  ];
};

const formatSquareFeet = (sqft: number | undefined): string => {
  return (typeof sqft === "number" && !isNaN(sqft)) ? sqft.toLocaleString() : "0";
};

// Main Component
const UnifiedSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialImageUrls = searchParams.get("imageUrls")
    ? JSON.parse(searchParams.get("imageUrls") || "[]")
    : [];
  const viewParam = searchParams.get("view") || "map";

  // Use the search context with batch update capability
  const {
    apartmentIds,
    searchTerm,
    filterValues,
    searchPerformed,
    imageUrls,
    searchType,
    hasResults,
    updateSearchState,
    setApartmentIds,
  } = useSearch();
  
  // Local state
  const [currentView, setCurrentView] = useState<"map" | "list">(viewParam === "list" ? "list" : "map");
  const [properties, setProperties] = useState<PropertyWithLocation[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithLocation | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(DEFAULT_CENTER);
  const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | null>(null);
  const [isSwitchingViews, setIsSwitchingViews] = useState<boolean>(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Reference to track if we already restored from URL
  const hasRestoredFromUrl = React.useRef(false);
  
  const queryClient = useQueryClient();

  // Effects
  // Update URL when view changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("view", currentView);
    setSearchParams(newParams, { replace: true });
  }, [currentView, setSearchParams, searchParams]);

  // Update map bounds when properties change
  useEffect(() => {
    if (properties.length > 0 && currentView === "map") {
      const bounds = calculateMapBounds(properties);
      if (bounds) setMapBounds(bounds);
    }
  }, [properties, currentView]);

  // Update map center when a property is selected
  useEffect(() => {
    if (selectedProperty?.location) {
      setMapCenter([selectedProperty.location.lat, selectedProperty.location.lng]);
    }
  }, [selectedProperty]);

  // Reset current image index when selected property changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedProperty]);
  
  // Define fetchResults function before the effects
  const fetchResults = useCallback(async (searchFilterValues: SearchFilterValues, pageNum: number) => {
    // Use URL or context image URLs, whichever is available
    const urls = initialImageUrls.length > 0 ? initialImageUrls : imageUrls;

    // Prepare search parameters
    const searchParams = {
      query: searchFilterValues.query || initialQuery,
      filters: {
        min_beds: searchFilterValues.min_beds,
        max_beds: searchFilterValues.max_beds,
        min_baths: searchFilterValues.min_baths,
        max_baths: searchFilterValues.max_baths,
        min_rent: searchFilterValues.min_rent,
        max_rent: searchFilterValues.max_rent,
        studio: searchFilterValues.studio,
      },
      limit: ITEMS_PER_PAGE,
      page: pageNum,
      imageUrls: urls,
    };

    try {
      // Perform search
      const results = await searchApartments(searchParams);

      // Check if we've reached the end of pagination
      if (results.length < ITEMS_PER_PAGE) {
        setHasMoreResults(false);
      }

      // Extract IDs
      const ids = results.map(property => property.id);

      if (pageNum === 1) {
        // For first page, replace existing IDs
        setApartmentIds(ids);
      } else {
        // For subsequent pages, merge with existing IDs
        const currentIdSet = new Set(apartmentIds);
        const newUniqueIds = ids.filter(id => !currentIdSet.has(id));
        
        if (newUniqueIds.length > 0) {
          setApartmentIds([...apartmentIds, ...newUniqueIds]);
        }
      }

      // Mark that a search was performed
      updateSearchState({ searchPerformed: true });

      // Clear errors
      setError(undefined);

      return ids;
    } catch (apiError: any) {
      // Handle API errors
      if (apiError.name === "AbortError") {
        setError("Request timed out. Please try again later.");
      } else if (
        apiError.message?.includes("Failed to fetch") ||
        apiError.message?.includes("NetworkError")
      ) {
        setError("Cannot connect to the search server. Please check your connection and try again.");
      } else {
        setError(`Error searching properties: ${apiError.message || "Unknown error occurred"}`);
      }

      // Clear results on first page error
      if (pageNum === 1) {
        setApartmentIds([]);
        setProperties([]);
      }

      throw apiError;
    }
  }, [apartmentIds, imageUrls, initialImageUrls, initialQuery, setApartmentIds, updateSearchState]);

  // Define loadPropertiesForMapView function before the effects
  const loadPropertiesForMapView = useCallback(async (ids: string[]) => {
    setLoadingDetails(true);
    
    // Cache key for storing property data in session storage
    const cacheKey = `map_properties_${ids.join('_')}`;
    
    // Check if we have cached property data first
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsedProperties = JSON.parse(cachedData) as PropertyWithLocation[];
        setProperties(parsedProperties);
        setLoadingDetails(false);
        return;
      } catch (e) {
        console.error("Failed to parse cached properties:", e);
        // Continue with normal loading if parsing fails
      }
    }
    
    // Create placeholders with more geographically distributed random positions
    const placeholders: PropertyWithLocation[] = ids.map(id => {
      // Use truly random coordinates within the continental US instead of SF-based
      const randomLat = 25 + Math.random() * 24; // Between 25N and 49N (covers continental US)
      const randomLng = -125 + Math.random() * 65; // Between 125W and 60W
      
      return {
        id,
        title: "Loading...",
        address: "",
        price: 0,
        bedrooms: 0,
        bathrooms: 0,
        squareFeet: 0,
        images: [],
        description: "",
        features: [],
        isPlaceholder: true,
        location: {
          lat: randomLat,
          lng: randomLng,
        },
      };
    });

    setProperties(placeholders);

    // Prefetch all property data
    await Promise.all(
      ids.map(id =>
        queryClient.prefetchQuery({
          queryKey: ["property", id, searchTerm],
          queryFn: () => fetchApartmentPreview(id, searchTerm),
        })
      )
    );

    // Update properties with actual data
    const updatedProperties = await Promise.all(
      ids.map(async id => {
        const data = await queryClient.getQueryData<Property>(["property", id, searchTerm]);
        if (!data) return null;

        return {
          ...data,
          location: data.coordinates
            ? {
                lat: data.coordinates.latitude,
                lng: data.coordinates.longitude,
              }
            : {
                // Generate truly random coordinates within the US if none exists
                lat: 25 + Math.random() * 24,
                lng: -125 + Math.random() * 65,
              },
        } as PropertyWithLocation;
      })
    );

    const filteredProperties = updatedProperties.filter((p): p is PropertyWithLocation => p !== null);
    
    // Cache the properties
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(filteredProperties));
    } catch (e) {
      console.error("Failed to cache properties:", e);
    }
    
    setProperties(filteredProperties);
    setLoadingDetails(false);
  }, [queryClient, searchTerm]);
  
  // Initial Search Setup
  useEffect(() => {
    // Only run once per mount or when search parameters actually change
    if (
      hasRestoredFromUrl.current &&
      !searchParams.toString().includes("q=") &&
      !searchParams.toString().includes("imageUrls=")
    ) {
      return;
    }

    // Mark that we've processed URL parameters
    if (!hasRestoredFromUrl.current) {
      hasRestoredFromUrl.current = true;
      
      // Check if we're returning from a property detail view via browser back button
      // Using session storage as a more reliable method than referrer
      const fromDetailView = sessionStorage.getItem('returnedFromPropertyDetail') === 'true';
      const lastSearchStateStr = sessionStorage.getItem('lastSearchState');
      
      sessionStorage.removeItem('returnedFromPropertyDetail');
      sessionStorage.removeItem('lastSearchState');
      
      // If we're coming back from a detail page, just restore the map view if needed but don't re-search
      if (fromDetailView) {
        // Parse the last search state if available
        let lastSearchState = null;
        try {
          if (lastSearchStateStr) {
            lastSearchState = JSON.parse(lastSearchStateStr);
          }
        } catch (e) {
          console.error("Failed to parse last search state:", e);
        }
        
        // Only load map properties if we had results
        if (hasResults || (lastSearchState && lastSearchState.searchPerformed)) {
          if (currentView === "map" && apartmentIds.length > 0 && properties.length === 0) {
            loadPropertiesForMapView(apartmentIds);
          }
          return;
        }
      }
    }

    const setupSearch = async () => {
      const urlHasQuery = !!initialQuery.trim();
      const urlHasImages = initialImageUrls.length > 0;
      const contextHasSearch = searchPerformed && (searchTerm || imageUrls.length > 0);
      
      // Check if the URL parameters actually changed from context state
      const queryChanged = urlHasQuery && initialQuery !== searchTerm;
      const imagesChanged = urlHasImages && JSON.stringify(initialImageUrls) !== JSON.stringify(imageUrls);
      
      // Case 1: URL has new search parameters - do a fresh search
      if (queryChanged || imagesChanged) {
        // Determine search type
        let newSearchType: "text" | "image" | "both" | "none" = "none";
        if (urlHasQuery && urlHasImages) newSearchType = "both";
        else if (urlHasQuery) newSearchType = "text";
        else if (urlHasImages) newSearchType = "image";

        // Batch update context state
        updateSearchState({
          searchTerm: urlHasQuery ? initialQuery : "",
          imageUrls: urlHasImages ? initialImageUrls : [],
          searchType: newSearchType
        });

        setLoading(true);

        try {
          await fetchResults({
            query: initialQuery,
          }, 1);
        } catch (error) {
          console.error("Error performing fresh search:", error);
        } finally {
          setLoading(false);
        }
      }
      // Case 2: URL matches existing search with results
      else if ((urlHasQuery || urlHasImages) && hasResults) {
        // Ensure state reflects URL (without triggering a new search)
        if (urlHasQuery && initialQuery !== searchTerm) {
          updateSearchState({
            searchTerm: initialQuery
          });
        }
        
        if (urlHasImages && JSON.stringify(initialImageUrls) !== JSON.stringify(imageUrls)) {
          updateSearchState({
            imageUrls: initialImageUrls
          });
        }

        // Load property details for map view if needed
        if (currentView === "map" && apartmentIds.length > 0 && properties.length === 0) {
          loadPropertiesForMapView(apartmentIds);
        }
      }
      // Case 3: Using existing search from context
      else if (contextHasSearch && hasResults) {
        // Just load map properties if needed
        if (currentView === "map" && apartmentIds.length > 0 && properties.length === 0) {
          loadPropertiesForMapView(apartmentIds);
        }
      }
      // Case 4: Search criteria exist but no results - just show no results
      else if (contextHasSearch) {
        // Don't do anything - accept the no results state
      }
    };

    setupSearch();
  }, [
    initialQuery,
    initialImageUrls,
    searchTerm,
    imageUrls,
    apartmentIds.length,
    hasResults,
    searchPerformed,
    updateSearchState,
    currentView,
    properties.length,
    loadPropertiesForMapView,
    fetchResults
  ]);

  // Event Handlers
  const showNextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedProperty?.images?.length) {
      setCurrentImageIndex(prev => 
        prev === selectedProperty.images.length - 1 ? 0 : prev + 1
      );
    }
  }, [selectedProperty]);

  const showPrevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedProperty?.images?.length) {
      setCurrentImageIndex(prev => 
        prev === 0 ? selectedProperty.images.length - 1 : prev - 1
      );
    }
  }, [selectedProperty]);

  // Function to toggle between map and list views
  const toggleView = useCallback(() => {
    const newView = currentView === "map" ? "list" : "map";
    
    // Set switching state to trigger appropriate handling
    setIsSwitchingViews(true);
    setCurrentView(newView);

    // If switching to map view, load properties if needed
    if (newView === "map" && apartmentIds.length > 0) {
      if (properties.length === 0) {
        loadPropertiesForMapView(apartmentIds);
      } else {
        // Recalculate bounds when switching back to map view
        const bounds = calculateMapBounds(properties);
        if (bounds) setMapBounds(bounds);
        
        // Reset switching state after a delay
        setTimeout(() => {
          setIsSwitchingViews(false);
        }, 300);
      }
    } else {
      // Reset switching state after a delay for list view
      setTimeout(() => {
        setIsSwitchingViews(false);
      }, 300);
    }

    // Reset pagination when switching to list view
    if (newView === "list") {
      setPage(1);
    }
  }, [currentView, apartmentIds, properties, loadPropertiesForMapView, calculateMapBounds]);

  // Handler for search form submission
  const handleSearch = useCallback(async (filters: SearchFilterValues) => {
    setLoading(true);
    setError(undefined);
    
    // Store old results for greying out during loading
    const oldProperties = [...properties];
    
    // Clear cached map properties to ensure fresh results
    if (apartmentIds.length > 0) {
      const cacheKey = `map_properties_${apartmentIds.join('_')}`;
      sessionStorage.removeItem(cacheKey);
    }
    
    // Update search state
    updateSearchState({
      searchTerm: filters.query,
      filterValues: filters
    });
    
    setPage(1);
    setHasMoreResults(true);
    
    // For map view, show loading overlay on existing properties rather than clearing them
    if (currentView === "map" && oldProperties.length > 0) {
      // Apply loading state to existing properties
      setProperties(oldProperties.map(p => ({ ...p, isPlaceholder: true })));
    } else {
      // For list view or first search, clear properties
      setProperties([]);
    }

    // Determine and set search type
    const hasQuery = !!filters.query.trim();
    const hasImages = imageUrls.length > 0;
    
    let newSearchType: "text" | "image" | "both" | "none" = "none";
    if (hasQuery && hasImages) newSearchType = "both";
    else if (hasQuery) newSearchType = "text";
    else if (hasImages) newSearchType = "image";
    
    updateSearchState({ searchType: newSearchType });

    try {
      // Update URL params
      const newSearchParams = new URLSearchParams(searchParams);
      
      if (filters.query) {
        newSearchParams.set("q", filters.query);
      } else {
        newSearchParams.delete("q");
      }

      if (initialImageUrls.length > 0) {
        newSearchParams.set("imageUrls", JSON.stringify(initialImageUrls));
      } else if (imageUrls.length > 0) {
        newSearchParams.set("imageUrls", JSON.stringify(imageUrls));
      } else {
        newSearchParams.delete("imageUrls");
      }

      newSearchParams.set("view", currentView);
      setSearchParams(newSearchParams);

      // Perform search
      const results = await fetchResults(filters, 1);

      // Load property details for map view if needed
      if (currentView === "map" && results && results.length > 0) {
        await loadPropertiesForMapView(results);
      }
    } catch (err) {
      console.error("Unexpected error during search:", err);
      setError("An unexpected error occurred. Please try again.");
      setApartmentIds([]);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentView, 
    fetchResults, 
    imageUrls, 
    initialImageUrls, 
    loadPropertiesForMapView, 
    searchParams, 
    setApartmentIds, 
    setSearchParams, 
    updateSearchState,
    properties,
    apartmentIds
  ]);

  // Function to load more results when scrolling
  const handleLoadMore = useCallback(async () => {
    if (!hasMoreResults || loadingMore || loading || !filterValues || currentView !== "list") {
      return;
    }

    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      await fetchResults(filterValues, nextPage);
      setPage(nextPage);
    } catch (err) {
      setHasMoreResults(false);
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMoreResults, 
    loadingMore, 
    loading, 
    filterValues, 
    currentView, 
    page, 
    fetchResults
  ]);

  // Memoized map view rendering
  const renderMapView = useMemo(() => (
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
                  <span className="whitespace-nowrap text-vibe-navy">
                    {properties.length} results
                  </span>
                  <span className="ml-1 font-normal text-vibe-charcoal/70">for "</span>
                  <span className="font-normal text-vibe-charcoal/70 break-all">
                    {decodeURIComponent(searchTerm || initialQuery)}
                  </span>
                  <span className="font-normal text-vibe-charcoal/70">"</span>
                </span>
              )}
              {searchType === "image" && (
                <span>
                  <span className="whitespace-nowrap text-vibe-navy">
                    {properties.length} results
                  </span>
                  <span className="ml-1 font-normal text-vibe-charcoal/70">
                    that match your images
                  </span>
                </span>
              )}
              {searchType === "both" && (searchTerm || initialQuery) && (
                <span>
                  <span className="whitespace-nowrap text-vibe-navy">
                    {properties.length} results
                  </span>
                  <span className="ml-1 font-normal text-vibe-charcoal/70">
                    {" "}
                    that match your images and "
                  </span>
                  <span className="font-normal text-vibe-charcoal/70 break-all">
                    {decodeURIComponent(searchTerm || initialQuery)}
                  </span>
                  <span className="font-normal text-vibe-charcoal/70">"</span>
                </span>
              )}
              {(!searchType ||
                searchType === "none" ||
                (searchType !== "image" && !searchTerm && !initialQuery)) && (
                <span className="whitespace-nowrap text-vibe-navy">
                  {properties.length} results
                </span>
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
          <div className={`p-2 relative ${loading ? "opacity-60" : ""}`}>
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
            ) : loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : null}
            
            {properties.map((property) => (
                <div
                  key={property.id}
                  className={`p-2 mb-2 mr-2 rounded-lg transition-all cursor-pointer hover:bg-gray-50 ${
                    selectedProperty?.id === property.id ? "ring-2 ring-[#0F4C81]" : ""
                  } ${property.hasError ? "opacity-60" : ""}`}
                  onClick={() => !property.hasError && setSelectedProperty(property)}
                >
                  {property.isPlaceholder ? (
                    <ShimmerPropertyCard />
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
                              <h3 className="font-semibold text-vibe-navy font-sans line-clamp-1">
                                {property.title}
                              </h3>
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
                                  {typeof property.bedrooms === "number" ? property.bedrooms : 0}{" "}
                                  bed
                                </span>
                              </div>

                              <div className="flex items-center text-vibe-charcoal/70">
                                <Bath className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
                                <span className="text-sm">
                                  {typeof property.bathrooms === "number" ? property.bathrooms : 0}{" "}
                                  bath
                                </span>
                              </div>

                              <div className="flex items-center text-vibe-charcoal/70">
                                <Square className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
                                <span className="text-sm">
                                  {formatSquareFeet(property.squareFeet)} sq ft
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <div className={`relative w-full h-full ${loading ? "opacity-60" : ""}`}>
            {properties.length > 0 ? (
              <>
                <MapContainer
                  center={mapCenter}
                  zoom={DEFAULT_ZOOM}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={true}
                  zoomControl={true}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  className="z-0 map-container"
                  whenReady={() => {
                    // Ensure map properly fills container after rendering
                    setTimeout(() => {
                      // No direct map reference needed, we handle resize through MapResizeHandler
                    }, 100);
                  }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
  
                  {/* Add map resize handler */}
                  <MapResizeHandler />
                  
                  {/* Update bounds handler with switching views state */}
                  {mapBounds && <MapBoundsUpdater bounds={mapBounds} isSwitchingViews={isSwitchingViews} />}
  
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
                          ></Marker>
                        )
                    )}
                </MapContainer>
                
                {/* Loading overlay for map view */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm z-10">
                    <div className="bg-white/80 p-6 rounded-lg shadow-lg">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-vibe-navy font-medium">Updating results...</p>
                    </div>
                  </div>
                )}
              </>
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
                      No Properties to Display
                      <br />
                      Try Refining Your Search!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Property popup */}
        {selectedProperty && !selectedProperty.isPlaceholder && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-[1000]">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-slide-up">
              <div className="relative">
                {selectedProperty.images && selectedProperty.images.length > 0 ? (
                  <>
                    <img
                      src={selectedProperty.images[currentImageIndex]}
                      alt={`${selectedProperty.title} - image ${currentImageIndex + 1}`}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/600x400?text=Error";
                      }}
                    />
                    {selectedProperty.images.length > 1 && (
                      <>
                        <button
                          className="absolute top-1/2 left-2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-gray-700 shadow-sm hover:bg-white"
                          onClick={showPrevImage}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          className="absolute top-1/2 right-2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-gray-700 shadow-sm hover:bg-white"
                          onClick={showNextImage}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs">
                          {currentImageIndex + 1} / {selectedProperty.images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <img
                    src="https://placehold.co/600x400?text=No+Image"
                    alt={selectedProperty.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <button
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-gray-700 shadow-sm"
                  onClick={() => setSelectedProperty(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-vibe-navy font-sans font-lg">
                    {selectedProperty.title}
                  </h3>
                  <p className="text-vibe-charcoal/70 font-semibold font-sans">
                    ${selectedProperty.price.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center text-muted-foreground text-sm mb-3">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>{selectedProperty.address}</span>
                </div>

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
                    href={`/property/${selectedProperty.id}?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}
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
  ), [
    currentImageIndex,
    error,
    initialQuery,
    loading,
    loadingDetails,
    mapBounds,
    mapCenter,
    properties,
    searchTerm,
    searchType,
    selectedProperty,
    showPrevImage,
    showNextImage,
    showSidebar,
    isSwitchingViews
  ]);

  // Memoized list view rendering
  const renderListView = useMemo(() => (
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
  ), [
    apartmentIds,
    error,
    handleLoadMore,
    initialQuery,
    loading,
    searchTerm,
    searchType
  ]);

  return (
    <div className="h-screen overflow-hidden">
      {/* Fixed navbar at the top */}
      <Navbar />

      {/* Main content container */}
      <div className="flex flex-col h-screen pt-16">
        {/* Search filters section */}
        <div className="bg-white border-b border-gray-200 z-20">
          <div className="container mx-auto px-4 py-4">
            <SearchFilters
              onSearch={handleSearch}
              initialQuery={searchTerm || initialQuery}
              initialValues={filterValues || undefined}
              isLoading={loading}
              currentView={currentView}
              onViewToggle={toggleView}
            />
          </div>
        </div>

        {/* Content area - map or list view */}
        <div className="flex-1 overflow-hidden">
          {currentView === "map" ? renderMapView : renderListView}
        </div>
      </div>
    </div>
  );
};

export default UnifiedSearchPage;