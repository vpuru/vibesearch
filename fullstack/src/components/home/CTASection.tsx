
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-24 bg-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6 animate-fade-in">
            Ready to Find Your Perfect Apartment?
          </h2>
          <p className="text-white/80 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of happy renters who found their ideal home using our intelligent search platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/search" 
              className="w-full sm:w-auto px-8 py-4 bg-white text-primary rounded-full font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              Start Searching
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link 
              to="/how-it-works" 
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white text-white rounded-full font-medium hover:bg-white/10 transition-all flex items-center justify-center"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
