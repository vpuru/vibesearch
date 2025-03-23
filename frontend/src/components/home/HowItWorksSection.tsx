
import React from 'react';
import { ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Describe Your Ideal Apartment',
    description: 'Use natural language to describe what you\'re looking for in your perfect apartment.',
    image: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
  },
  {
    number: '02',
    title: 'Review Matches on the Map',
    description: 'See all matched properties displayed on an interactive map for easy location comparison.',
    image: 'https://images.unsplash.com/photo-1577512571561-64a31195c57a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
  },
  {
    number: '03',
    title: 'Refine With Filters',
    description: 'Use additional filters to narrow down your search based on specific requirements.',
    image: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c0862?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
  },
  {
    number: '04',
    title: 'Contact and Tour',
    description: 'Schedule a viewing directly through our platform and find your new home.',
    image: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            How Vibe Search Works
          </h2>
          <p className="text-muted-foreground text-lg">
            Our intuitive process makes finding your perfect apartment simple and straightforward.
          </p>
        </div>
        
        <div className="space-y-12 md:space-y-24">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-16`}
            >
              <div className="w-full md:w-1/2 space-y-4">
                <div className="inline-block px-3 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium">
                  Step {step.number}
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground text-lg">{step.description}</p>
                
                {index === steps.length - 1 && (
                  <button className="mt-4 inline-flex items-center gap-2 text-primary font-medium">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="w-full md:w-1/2">
                <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-video">
                  <img 
                    src={step.image} 
                    alt={step.title} 
                    className="w-full h-full object-cover hover-scale"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
