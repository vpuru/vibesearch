
import React from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import SearchFilters from '../components/search/SearchFilters';
import PropertyGrid from '../components/search/PropertyGrid';

const Search = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-16"> {/* Space for fixed navbar */}
        <SearchFilters />
        <main className="flex-grow">
          <PropertyGrid />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Search;
