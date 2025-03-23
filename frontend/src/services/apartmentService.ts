import { Property } from '../components/search/PropertyCard';

const API_URL = 'http://localhost:3001/api';

interface SearchFilters {
  city?: string;
  state?: string;
  priceMin?: string;
  priceMax?: string;
  bedrooms?: string;
  bathrooms?: string;
  amenities?: string[];
}

interface SearchParams {
  query: string;
  filters?: SearchFilters;
  topK?: number;
}

interface SearchResponseMatch {
  id: string;
  score: number;
  metadata: any;
}

interface SearchResponse {
  results: SearchResponseMatch[];
}

// Convert Pinecone metadata to frontend Property type
const mapMetadataToProperty = (match: SearchResponseMatch): Property => {
  return {
    id: match.id,
    title: match.metadata.property_name || 'Apartment',
    address: `${match.metadata.address || ''}, ${match.metadata.city || ''}, ${match.metadata.state || ''}`,
    price: match.metadata.min_rent || 0,
    bedrooms: match.metadata.min_beds || 0,
    bathrooms: match.metadata.min_baths || 1,
    squareFeet: match.metadata.square_feet || 0,
    images: match.metadata.image_urls || [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80',
    ],
    description: match.metadata.description || '',
    features: match.metadata.amenities 
      ? Object.keys(match.metadata.amenities)
          .filter(key => match.metadata.amenities[key] === 'true')
          .map(key => key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
      : [],
  };
};

// Function to search apartments with semantic search
export const searchApartments = async (params: SearchParams): Promise<Property[]> => {
  try {
    const response = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to search apartments');
    }

    const data: SearchResponse = await response.json();
    return data.results.map(mapMetadataToProperty);
  } catch (error) {
    console.error('Error searching apartments:', error);
    return [];
  }
};