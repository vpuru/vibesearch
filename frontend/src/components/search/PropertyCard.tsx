import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Square, Heart } from 'lucide-react';

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
  property: Property;
  featured?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, featured = false }) => {
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };
  
  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === (property.images?.length - 1 || 0) ? 0 : prev + 1
    );
  };
  
  // Ensure the property has valid images
  const hasValidImages = Array.isArray(property.images) && property.images.length > 0;
  
  // Default image in case of missing images
  const defaultImage = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80';
  
  // Calculate a valid image index
  const validImageIndex = hasValidImages 
    ? Math.min(currentImageIndex, property.images.length - 1) 
    : 0;
  
  // Safe image URL
  const imageUrl = hasValidImages 
    ? property.images[validImageIndex] 
    : defaultImage;
    
  // Safe feature handling
  const features = Array.isArray(property.features) ? property.features : [];

  // Safe formatters
  const formatPrice = (price: number | undefined): string => {
    if (typeof price !== 'number' || isNaN(price)) return '$0';
    return `$${price.toLocaleString()}`;
  };

  const formatSquareFeet = (sqft: number | undefined): string => {
    if (typeof sqft !== 'number' || isNaN(sqft)) return '0';
    return sqft.toLocaleString();
  };

  return (
    <Link 
      to={`/property/${property.id || 'detail'}`}
      className={`group block rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-white border border-gray-100 hover-scale ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div className="relative">
        <div 
          className="aspect-[4/3] overflow-hidden"
          onClick={nextImage}
        >
          <img 
            src={imageUrl} 
            alt={property.title || 'Apartment'} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLImageElement).src = defaultImage;
            }}
          />
        </div>
        
        <div className="absolute top-2 right-2">
          <button 
            onClick={toggleFavorite}
            className={`w-8 h-8 flex items-center justify-center rounded-full ${
              isFavorite ? 'bg-primary text-white' : 'bg-white/80 backdrop-blur-sm text-gray-700'
            } shadow-sm transition-colors`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
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
          <h3 className="font-semibold text-lg">{property.title || 'Apartment'}</h3>
          <p className="text-lg font-semibold text-primary">{formatPrice(property.price)}</p>
        </div>
        
        <div className="flex items-center text-muted-foreground text-sm mb-3">
          <MapPin className="h-3 w-3 mr-1" />
          <span>{property.address || 'Address unavailable'}</span>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center text-muted-foreground">
            <Bed className="h-4 w-4 mr-1" />
            <span className="text-sm">{typeof property.bedrooms === 'number' ? property.bedrooms : 0} bed</span>
          </div>
          
          <div className="flex items-center text-muted-foreground">
            <Bath className="h-4 w-4 mr-1" />
            <span className="text-sm">{typeof property.bathrooms === 'number' ? property.bathrooms : 0} bath</span>
          </div>
          
          <div className="flex items-center text-muted-foreground">
            <Square className="h-4 w-4 mr-1" />
            <span className="text-sm">{formatSquareFeet(property.squareFeet)} sq ft</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;