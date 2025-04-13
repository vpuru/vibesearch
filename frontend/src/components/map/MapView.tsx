import React, { useState, useEffect } from "react";
import { ArrowLeft, Search, X, List, Map as MapIcon, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Property } from "../search/PropertyCard";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon, LatLngExpression, LatLngBoundsExpression, LatLngTuple } from "leaflet";
import { useSearch } from "../../contexts/SearchContext";
import { searchApartments, fetchApartmentPreview } from "../../services/apartmentService";

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

// Default center location (Los Angeles coordinates)
const DEFAULT_CENTER: LatLngExpression = [34.0522, -118.2437];
const DEFAULT_ZOOM = 12;

// Add this function after the DEFAULT_ZOOM constant
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
}

const MapView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialImageUrls = searchParams.get("imageUrls") ? 
    JSON.parse(searchParams.get("imageUrls") || "[]") : [];
  const navigate = useNavigate();

  const { apartmentIds, searchTerm, setSearchTerm, filterValues, searchPerformed, setSearchPerformed, imageUrls, searchType, setApartmentIds } = useSearch();

  const [properties, setProperties] = useState<PropertyWithLocation[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithLocation | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>(DEFAULT_CENTER);

  // Track if we've loaded property details for display
  const [loadedPropertyDetails, setLoadedPropertyDetails] = useState<Record<string, boolean>>({});
  
  // Reset loaded property details when search term changes
  useEffect(() => {
    setLoadedPropertyDetails({});
  }, [searchTerm, initialQuery]);

  // Update the type of mapBounds state
  const [mapBounds, setMapBounds] = useState<LatLngBoundsExpression | null>(null);

  // Improved loadPropertyDetails function with better error handling
  const loadPropertyDetails = async (propertyId: string) => {
    // Always fetch new data when searchTerm changes
    if (loadedPropertyDetails[propertyId] && !searchTerm && !initialQuery) return;
    
    console.log(`Loading property details for ${propertyId} with search term: ${searchTerm || initialQuery || "none"}`);

    // Track if this is a retry
    let retryCount = 0;
    const maxRetries = 2;
    
    const loadWithRetry = async (): Promise<void> => {
      try {
        // Pass the search term to order images by relevance to the query
        const property = await fetchApartmentPreview(propertyId, searchTerm || initialQuery);

        // Use actual coordinates if available from API
        const propertyWithLocation: PropertyWithLocation = {
          ...property,
          location: property.coordinates
            ? {
                lat: property.coordinates.latitude,
                lng: property.coordinates.longitude,
              }
            : {
                // Fallback to Los Angeles area if coordinates not available
                lat: 34.0522 + (Math.random() - 0.5) * 0.05,
                lng: -118.2437 + (Math.random() - 0.5) * 0.05,
              },
        };

        setProperties((prevProperties) => {
          // Check if this property is already in the array
          const existingIndex = prevProperties.findIndex((p) => p.id === propertyId);

          if (existingIndex >= 0) {
            // Replace the existing property
            const newProperties = [...prevProperties];
            newProperties[existingIndex] = propertyWithLocation;
            return newProperties;
          } else {
            // Add the new property
            return [...prevProperties, propertyWithLocation];
          }
        });

        setLoadedPropertyDetails((prev) => ({ ...prev, [propertyId]: true }));
      } catch (err) {
        // Check if it's an AbortError and we haven't exceeded max retries
        if (err instanceof Error && 
            err.name === 'AbortError' && 
            retryCount < maxRetries) {
          console.warn(`Retry attempt ${retryCount + 1} for property ${propertyId} after AbortError`);
          retryCount++;
          
          // Add a small delay before retrying (increases with each retry)
          await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
          return loadWithRetry();
        }
        
        // For other errors or if max retries reached, log and continue
        console.error(`Error loading property ${propertyId}:`, err);
        
        // Mark as loaded anyway to prevent endless retries
        setLoadedPropertyDetails((prev) => ({ ...prev, [propertyId]: true }));
        
        // For persistent errors, add a placeholder property with an error state
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
            lat: 34.0522 + (Math.random() - 0.5) * 0.05,
            lng: -118.2437 + (Math.random() - 0.5) * 0.05,
          }
        };
        
        setProperties(prev => {
          // Only add if not already in the list
          if (!prev.some(p => p.id === propertyId)) {
            return [...prev, errorProperty];
          }
          return prev;
        });
      }
    };
    
    // Start the loading process with retry capability
    await loadWithRetry();
  };

  // Add effect to update map bounds when properties change
  useEffect(() => {
    if (properties.length > 0) {
      const bounds = calculateMapBounds(properties);
      if (bounds) {
        setMapBounds(bounds);
      }
    }
  }, [properties]);

  // Load properties based on search results
  useEffect(() => {
    const fetchProperties = async () => {
      if (!apartmentIds.length) return;

      setLoading(true);
      setError(null);

      try {
        // Load property details for each ID
        const promises = apartmentIds.slice(0, 25).map((id) => loadPropertyDetails(id));
        await Promise.all(promises);

        setLoading(false);
      } catch (err) {
        console.error("Error loading properties:", err);
        setError("Failed to load property details");
        setLoading(false);
      }
    };

    fetchProperties();
  }, [apartmentIds]);

  // Update map center when a property is selected
  useEffect(() => {
    if (selectedProperty?.location) {
      setMapCenter([selectedProperty.location.lat, selectedProperty.location.lng]);
    }
  }, [selectedProperty]);

  // Perform search if we have searchTerm/filterValues but no results
  useEffect(() => {
    const performSearch = async () => {
      // Use existing search filters or create a basic one with just the query
      const filters = filterValues || { query: searchTerm || initialQuery };
      const urls = imageUrls.length > 0 ? imageUrls : initialImageUrls;
      
      const hasQuery = !!(searchTerm || initialQuery);
      const hasImages = urls.length > 0;
      
      if (hasQuery || hasImages) {
        try {
          setLoading(true);
          // Use the search function to get results
          const results = await searchApartments({
            query: filters.query,
            filters: {
              min_beds: filters.min_beds,
              max_beds: filters.max_beds,
              min_baths: filters.min_baths,
              max_baths: filters.max_baths,
              min_rent: filters.min_rent,
              max_rent: filters.max_rent,
              studio: filters.studio,
              city: filters.city,
              state: filters.state,
            },
            limit: 25,
            imageUrls: urls,
          });

          // Load each property's details
          const propertyPromises = results.map((result) => loadPropertyDetails(result.id));
          await Promise.all(propertyPromises);

          setLoading(false);
        } catch (err) {
          console.error("Error searching for properties:", err);
          setError("Failed to search for properties");
          setLoading(false);
        }
      }
    };

    // Only perform a search if we don't already have properties and we have a search term or images
    if (properties.length === 0 && (searchTerm || initialQuery || imageUrls.length > 0 || initialImageUrls.length > 0)) {
      performSearch();
    }
  }, [searchTerm, initialQuery, filterValues, imageUrls, initialImageUrls]);

  const handleMapSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("mapSearch") as string;
    
    // Get current image URLs
    const urls = imageUrls.length > 0 ? imageUrls : initialImageUrls;
    
    // Update search state in context instead of navigating
    if (query.trim()) {
      setSearchTerm(query.trim());
    }
    
    // Set loading state and reset error
    setLoading(true);
    setError(null);
    setProperties([]);
    
    try {
      // Build the filters from current context or create new ones
      const filters = filterValues || { query: query.trim() };
      
      // Determine the search type
      const hasQuery = !!query.trim();
      const hasImages = urls.length > 0;
      
      if (hasQuery || hasImages) {
        // Use the search function to get results directly
        const results = await searchApartments({
          query: hasQuery ? query.trim() : '',
          filters: {
            min_beds: filters.min_beds,
            max_beds: filters.max_beds,
            min_baths: filters.min_baths,
            max_baths: filters.max_baths,
            min_rent: filters.min_rent,
            max_rent: filters.max_rent,
            studio: filters.studio,
            city: filters.city,
            state: filters.state,
          },
          limit: 25,
          imageUrls: urls,
        });
        
        // Update the apartment IDs in the search context
        const resultIds = results.map(result => result.id);
        setApartmentIds(resultIds);
        setSearchPerformed(true);
        
        // Load property details for each result
        const propertyPromises = results.map((result) => loadPropertyDetails(result.id));
        await Promise.all(propertyPromises);
        
        // Update URL to reflect the search without navigation
        const searchParams = new URLSearchParams(window.location.search);
        if (query.trim()) {
          searchParams.set('q', query.trim());
        } else {
          searchParams.delete('q');
        }
        
        if (urls.length > 0) {
          searchParams.set('imageUrls', JSON.stringify(urls));
        } else {
          searchParams.delete('imageUrls');
        }
        
        // Update the URL without full navigation
        window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error searching for properties:", err);
      setError("Failed to search for properties");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white shadow-sm p-4 z-10 border-b">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/search" className="flex items-center text-gray-700">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back to Search</span>
          </Link>

          <form onSubmit={handleMapSearch} className="hidden md:block relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              name="mapSearch"
              defaultValue={searchTerm || initialQuery ? decodeURIComponent(searchTerm || initialQuery) : ""}
              placeholder="Search location..."
              className="pl-10 w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </form>

          <button
            className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <MapIcon className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`w-full md:w-96 bg-white border-r flex-shrink-0 overflow-y-auto transition-all duration-300 transform ${
            showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } md:static fixed inset-y-0 left-0 z-20 pt-16 md:pt-0`}
        >
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">
                {properties.length} results{" "}
                {searchType === 'text' && (searchTerm || initialQuery) && (
                  <span className="font-normal text-sm text-muted-foreground">
                    for "{decodeURIComponent(searchTerm || initialQuery)}"
                  </span>
                )}
                {searchType === 'image' && (
                  <span className="font-normal text-sm text-muted-foreground">
                    that match your images
                  </span>
                )}
                {searchType === 'both' && (searchTerm || initialQuery) && (
                  <span className="font-normal text-sm text-muted-foreground">
                    that match your images and "{decodeURIComponent(searchTerm || initialQuery)}"
                  </span>
                )}
              </h2>
              <button
                className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
                onClick={() => setShowSidebar(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

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
                <p className="text-muted-foreground">No properties found.</p>
                <Link to="/" className="mt-2 text-primary hover:underline block">
                  Return to homepage
                </Link>
              </div>
            ) : (
              properties.map((property) => (
                <div
                  key={property.id}
                  className={`p-2 mb-2 rounded-lg transition-all cursor-pointer hover:bg-gray-50 ${
                    selectedProperty?.id === property.id ? "ring-2 ring-primary" : ""
                  } ${property.hasError ? "opacity-60" : ""}`}
                  onClick={() => !property.hasError && setSelectedProperty(property)}
                >
                  <div className="flex">
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {property.hasError ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-500 text-xs text-center px-1">Unable to load</span>
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
                    <div className="ml-3 flex-grow">
                      {property.hasError ? (
                        <>
                          <p className="font-medium text-sm text-gray-600">Unable to load property</p>
                          <p className="text-xs text-red-500">Retry search or try again later</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-primary">
                            ${property.price.toLocaleString()}
                          </p>
                          <h3 className="font-medium text-sm line-clamp-1">{property.title}</h3>
                          <p className="text-muted-foreground text-xs line-clamp-1">
                            {property.address}
                          </p>
                          <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{property.bedrooms} bed</span>
                            <span>•</span>
                            <span>{property.bathrooms} bath</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {properties.length > 0 ? (
            <MapContainer
              center={mapCenter}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Replace MapViewUpdater with MapBoundsUpdater */}
              {mapBounds && <MapBoundsUpdater bounds={mapBounds} />}

              {properties
                .filter((p) => p.location)
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
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              {loading ? (
                <div className="text-center">
                  <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Loading map data...</p>
                </div>
              ) : (
                <div className="text-center">
                  <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No properties to display. <br />
                    Try refining your search.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Property popup */}
          {selectedProperty && (
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
                    <Link
                      to={`/property/${selectedProperty.id}`}
                      className="block w-full py-2 bg-primary text-white rounded-lg text-center font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
