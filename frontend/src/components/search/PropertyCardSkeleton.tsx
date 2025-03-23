import React from "react";

interface PropertyCardSkeletonProps {
  featured?: boolean;
}

const PropertyCardSkeleton: React.FC<PropertyCardSkeletonProps> = ({ featured = false }) => {
  return (
    <div
      className={`rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse bg-white ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      {/* Image placeholder */}
      <div className="aspect-[4/3] bg-gray-200"></div>

      {/* Content area */}
      <div className="p-4">
        {/* Title and price */}
        <div className="flex justify-between items-start mb-2">
          <div className="h-6 bg-gray-200 rounded w-3/5"></div>
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        </div>

        {/* Address */}
        <div className="h-4 bg-gray-200 rounded mb-4 w-4/5"></div>

        {/* Features */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-[60px]"></div>
          <div className="h-4 bg-gray-200 rounded w-[60px]"></div>
          <div className="h-4 bg-gray-200 rounded w-[70px]"></div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCardSkeleton;
