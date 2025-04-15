import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Menu, Info, Search } from 'lucide-react';
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [scrolled, setScrolled] = React.useState(false);
  
  React.useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 px-6 md:px-10 transition-all duration-300",
        scrolled 
          ? "bg-white/90 backdrop-blur-md shadow-sm" 
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-1 -mt-1.5">
            <span className="text-vibe-navy font-serif font-medium text-2xl">iris</span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link 
              to="/search" 
              className="text-vibe-charcoal hover:text-vibe-navy md:text-base text-base transition-colors duration-200"
            >
              Search
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="px-3 py-1 bg-vibe-navy/10 text-vibe-navy rounded-full text-md font-medium flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>Built for SF — New Cities Soon!</span>
          </div>
          <button className="md:hidden text-vibe-charcoal">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
