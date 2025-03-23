
import React from 'react';
import PropertyCard, { Property } from './PropertyCard';
import { Map } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data for properties
const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Modern Downtown Apartment',
    address: '123 Main St, New York, NY',
    price: 2500,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1502005097973-6a7082348e28?ixlib=rb-4.0.3&auto=format&fit=crop&w=2344&q=80'
    ],
    description: 'Beautiful modern apartment in the heart of downtown. Features high ceilings, hardwood floors, and stunning city views.',
    features: ['City View', 'Hardwood Floors', 'Fitness Center']
  },
  {
    id: '2',
    title: 'Cozy Studio with Garden View',
    address: '456 Park Ave, Brooklyn, NY',
    price: 1800,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 650,
    images: [
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
    ],
    description: 'Charming studio apartment with a beautiful garden view. Perfect for professionals or students.',
    features: ['Garden View', 'Pet Friendly', 'Recently Renovated']
  },
  {
    id: '3',
    title: 'Luxury Penthouse with Terrace',
    address: '789 Broadway, Manhattan, NY',
    price: 5500,
    bedrooms: 3,
    bathrooms: 2.5,
    squareFeet: 2200,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
    ],
    description: 'Stunning penthouse with a private terrace and panoramic city views. Features include high-end appliances and smart home technology.',
    features: ['Terrace', 'Panoramic Views', 'Smart Home']
  },
  {
    id: '4',
    title: 'Spacious Loft in Historic Building',
    address: '101 Greene St, SoHo, NY',
    price: 3800,
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 1500,
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1617103996702-96ff29b1c467?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
    ],
    description: 'Unique loft apartment in a converted historic building. Features exposed brick walls, high ceilings, and large windows.',
    features: ['Historic Building', 'Exposed Brick', 'High Ceilings']
  },
  {
    id: '5',
    title: 'Minimalist Apartment with River View',
    address: '222 Riverside Dr, Upper West Side, NY',
    price: 2900,
    bedrooms: 1,
    bathrooms: 1,
    squareFeet: 900,
    images: [
      'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
    ],
    description: 'Modern minimalist apartment with stunning river views. Open floor plan with high-end finishes and appliances.',
    features: ['River View', 'Doorman', 'In-unit Laundry']
  },
  {
    id: '6',
    title: 'Charming Brownstone Apartment',
    address: '333 Clinton St, Brooklyn, NY',
    price: 2400,
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 1100,
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
    ],
    description: 'Classic brownstone apartment with original architectural details and modern updates. Quiet tree-lined street.',
    features: ['Original Details', 'Fireplace', 'Private Entrance']
  }
];

interface PropertyGridProps {
  showMapToggle?: boolean;
}

const PropertyGrid: React.FC<PropertyGridProps> = ({ showMapToggle = true }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">
            {mockProperties.length} results
          </h2>
          <p className="text-muted-foreground">
            Showing all available properties
          </p>
        </div>
        
        {showMapToggle && (
          <Link 
            to="/map" 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
          >
            <Map className="h-4 w-4" />
            <span>View Map</span>
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProperties.map((property, index) => (
          <PropertyCard 
            key={property.id} 
            property={property} 
            featured={index === 0} 
          />
        ))}
      </div>
    </div>
  );
};

export default PropertyGrid;
