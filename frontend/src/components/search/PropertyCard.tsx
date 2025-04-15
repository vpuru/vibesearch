import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Bed, Bath, Square, Heart, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchApartmentPreview } from "../../services/apartmentService";
import { useSearch } from "../../contexts/SearchContext";

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
  property: Property | string; // Can accept either a full Property object or just an ID string
  featured?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, featured = false }) => {
  const navigate = useNavigate();
  const { searchTerm } = useSearch();
  // Always start with image index 0, which will be the most relevant image after backend sorting
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [propertyData, setPropertyData] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If property is just an ID, fetch the data
  // Reset image index when search term changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      // Reset image index when property changes
      setCurrentImageIndex(0);

      // If property is already a Property object, use it directly
      if (typeof property !== "string") {
        setPropertyData(property);
        return;
      }

      // Otherwise, property is an ID, so fetch the data
      try {
        setLoading(true);
        setError(null);
        const apartmentId = property;
        console.log(`Fetching preview data for apartment ID: ${apartmentId}`);

        // Pass the search term to order images by relevance to the query
        const data = await fetchApartmentPreview(apartmentId, searchTerm);
        // Reset the image index when new data is loaded to ensure we show the most relevant image
        setCurrentImageIndex(0);
        setPropertyData(data);
      } catch (err) {
        console.error("Error fetching property data:", err);
        setError(err instanceof Error ? err.message : "Failed to load property data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [property, searchTerm]);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!propertyData || !hasValidImages) return;

    setCurrentImageIndex((prev) => (prev === propertyData.images.length - 1 ? 0 : prev + 1));
  };

  const previousImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!propertyData || !hasValidImages) return;

    setCurrentImageIndex((prev) => (prev === 0 ? propertyData.images.length - 1 : prev - 1));
  };

  // Navigate to property detail page
  const handleCardClick = () => {
    if (propertyData) {
      // Save the current URL as the returnTo parameter
      const currentUrl = window.location.pathname + window.location.search;
      const encodedReturnUrl = encodeURIComponent(currentUrl);
      navigate(`/property/detail/${propertyData.id}?returnTo=${encodedReturnUrl}`);
    }
  };

  // Show loading state while fetching property data
  if (loading) {
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
  if (error || !propertyData) {
    return (
      <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-red-50 h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center text-center">
          <div className="text-red-500 mb-2">❌</div>
          <p className="text-sm text-red-600 font-medium">Error loading property</p>
          <p className="text-xs text-red-500 mt-1">{error || "Property data unavailable"}</p>
        </div>
      </div>
    );
  }

  // Ensure the property has valid images
  const hasValidImages = Array.isArray(propertyData.images) && propertyData.images.length > 0;

  // Default image in case of missing images
  const defaultImage =
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80";

  // Calculate a valid image index
  const validImageIndex = hasValidImages
    ? Math.min(currentImageIndex, propertyData.images.length - 1)
    : 0;

  // Safe image URL
  const imageUrl = hasValidImages ? propertyData.images[validImageIndex] : defaultImage;

  // Safe feature handling
  const features = Array.isArray(propertyData.features) ? propertyData.features : [];

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
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 h-full w-full">
      <div className="relative">
        <div className="relative aspect-[4/3] w-full">
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={imageUrl}
                alt={propertyData.title || "Apartment"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src = defaultImage;
                }}
              />
            </div>

            {/* Image navigation arrows - Only show if there are multiple images */}
            {hasValidImages && propertyData.images.length > 1 && (
              <>
                <button
                  onClick={previousImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-800 hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-800 hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            <div className="absolute top-2 right-2">{/* Favorites button removed */}</div>

            {/* Image counter indicator - Only show if there are multiple images */}
            {hasValidImages && propertyData.images.length > 1 && (
              <div className="absolute bottom-2 right-2">
                <div className="px-2 py-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full">
                  {validImageIndex + 1}/{propertyData.images.length}
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
              {propertyData.title || "Apartment"}
            </h3>
            <p className="text-lg font-semibold text-vibe-charcoal/70">
              {formatPrice(propertyData.price)}
            </p>
          </div>

          <div className="flex items-center text-vibe-charcoal/70 text-sm mb-3">
            <MapPin className="h-3 w-3 mr-1" />
            <span>{propertyData.address || "Address unavailable"}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center text-vibe-charcoal/70">
              <Bed className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
              <span className="text-sm">
                {typeof propertyData.bedrooms === "number" ? propertyData.bedrooms : 0} bed
              </span>
            </div>

            <div className="flex items-center text-vibe-charcoal/70">
              <Bath className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
              <span className="text-sm">
                {typeof propertyData.bathrooms === "number" ? propertyData.bathrooms : 0} bath
              </span>
            </div>

            <div className="flex items-center text-vibe-charcoal/70">
              <Square className="h-4 w-4 mr-1 text-vibe-charcoal/70" />
              <span className="text-sm">{formatSquareFeet(propertyData.squareFeet)} sq ft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
