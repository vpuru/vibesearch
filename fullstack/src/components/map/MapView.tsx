
import React, { useState } from 'react';
import { ArrowLeft, Search, X, List, Map as MapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Property } from '../search/PropertyCard';

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

const MapView: React.FC = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white shadow-sm p-4 z-10 border-b">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/search" className="flex items-center text-gray-700">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back to Search</span>
          </Link>
          
          <div className="hidden md:block relative w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search location..." 
              className="pl-10 w-full py-2 px-4 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          
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
            showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } md:static fixed inset-y-0 left-0 z-20 pt-16 md:pt-0`}
        >
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">
                {mockProperties.length} results
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
            {mockProperties.map((property) => (
              <div 
                key={property.id}
                className={`p-2 mb-2 rounded-lg transition-all cursor-pointer hover:bg-gray-50 ${
                  selectedProperty?.id === property.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedProperty(property)}
              >
                <div className="flex">
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="ml-3 flex-grow">
                    <p className="font-semibold text-primary">${property.price.toLocaleString()}</p>
                    <h3 className="font-medium text-sm line-clamp-1">{property.title}</h3>
                    <p className="text-muted-foreground text-xs line-clamp-1">{property.address}</p>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{property.bedrooms} bed</span>
                      <span>•</span>
                      <span>{property.bathrooms} bath</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Map */}
        <div className="flex-1 relative">
          {/* Placeholder for actual map implementation */}
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Interactive map would be displayed here. <br />
                (Requires map API implementation)
              </p>
            </div>
          </div>
          
          {/* Property popup */}
          {selectedProperty && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-slide-in-right">
                <div className="relative">
                  <img 
                    src={selectedProperty.images[0]} 
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
                    <p className="text-lg font-semibold text-primary">${selectedProperty.price.toLocaleString()}</p>
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
