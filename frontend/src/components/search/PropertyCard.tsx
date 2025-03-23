import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Bed, Bath, Square, Heart, Loader2 } from "lucide-react";
import { fetchApartmentPreview } from "../../services/apartmentService";

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
}

interface PropertyCardProps {
  property: Property | string; // Can accept either a full Property object or just an ID string
  featured?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, featured = false }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [propertyData, setPropertyData] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If property is just an ID, fetch the data
  useEffect(() => {
    const fetchData = async () => {
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
        const data = await fetchApartmentPreview(apartmentId);
        setPropertyData(data);
      } catch (err) {
        console.error("Error fetching property data:", err);
        setError(err instanceof Error ? err.message : "Failed to load property data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [property]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!propertyData) return;

    setCurrentImageIndex((prev) =>
      prev === (propertyData.images?.length - 1 || 0) ? 0 : prev + 1
    );
  };

  // Navigate to property detail page
  const handleCardClick = () => {
    if (propertyData) {
      navigate(`/property/detail/${propertyData.id}`);
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
    <div
      onClick={handleCardClick}
      className={`group cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-white border border-gray-100 hover:border-gray-200 ${
        featured ? "md:col-span-2" : ""
      }`}
    >
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
            onClick={(e) => nextImage(e)}
          />
        </div>

        <div className="absolute top-2 right-2">
          <button
            onClick={toggleFavorite}
            className={`w-8 h-8 flex items-center justify-center rounded-full ${
              isFavorite ? "bg-primary text-white" : "bg-white/80 backdrop-blur-sm text-gray-700"
            } shadow-sm transition-colors`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          </button>
        </div>

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

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{propertyData.title || "Apartment"}</h3>
          <p className="text-lg font-semibold text-primary">{formatPrice(propertyData.price)}</p>
        </div>

        <div className="flex items-center text-muted-foreground text-sm mb-3">
          <MapPin className="h-3 w-3 mr-1" />
          <span>{propertyData.address || "Address unavailable"}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center text-muted-foreground">
            <Bed className="h-4 w-4 mr-1" />
            <span className="text-sm">
              {typeof propertyData.bedrooms === "number" ? propertyData.bedrooms : 0} bed
            </span>
          </div>

          <div className="flex items-center text-muted-foreground">
            <Bath className="h-4 w-4 mr-1" />
            <span className="text-sm">
              {typeof propertyData.bathrooms === "number" ? propertyData.bathrooms : 0} bath
            </span>
          </div>

          <div className="flex items-center text-muted-foreground">
            <Square className="h-4 w-4 mr-1" />
            <span className="text-sm">{formatSquareFeet(propertyData.squareFeet)} sq ft</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
