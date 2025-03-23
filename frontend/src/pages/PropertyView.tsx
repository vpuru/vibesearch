
import React from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import PropertyDetails from '../components/property/PropertyDetails';

const PropertyView = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-16"> {/* Space for fixed navbar */}
        <PropertyDetails />
      </div>
      <Footer />
    </div>
  );
};

export default PropertyView;
