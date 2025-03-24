
import React, { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import WaitlistForm from '@/components/WaitlistForm';
import VibeCard from '@/components/VibeCard';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ArrowDown } from 'lucide-react';

const Index = () => {
  useEffect(() => {
    const handleLoad = () => {
      document.body.classList.add('loaded');
    };
    
    window.addEventListener('load', handleLoad);
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full">
      <AnimatedBackground />
      <Navigation />
      
      {/* Hero Section */}
      <section className="min-h-screen pt-20 flex flex-col items-center justify-center px-6 md:px-10">
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
          <div className="inline-block px-3 py-1 rounded-full bg-vibe-sage/20 text-vibe-charcoal text-sm mb-4">
            Coming Soon
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-balance leading-tight">
            Find a place that <span className="text-vibe-navy">feels</span> like home
          </h1>
          
          <p className="text-lg md:text-xl text-vibe-charcoal/80 max-w-2xl mx-auto text-balance">
            Search for homes by the vibe you want, not just by the numbers.
            Discover spaces that speak to you, that match your lifestyle and aesthetic.
          </p>
          
          <div className="pt-8">
            <button 
              onClick={() => scrollToSection('join')}
              className="vibe-button inline-flex items-center"
            >
              Join the Waitlist
            </button>
          </div>
        </div>
        
        <div className="absolute bottom-10 left-0 right-0 flex justify-center animate-pulse-slow">
          <button 
            onClick={() => scrollToSection('how-it-works')}
            className="p-2 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300"
            aria-label="Scroll down"
          >
            <ArrowDown className="h-6 w-6 text-vibe-charcoal" />
          </button>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-medium">How Vibe Search Works</h2>
            <p className="mt-4 text-vibe-charcoal/80 max-w-2xl mx-auto">
              We're reimagining home search to be more intuitive, emotional, and aligned with how people actually think about spaces.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="glass-card rounded-xl p-6 text-center opacity-0 animate-fade-up" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 rounded-full bg-vibe-light-blue/20">
                <span className="text-2xl font-serif font-medium text-vibe-navy">1</span>
              </div>
              <h3 className="text-xl font-medium mb-2">Describe Your Vibe</h3>
              <p className="text-vibe-charcoal/80">
                Tell us what you're looking for using natural language — "sunny loft with creative energy" or "peaceful cottage near nature."
              </p>
            </div>
            
            <div className="glass-card rounded-xl p-6 text-center opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 rounded-full bg-vibe-sage/20">
                <span className="text-2xl font-serif font-medium text-vibe-navy">2</span>
              </div>
              <h3 className="text-xl font-medium mb-2">Our AI Understands</h3>
              <p className="text-vibe-charcoal/80">
                Our technology translates your vibe into relevant search parameters while understanding the emotional qualities you're seeking.
              </p>
            </div>
            
            <div className="glass-card rounded-xl p-6 text-center opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 rounded-full bg-vibe-terracotta/20">
                <span className="text-2xl font-serif font-medium text-vibe-navy">3</span>
              </div>
              <h3 className="text-xl font-medium mb-2">Discover Your Match</h3>
              <p className="text-vibe-charcoal/80">
                Browse homes that match your desired feeling and aesthetic, not just the number of bedrooms or square footage.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Vibes Section */}
      <section id="vibes" className="py-20 px-6 md:px-10 bg-vibe-warm-sand/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-medium">Discover Your Perfect Vibe</h2>
            <p className="mt-4 text-vibe-charcoal/80 max-w-2xl mx-auto">
              From cozy and rustic to modern and minimal, find the aesthetic and feeling that speaks to you.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <VibeCard 
              title="Cozy Retreat"
              description="Warm, inviting spaces with soft textures and natural elements that feel like a gentle hug."
              imageUrl="https://images.unsplash.com/photo-1482938289607-e9573fc25ebb"
              color="#E6DFD9"
              delay={0}
            />
            
            <VibeCard 
              title="Urban Chic"
              description="Sleek, sophisticated spaces with clean lines, high ceilings, and modern amenities."
              imageUrl="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05"
              color="#A0D7E7"
              delay={200}
            />
            
            <VibeCard 
              title="Creative Haven"
              description="Unique, character-filled spaces that inspire creativity and self-expression."
              imageUrl="https://images.unsplash.com/photo-1721322800607-8c38375eef04"
              color="#E29E8C"
              delay={400}
            />
            
            <VibeCard 
              title="Serene Sanctuary"
              description="Calm, peaceful spaces that help you disconnect and recharge in tranquility."
              imageUrl="https://images.unsplash.com/photo-1500375592092-40eb2168fd21"
              color="#D1E2C4"
              delay={600}
            />
            
            <VibeCard 
              title="Social Gathering"
              description="Open, welcoming spaces perfect for entertaining friends and hosting memorable gatherings."
              imageUrl="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05"
              color="#A0D7E7"
              delay={800}
            />
            
            <VibeCard 
              title="Natural Connection"
              description="Spaces that blur the line between indoors and outdoors, bringing nature into your daily life."
              imageUrl="https://images.unsplash.com/photo-1482938289607-e9573fc25ebb"
              color="#D1E2C4"
              delay={1000}
            />
          </div>
        </div>
      </section>
      
      {/* Join Waitlist Section */}
      <section id="join" className="py-20 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-medium">Be the First to Know</h2>
            <p className="mt-4 text-vibe-charcoal/80 max-w-2xl mx-auto">
              Join our waitlist to get early access when we launch. Finding your perfect vibe starts here.
            </p>
          </div>
          
          <WaitlistForm />
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-10 px-6 md:px-10 bg-white/50 backdrop-blur-sm border-t border-vibe-light-blue/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-1 mb-4 md:mb-0">
            <span className="text-vibe-navy font-serif font-medium text-xl">vibe</span>
            <span className="text-vibe-terracotta font-serif font-light text-xl">search</span>
          </div>
          
          <div className="text-sm text-vibe-charcoal/70 text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} Vibe Search. All rights reserved.</p>
            <p className="mt-1">Finding a home that feels like you.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
