
import React from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Menu } from 'lucide-react';

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
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-4 transition-all duration-300 ${
        scrolled ? 'glass shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-display text-xl font-semibold">Vibe Search</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/search" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Search
            </Link>
            <Link to="/map" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Map View
            </Link>
            <Link to="/favorites" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Favorites
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/search" className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Search className="h-5 w-5" />
          </Link>
          <button className="md:hidden p-2 rounded-full hover:bg-secondary transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <Link 
            to="/search" 
            className="hidden md:block px-4 py-2 bg-primary text-white rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all"
          >
            Find Apartments
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
