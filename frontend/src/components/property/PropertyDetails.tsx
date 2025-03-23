
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Calendar,
  Home,
  CheckCircle,
  X
} from 'lucide-react';
import { Property } from '../search/PropertyCard';

// Mock data for a single property
const mockPropertyData: { [key: string]: Property } = {
  '1': {
    id: '1',
    title: 'Modern Downtown Apartment',
    address: '123 Main St, New York, NY',
    price: 2500,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1200,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1502005097973-6a7082348e28?ixlib=rb-4.0.3&auto=format&fit=crop&w=2344&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1617103996702-96ff29b1c467?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
    ],
    description: 'Beautiful modern apartment in the heart of downtown. Features high ceilings, hardwood floors, and stunning city views. This recently renovated unit includes stainless steel appliances, quartz countertops, and an open concept living and dining area. The building offers a fitness center, rooftop terrace, and 24-hour doorman service.',
    features: ['City View', 'Hardwood Floors', 'Fitness Center', 'Doorman', 'Rooftop Terrace', 'In-unit Laundry', 'Central Air']
  },
  '2': {
    id: '2',
    title: 'Cozy Studio with Garden View',
    address: '456 Park Ave, Brooklyn, NY',
    price: 1800,
    bedrooms: 0,
    bathrooms: 1,
    squareFeet: 650,
    images: [
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80'
    ],
    description: 'Charming studio apartment with a beautiful garden view. Perfect for professionals or students. This bright and airy space features hardwood floors, a renovated kitchen with new appliances, and custom built-in storage solutions. The building is pet-friendly and includes laundry facilities, bike storage, and a shared courtyard garden.',
    features: ['Garden View', 'Pet Friendly', 'Recently Renovated', 'Laundry in Building', 'Bike Storage', 'Hardwood Floors']
  },
  // Additional properties can be added here...
};

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  
  // Find the property data by ID
  const property = id ? mockPropertyData[id] : null;
  
  if (!property) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold mb-4">Property Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The property you're looking for doesn't exist or has been removed.
        </p>
        <Link 
          to="/search" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>
      </div>
    );
  }
  
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };
  
  return (
    <div className="min-h-screen pb-16">
      {/* Top Navigation */}
      <div className="sticky top-0 z-20 bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/search" className="flex items-center text-gray-700">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <button 
              className={`flex items-center gap-1 text-sm ${isFavorite ? 'text-primary' : 'text-gray-700'}`}
              onClick={toggleFavorite}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
              <span className="hidden md:inline">Save</span>
            </button>
            
            <button className="flex items-center gap-1 text-sm text-gray-700">
              <Share2 className="h-5 w-5" />
              <span className="hidden md:inline">Share</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Image Gallery */}
      <div className="bg-gray-100">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden shadow-sm aspect-[4/3]">
              <img 
                src={property.images[selectedImageIndex]} 
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {property.images.slice(0, 4).map((image, index) => (
                <div 
                  key={index}
                  className={`rounded-xl overflow-hidden shadow-sm aspect-[4/3] cursor-pointer transition-all ${
                    selectedImageIndex === index ? 'ring-4 ring-primary' : 'hover:opacity-90'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img 
                    src={image} 
                    alt={`${property.title} - Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Property Details */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-semibold">{property.title}</h1>
                <p className="text-2xl font-semibold text-primary">${property.price.toLocaleString()}/mo</p>
              </div>
              
              <div className="flex items-center text-muted-foreground mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{property.address}</span>
              </div>
              
              <div className="flex items-center gap-6 py-4 border-y border-gray-200">
                <div className="flex items-center">
                  <Bed className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{property.bedrooms} {property.bedrooms === 1 ? 'bed' : 'beds'}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Bath className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{property.bathrooms} {property.bathrooms === 1 ? 'bath' : 'baths'}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Square className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{property.squareFeet.toLocaleString()} sq ft</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {property.description}
              </p>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Features & Amenities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {property.features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-primary mr-2" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Location</h2>
              <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                <MapPin className="h-10 w-10 text-gray-400" />
                <span className="text-muted-foreground ml-2">Map would be displayed here</span>
              </div>
            </div>
          </div>
          
          <div>
            <div className="glass p-6 rounded-xl shadow-sm sticky top-24">
              <h3 className="text-lg font-semibold mb-4">Contact Property</h3>
              
              {showContactForm ? (
                <div className="space-y-4">
                  <button 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowContactForm(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                  
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name
                    </label>
                    <input 
                      type="text" 
                      id="name" 
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input 
                      type="email" 
                      id="email" 
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input 
                      type="tel" 
                      id="phone" 
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea 
                      id="message" 
                      rows={4}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={`Hi, I'm interested in ${property.title}. Please contact me with more information.`}
                    />
                  </div>
                  
                  <button 
                    className="w-full py-2 bg-primary text-white rounded-lg font-medium"
                  >
                    Send Message
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-lg font-medium"
                    onClick={() => setShowContactForm(true)}
                  >
                    Request Information
                  </button>
                  
                  <button 
                    className="flex items-center justify-center gap-2 w-full py-3 border border-primary text-primary bg-transparent rounded-lg font-medium"
                    onClick={() => setShowContactForm(true)}
                  >
                    <Calendar className="h-5 w-5" />
                    Schedule a Tour
                  </button>
                  
                  <div className="text-center text-muted-foreground text-sm">
                    <p>Property managed by</p>
                    <p className="font-semibold text-foreground">Vibe Search Property Management</p>
                  </div>
                  
                  <div className="flex justify-center pt-4 border-t">
                    <Home className="h-6 w-6 text-primary" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
