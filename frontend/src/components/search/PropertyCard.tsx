import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Bed, Bath, Square, Heart, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearch } from "../../contexts/SearchContext";
import { usePropertyData } from "../../hooks/usePropertyData";

export interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  images: string[];
  description: string;
  features: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface PropertyCardProps {
  property: Property | string;
  featured?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, featured = false }) => {
  const navigate = useNavigate();
  const { searchTerm } = useSearch();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Reset image index when search term changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [searchTerm]);

  // If property is just an ID, fetch the data using the hook
  const propertyId = typeof property === "string" ? property : property.id;
  const { data: propertyData, isLoading, error } = usePropertyData(propertyId, searchTerm);

  // Use the property data if it's a string (ID), otherwise use the provided property object
  const displayProperty = typeof property === "string" ? propertyData : property;

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!displayProperty || !hasValidImages) return;

    setCurrentImageIndex((prev) => (prev === displayProperty.images.length - 1 ? 0 : prev + 1));
  };

  const previousImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!displayProperty || !hasValidImages) return;

    setCurrentImageIndex((prev) => (prev === 0 ? displayProperty.images.length - 1 : prev - 1));
  };

  // Navigate to property detail page
  const handleCardClick = () => {
    if (displayProperty) {
      // Save the current URL as the returnTo parameter, including search parameters
      const currentUrl = window.location.pathname + window.location.search;
      const encodedReturnUrl = encodeURIComponent(currentUrl);
      navigate(`/property/${displayProperty.id}?returnTo=${encodedReturnUrl}`);
    }
  };

  // Show loading state while fetching property data
  if (isLoading) {
    return (
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading property data...</p>
        </div>
      </div>
    );
  }

  // Show error state if data fetch failed
  if (error || !displayProperty) {
    return (
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-red-50 h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 text-sm">
            {error instanceof Error ? error.message : "Failed to load property data"}
          </p>
        </div>
      </div>
    );
  }

  // Ensure the property has valid images
  const hasValidImages = Array.isArray(displayProperty.images) && displayProperty.images.length > 0;

  // Default image in case of missing images
  const defaultImage =
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80";

  // Calculate a valid image index
  const validImageIndex = hasValidImages
    ? Math.min(currentImageIndex, displayProperty.images.length - 1)
    : 0;

  // Safe image URL
  const imageUrl = hasValidImages ? displayProperty.images[validImageIndex] : defaultImage;

  // Safe feature handling
  const features = Array.isArray(displayProperty.features) ? displayProperty.features : [];

  // Safe formatters
  const formatPrice = (price: number | undefined): string => {
    if (typeof price !== "number" || isNaN(price)) return "$0";
    return `$${price.toLocaleString()}`;
  };

  const formatSquareFeet = (sqft: number | undefined): string => {
    if (typeof sqft !== "number" || isNaN(sqft)) return "0";
    return sqft.toLocaleString();
  };

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm border border-gray-100 h-full w-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <div className="relative">
        <div className="relative aspect-[4/3] w-full">
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={imageUrl}
                alt={displayProperty.title || "Apartment"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = defaultImage;
                }}
              />
            </div>

            {/* Image navigation arrows - Only show if there are multiple images */}
            {hasValidImages && displayProperty.images.length > 1 && (
              <>
                <button
                  onClick={previousImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-800 hover:bg-white transition-colors opacity-75"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-800 hover:bg-white transition-colors opacity-75"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image counter indicator - Only show if there are multiple images */}
            {hasValidImages && displayProperty.images.length > 1 && (
              <div className="absolute bottom-2 right-2">
                <div className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full">
                  {validImageIndex + 1}/{displayProperty.images.length}
                </div>
              </div>
            )}

            {features.length > 0 && (
              <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                {features.slice(0, 2).map((feature, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white/80 backdrop-blur-sm text-xs font-medium rounded-full"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg font-sans text-vibe-navy">
              {displayProperty.title || "Apartment"}
            </h3>
            <p className="text-lg font-semibold text-vibe-charcoal/70">
              {formatPrice(displayProperty.price)}
            </p>
          </div>

          <div className="flex items-center text-vibe-charcoal/70 text-sm mb-3">
            <MapPin className="h-3 w-3 mr-1" />
            <span>{displayProperty.address || "Address unavailable"}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center text-vibe-charcoal/70">
              <Bed className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
              <span className="text-sm">
                {typeof displayProperty.bedrooms === "number" ? displayProperty.bedrooms : 0} bed
              </span>
            </div>

            <div className="flex items-center text-vibe-charcoal/70">
              <Bath className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
              <span className="text-sm">
                {typeof displayProperty.bathrooms === "number" ? displayProperty.bathrooms : 0} bath
              </span>
            </div>

            <div className="flex items-center text-vibe-charcoal/70">
              <Square className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
              <span className="text-sm">{formatSquareFeet(displayProperty.squareFeet)} sq ft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
