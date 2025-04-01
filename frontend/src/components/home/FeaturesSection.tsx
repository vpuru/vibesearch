import React from 'react';
import { Search, Map, Filter, Clock, Star, Shield } from 'lucide-react';

const features = [
  {
    icon: <Search className="h-6 w-6 text-primary" />,
    title: 'Semantic Search',
    description: 'Describe your ideal apartment in natural language and let our AI find the perfect match for you.'
  },
  {
    icon: <Map className="h-6 w-6 text-primary" />,
    title: 'Interactive Maps',
    description: 'View all available properties on an intuitive map interface to find the best location.'
  },
  {
    icon: <Filter className="h-6 w-6 text-primary" />,
    title: 'Advanced Filters',
    description: 'Combine semantic search with traditional filters like price, bedrooms, and amenities.'
  },
  {
    icon: <Clock className="h-6 w-6 text-primary" />,
    title: 'Real-time Updates',
    description: 'Get notified immediately when new properties matching your criteria become available.'
  },
  {
    icon: <Shield className="h-6 w-6 text-primary" />,
    title: 'Verified Listings',
    description: 'All properties are verified to ensure accurate information and prevent fraud.'
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Find Your Perfect Place with Intelligent Features
          </h2>
          <p className="text-muted-foreground text-lg">
            Our platform combines cutting-edge technology with user-friendly design to make apartment hunting a breeze.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:translate-y-[-2px] duration-300"
            >
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
