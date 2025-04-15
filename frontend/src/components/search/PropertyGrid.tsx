import React, { useState, useEffect, useRef, useCallback } from "react";
import PropertyCard, { Property } from "./PropertyCard";
import PropertyCardSkeleton from "./PropertyCardSkeleton";
import { Map, Loader2, ArrowDown } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

// Fallback image for properties without images
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
  "https://images.unsplash.com/photo-1502005097973-6a7082348e28?ixlib=rb-4.0.3&auto=format&fit=crop&w=2344&q=80",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80",
];

// Number of items to display per page
const ITEMS_PER_PAGE = 15;

interface PropertyGridProps {
  propertyIds?: string[]; // Array of property IDs
  properties?: Property[]; // For backward compatibility
  loading: boolean;
  error?: string;
  showMapToggle?: boolean;
  searchTerm?: string;
  searchType?: 'text' | 'image' | 'both' | 'none';
  onLoadMore?: () => void; // Callback for loading more results
}

const PropertyGrid: React.FC<PropertyGridProps> = ({
  propertyIds = [], // Default to empty array
  properties = [], // For backward compatibility
  loading = false,
  error,
  showMapToggle = true,
  searchTerm = "",
  searchType = 'text',
  onLoadMore,
}) => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || searchTerm;

  // Use either propertyIds or properties (for backward compatibility)
  const allItems = propertyIds.length > 0 ? propertyIds : properties;
  const totalItemCount = allItems.length;

  // State for pagination
  const [page, setPage] = useState(1);
  const [visibleItems, setVisibleItems] = useState<Array<string | Property>>([]);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Observer for infinite scrolling
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || isLoadingMore) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreItems) {
          loadMoreItems();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, isLoadingMore, hasMoreItems]
  );

  // Initialize visible items on first render and when items change
  useEffect(() => {
    if (allItems.length > 0) {
      console.log(`PropertyGrid: Initializing with ${allItems.length} items`);
      // Get unique items to prevent duplicates
      const uniqueItems = Array.from(new Set(allItems));
      const initialItems = uniqueItems.slice(0, ITEMS_PER_PAGE);
      setVisibleItems(initialItems);
      setHasMoreItems(uniqueItems.length > ITEMS_PER_PAGE);
      setPage(1);
    } else {
      console.log("PropertyGrid: No items to display");
      setVisibleItems([]);
      setHasMoreItems(false);
    }
  }, [allItems]);

  // Function to load more items
  const loadMoreItems = () => {
    if (!hasMoreItems || loading || isLoadingMore) return;

    setIsLoadingMore(true);

    // Simulate a small delay to show loading state
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = (nextPage - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      
      // Ensure we're working with unique items to prevent duplicates
      const uniqueItems = Array.from(new Set(allItems));
      const newItems = uniqueItems.slice(0, endIndex);
      
      console.log(`PropertyGrid: Loading more items. Page ${nextPage}, showing ${newItems.length} of ${uniqueItems.length} items`);

      setVisibleItems(newItems);
      setPage(nextPage);
      setHasMoreItems(endIndex < uniqueItems.length);
      setIsLoadingMore(false);

      // If we're reaching the end of our loaded items, request more from backend
      if (endIndex >= uniqueItems.length - ITEMS_PER_PAGE && onLoadMore) {
        console.log("PropertyGrid: Requesting more items from backend");
        onLoadMore();
      }
    }, 500);
  };

  // // Debug output
  // console.log("PropertyGrid props:", {
  //   propertyIdsCount: propertyIds?.length || 0,
  //   propertiesCount: properties?.length || 0,
  //   visibleItemsCount: visibleItems.length,
  //   totalItemCount,
  //   page,
  //   hasMoreItems,
  //   loading,
  //   error,
  //   searchTerm,
  // });

  // Render skeleton loading state
  const renderSkeletons = () => {
    return Array.from({ length: 6 }, (_, index) => (
      <PropertyCardSkeleton key={index} featured={index === 0} />
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8 flex-grow flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          {loading && visibleItems.length === 0 ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <h2 className="text-2xl font-sans text-vibe-navy font-semibold">Searching...</h2>
            </div>
          ) : error ? (
            <h2 className="text-2xl font-semibold text-red-500">Error</h2>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-vibe-navy font-sans leading-none flex items-baseline">
                <span>{totalItemCount} results</span>
                {searchType === 'text' && searchQuery && (
                  <span className="ml-1 font-normal text-vibe-charcoal/70 inline-flex">for "{decodeURIComponent(searchQuery)}"</span>
                )}
                {searchType === 'image' && (
                  <span className="ml-1 font-normal text-vibe-charcoal/70 inline-flex">that match your images</span>
                )}
                {searchType === 'both' && searchQuery && (
                  <span className="ml-1 font-normal text-vibe-charcoal/70 inline-flex">that match your images and "{decodeURIComponent(searchQuery)}"</span>
                )}
              </h2>
              <p className="text-vibe-charcoal/70 font-sans mt-1.5">
                {totalItemCount > 0
                  ? `Showing ${visibleItems.length} of ${totalItemCount} available properties`
                  : "No properties found matching your criteria"}
              </p>
            </>
          )}
        </div>

        {showMapToggle && totalItemCount > 0 && (
          <Link
            to={`/map${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}
            className="flex items-center gap-2 px-4 py-2 bg-vibe-navy text-white rounded-lg"
          >
            <Map className="h-4 w-4" />
            <span>View Map</span>
          </Link>
        )}
      </div>

      {/* Initial loading state */}
      {loading && visibleItems.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderSkeletons()}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-red-50 rounded-full p-8 mb-5">
            <svg
              className="h-12 w-12 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-red-600">Error Loading Properties</h3>
          <p className="text-gray-600 max-w-md">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-vibe-navy text-white rounded-lg hover:bg-vibe-navy/90"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      ) : visibleItems.length > 0 ? (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Overlay that appears during loading */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-white bg-opacity-70 rounded-full p-3">
                  <Loader2 className="h-8 w-8 animate-spin text-vibe-navy" />
                </div>
              </div>
            )}
            
            {visibleItems.map((item, index) => {
              // If item is a string (ID), pass it to PropertyCard
              // If item is a Property object, pass it as is (for backward compatibility)
              return (
                <PropertyCard
                  key={typeof item === "string" ? item : item.id || index}
                  property={item}
                  featured={index === 0}
                />
              );
            })}
          </div>

          {/* Load more section */}
          {hasMoreItems && (
            <div ref={loadMoreRef} className="flex justify-center items-center py-8 mt-4">
              {isLoadingMore ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading more properties...</p>
                </div>
              ) : (
                <button
                  onClick={loadMoreItems}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ArrowDown className="h-4 w-4" />
                  <span>Load more properties</span>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center flex-grow">
          <div className="bg-gray-100 rounded-full p-8 mb-5">
            <Map className="h-12 w-12 text-gray-400" />
          </div>
          <p className="text-muted-foreground max-w-md">
            Try adjusting your search criteria or try a different combination to find more options.
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyGrid;
