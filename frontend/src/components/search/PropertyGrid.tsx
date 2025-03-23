import React from "react";
import PropertyCard, { Property } from "./PropertyCard";
import { Map, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

// Fallback image for properties without images
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
  "https://images.unsplash.com/photo-1502005097973-6a7082348e28?ixlib=rb-4.0.3&auto=format&fit=crop&w=2344&q=80",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
];

interface PropertyGridProps {
  properties: Property[];
  loading: boolean;
  error?: string;
  showMapToggle?: boolean;
  searchTerm?: string;
}

const PropertyGrid: React.FC<PropertyGridProps> = ({
  properties = [], // Default to empty array if properties is undefined
  loading = false,
  error,
  showMapToggle = true,
  searchTerm = "",
}) => {
  // Debug output
  console.log("PropertyGrid props:", {
    propertiesCount: properties?.length || 0,
    loading,
    error,
    searchTerm,
  });
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <h2 className="text-2xl font-semibold">Searching...</h2>
            </div>
          ) : error ? (
            <h2 className="text-2xl font-semibold text-red-500">Error</h2>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">
                {properties.length} results
                {searchTerm && (
                  <span className="ml-2 font-normal text-muted-foreground">for "{searchTerm}"</span>
                )}
              </h2>
              <p className="text-muted-foreground">
                {properties.length > 0
                  ? `Showing ${properties.length} available properties`
                  : "No properties found matching your criteria"}
              </p>
            </>
          )}
        </div>

        {showMapToggle && properties.length > 0 && (
          <Link
            to="/map"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
          >
            <Map className="h-4 w-4" />
            <span>View Map</span>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((_, index) => (
            <div
              key={index}
              className="rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse"
            >
              <div className="aspect-[4/3] bg-gray-200"></div>
              <div className="p-4">
                <div className="h-5 bg-gray-200 rounded mb-3 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-red-50 rounded-full p-8 mb-5">
            <svg className="h-12 w-12 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-red-600">Error Loading Properties</h3>
          <p className="text-gray-600 max-w-md">
            {error}
          </p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      ) : properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property, index) => (
            <PropertyCard
              key={property.id || index}
              property={{
                ...property,
                // Ensure property has images
                images:
                  property.images && property.images.length > 0
                    ? property.images
                    : [FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)]],
              }}
              featured={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-gray-100 rounded-full p-8 mb-5">
            <Map className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No properties found</h3>
          <p className="text-muted-foreground max-w-md">
            Try adjusting your search criteria or try a different search term to find more
            options.
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyGrid;
