import React, { useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import HeroSection from '../components/home/HeroSection';
import FeaturesSection from '../components/home/FeaturesSection';
import { useSearch } from '../contexts/SearchContext';

const Index = () => {
  const { resetSearchState } = useSearch();
  
  // Reset search state when landing on homepage
  useEffect(() => {
    resetSearchState();
  }, [resetSearchState]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
