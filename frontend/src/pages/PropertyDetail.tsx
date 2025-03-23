import React from "react";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import PropertyDetails from "../components/property/PropertyDetails";

const PropertyDetail: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow pt-16">
        <PropertyDetails />
      </div>
      <Footer />
    </div>
  );
};

export default PropertyDetail;
