import React, { useEffect } from 'react';
import { MessageSquare, Brain, Home } from 'lucide-react';

const features = [
  {
    icon: <MessageSquare className="h-6 w-6 text-vibe-navy" />,
    title: 'Describe Your Dream Apartment',
    description: 'Tell us what you\'re looking for using words or images — phrases like "sunny loft with in-unit W/D, near the pier" or upload your vision board.'},
  {
    icon: <Brain className="h-6 w-6 text-vibe-navy" />,
    title: 'Our AI Understands',
    description: 'Our technology translates what you\'re seeking into relevant search parameters.'
  },
  {
    icon: <Home className="h-6 w-6 text-vibe-navy" />,
    title: 'Discover Your Match',
    description: 'Browse apartments that match exactly what you\'re looking for, not just the number of bedrooms or square footage.'
  }
];

const FeaturesSection = () => {
  useEffect(() => {
    const featureCard = document.getElementById('feature-card');
    if (featureCard) {
      // console.log('Feature card element found:', featureCard);
    } else {
      console.warn('Feature card element not found');
    }
  }, []);

  return (
    <section 
      id="feature-card" 
      className="relative overflow-hidden py-16 pb-8 md:py-24 md:pb-12"
      style={{ scrollMarginTop: '80px' }}
    >
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-vibe-light-blue/10 rounded-full filter blur-[100px] animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-[-5%] left-[-10%] w-[10%] h-[40%] bg-blue-500/10 rounded-full filter blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-purple-500/5 rounded-full filter blur-[80px] animate-float" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-medium text-balance leading-[1.2] text-black mb-3">
            How <span className="text-vibe-navy">iris</span> Works
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-vibe-charcoal/70 max-w-full mx-auto overflow-hidden text-ellipsis">
            We think apartment hunting should be more intuitive and more aligned with how people actually think about spaces.          </p>
        </div>
        
        <div className="w-full h-[250px] sm:h-[280px] md:h-[320px] bg-black/5 rounded-xl flex items-center justify-center mb-10 md:mb-12 max-w-3xl mx-auto -mt-5">
          <div className="text-vibe-charcoal/50">Demo Video Placeholder</div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white/90 backdrop-blur-sm border border-vibe-charcoal/10 rounded-xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all hover:translate-y-[-2px] duration-300"
            >
              <div className="flex items-center mb-3 md:mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-vibe-navy/10 mr-3">
                  {feature.icon}
                </div>
                
                <h3 className="text-lg md:text-xl font-medium text-vibe-navy">{feature.title}</h3>
              </div>
              <p className="text-sm md:text-base text-vibe-charcoal/70">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
