
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-10 transition-all duration-300",
        scrolled 
          ? "bg-white/90 backdrop-blur-md shadow-sm" 
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <span className="text-vibe-navy font-serif font-medium text-2xl">vibe</span>
          <span className="text-vibe-terracotta font-serif font-light text-2xl">search</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a 
            href="#how-it-works" 
            className="text-vibe-charcoal hover:text-vibe-navy transition-colors duration-200"
          >
            How It Works
          </a>
          <a 
            href="#vibes" 
            className="text-vibe-charcoal hover:text-vibe-navy transition-colors duration-200"
          >
            Vibes
          </a>
          <a 
            href="#join" 
            className="px-5 py-2 bg-vibe-navy text-white rounded-md hover:shadow-md transition-all duration-200"
          >
            Join Waitlist
          </a>
        </nav>
        
        <button className="md:hidden text-vibe-charcoal">
          Menu
        </button>
      </div>
    </header>
  );
};

export default Navigation;
