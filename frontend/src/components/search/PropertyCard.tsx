
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
      prev === property.images.length - 1 ? 0 : prev + 1
    );
  };
  
  return (
    <Link 
      to={`/property/${property.id}`}
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
            src={property.images[currentImageIndex]} 
            alt={property.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
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
        
        {property.features.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
            {property.features.slice(0, 2).map((feature, index) => (
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
          <h3 className="font-semibold text-lg">{property.title}</h3>
          <p className="text-lg font-semibold text-primary">${property.price.toLocaleString()}</p>
        </div>
        
        <div className="flex items-center text-muted-foreground text-sm mb-3">
          <MapPin className="h-3 w-3 mr-1" />
          <span>{property.address}</span>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center text-muted-foreground">
            <Bed className="h-4 w-4 mr-1" />
            <span className="text-sm">{property.bedrooms} bed</span>
          </div>
          
          <div className="flex items-center text-muted-foreground">
            <Bath className="h-4 w-4 mr-1" />
            <span className="text-sm">{property.bathrooms} bath</span>
          </div>
          
          <div className="flex items-center text-muted-foreground">
            <Square className="h-4 w-4 mr-1" />
            <span className="text-sm">{property.squareFeet.toLocaleString()} sq ft</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
