import React, { useEffect, useRef, useState } from "react";
import { Search, X, Sliders, Loader2, Map as MapIcon, LayoutGrid, DollarSign, Bed, Bath } from "lucide-react";
import { useSearch } from "../../contexts/SearchContext";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../../lib/utils";

const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200">
      <SliderPrimitive.Range className="absolute h-full bg-vibe-navy" />
    </SliderPrimitive.Track>
    {props.defaultValue?.map((_, i) => (
      <SliderPrimitive.Thumb
        key={i}
        className="block h-5 w-5 rounded-full border-2 border-white bg-vibe-navy ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vibe-navy focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      />
    ))}
  </SliderPrimitive.Root>
));

export interface SearchFilterValues {
  query: string;
  min_beds?: number;
  max_beds?: number;
  min_baths?: number;
  max_baths?: number;
  min_rent?: number;
  max_rent?: number;
  studio?: boolean;
}

interface SearchFiltersProps {
  onSearch: (filters: SearchFilterValues) => void;
  initialQuery?: string;
  initialValues?: SearchFilterValues;
  isLoading?: boolean;
  currentView?: "map" | "list";
  onViewToggle?: () => void;
}

const ViewToggle: React.FC<{ currentView: "map" | "list"; onToggle: () => void }> = ({
  currentView,
  onToggle,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex items-center h-10 rounded-full px-1 transition-colors duration-200 ${
        currentView === "map" ? "bg-vibe-navy" : "bg-gray-200"
      }`}
    >
      <div
        className={`absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          currentView === "map" ? "translate-x-8" : "translate-x-0"
        }`}
      />
      <div className="flex items-center space-x-2 px-2">
        <LayoutGrid
          className={`h-5 w-5 transition-colors duration-200 ${
            currentView === "list" ? "text-vibe-navy" : "text-gray-400"
          }`}
        />
        <MapIcon
          className={`h-5 w-5 transition-colors duration-200 ${
            currentView === "map" ? "text-white" : "text-gray-400"
          }`}
        />
      </div>
    </button>
  );
};

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  initialQuery = "",
  initialValues,
  isLoading = false,
  currentView = "list",
  onViewToggle,
}) => {
  const { imageUrls, searchType } = useSearch();
  // Set initial state to false to ensure filters are closed by default
  const [showFilters, setShowFilters] = useState(false);
  const afterSearchRef = useRef(false);
  
  // If we're trying to show filters after a search was performed, force them closed
  useEffect(() => {
    if (showFilters && afterSearchRef.current) {
      setShowFilters(false);
    }
  }, [showFilters]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({
    bedroomRange: [0, 5], // [min, max]
    bathroomRange: [0, 3], // [min, max]
    priceMin: "",
    priceMax: "",
  });
  
  // Reference to the filter dropdown
  const filtersRef = useRef<HTMLDivElement>(null);
  // Reference to the filter button
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const clearFilters = () => {
    setFilters({
      bedroomRange: [0, 5],
      bathroomRange: [0, 3],
      priceMin: "",
      priceMax: "",
    });
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!searchQuery.trim()) return;

    // Convert form values to API filter values
    const searchFilters: SearchFilterValues = {
      query: searchQuery,
    };

    // Add min/max bedrooms from range slider
    const [minBeds, maxBeds] = filters.bedroomRange;
    if (minBeds > 0) {
      searchFilters.min_beds = minBeds;
    }

    if (maxBeds < 5) {
      searchFilters.max_beds = maxBeds;
    }

    // Add min/max bathrooms from range slider
    const [minBaths, maxBaths] = filters.bathroomRange;
    if (minBaths > 0) {
      searchFilters.min_baths = minBaths;
    }

    if (maxBaths < 3) {
      searchFilters.max_baths = maxBaths;
    }

    // Add price range if specified
    if (filters.priceMin) {
      searchFilters.min_rent = parseInt(filters.priceMin);
    }

    if (filters.priceMax) {
      searchFilters.max_rent = parseInt(filters.priceMax);
    }

    // Close filters dropdown after search
    setShowFilters(false);
    
    // Mark that we're performing a search, so we can prevent filters from re-opening
    // when initialValues updates as a result of this search
    afterSearchRef.current = true;
    
    onSearch(searchFilters);
  };

  // Handle Enter key in search box
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Set afterSearchRef.current directly here since handleSearch will be called
      afterSearchRef.current = true;
      handleSearch();
    }
  };

  // Add click outside handler to close filters dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilters &&
        filtersRef.current && 
        !filtersRef.current.contains(event.target as Node) &&
        filterButtonRef.current && 
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilters]);

  
  // Initialize filters from initialValues if provided, without showing the filter panel
  useEffect(() => {
    if (initialValues) {
      const newFilters = { ...filters };

      // Handle bedrooms range
      if (initialValues.min_beds !== undefined || initialValues.max_beds !== undefined) {
        const minBeds = initialValues.min_beds ?? 0;
        const maxBeds = initialValues.max_beds ?? 5;
        newFilters.bedroomRange = [minBeds, maxBeds];
      }

      // Handle bathrooms range
      if (initialValues.min_baths !== undefined || initialValues.max_baths !== undefined) {
        const minBaths = initialValues.min_baths ?? 0;
        const maxBaths = initialValues.max_baths ?? 3;
        newFilters.bathroomRange = [minBaths, maxBaths];
      }

      // Handle price range
      if (initialValues.min_rent) {
        newFilters.priceMin = String(initialValues.min_rent);
      }

      if (initialValues.max_rent) {
        newFilters.priceMax = String(initialValues.max_rent);
      }

      setFilters(newFilters);
      
      // IMPORTANT: We need to force the filter panel to remain closed when 
      // initialValues are updated as a result of a search
      if (afterSearchRef.current) {
        setShowFilters(false);
        afterSearchRef.current = false;
      }
    }
  }, [initialValues]);

  // Use a ref to track if we should trigger a search when the query changes
  const isInitialMount = useRef(true);

  // Set search query when initialQuery changes, but don't trigger a search on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      // Just update the search box without triggering a search
      if (initialQuery) {
        // Decode the URL-encoded query before displaying it
        setSearchQuery(decodeURIComponent(initialQuery));
      }
      isInitialMount.current = false;
    } else {
      // Only trigger search on subsequent updates if there's a query
      if (initialQuery) {
        // Decode the URL-encoded query before displaying it
        setSearchQuery(decodeURIComponent(initialQuery));
      }
    }
  }, [initialQuery]);

  return (
    <div className="w-full bg-white">
      <div className="container mx-auto px-4 py-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 relative">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Describe your ideal apartment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 w-full py-3 px-4 bg-white border border-gray-200 text-vibe-charcoal/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="flex gap-2 relative">
            {/* View Toggle Button */}
            {onViewToggle && (
              <div className="flex items-center">
                <ViewToggle currentView={currentView} onToggle={onViewToggle} />
              </div>
            )}

            <button
              ref={filterButtonRef}
              type="button"
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                showFilters
                  ? "bg-vibe-navy text-white"
                  : "bg-gray-200 text-vibe-charcoal/70 hover:bg-gray-300"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Sliders className="h-5 w-5" />
              <span>Filters</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-vibe-navy text-white rounded-lg min-w-[100px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </>
              )}
            </button>
            
            {/* Filters dropdown popup */}
            {showFilters && (
              <div 
                ref={filtersRef}
                className="absolute right-0 top-full mt-2 w-[350px] md:w-[450px] bg-white shadow-lg rounded-lg z-50 animate-in slide-in-from-top-2 duration-200"
                style={{ 
                  transformOrigin: 'top right',
                }}
              >
                <div className="p-4">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-vibe-charcoal">Filters</h3>
                    <button
                      type="button"
                      className="text-sm text-vibe-charcoal/70 hover:text-vibe-charcoal flex items-center gap-1"
                      onClick={clearFilters}
                    >
                      <span>Clear all</span>
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Bedrooms */}
                    <div>
                      <div className="mb-2 flex justify-between items-center">
                        <label
                          htmlFor="bedroom-range"
                          className="flex items-center gap-2 text-sm font-medium text-vibe-charcoal"
                        >
                          <Bed className="h-4 w-4 text-vibe-navy" />
                          <span>Bedrooms: {filters.bedroomRange[0]} - {filters.bedroomRange[1] === 5 ? "5+" : filters.bedroomRange[1]}</span>
                        </label>
                        <span className="text-xs text-vibe-charcoal/50">
                          {filters.bedroomRange[0] === 0 && filters.bedroomRange[1] === 5 ? "Any" : ""}
                        </span>
                      </div>
                      <div className="px-2 pt-4 pb-1">
                        <RangeSlider
                          id="bedroom-range"
                          min={0}
                          max={5}
                          step={1}
                          value={filters.bedroomRange}
                          onValueChange={(value) => {
                            setFilters({
                              ...filters,
                              bedroomRange: value as [number, number],
                            });
                          }}
                          defaultValue={[0, 5]}
                          className="mb-4"
                        />
                        <div className="flex justify-between text-xs text-vibe-charcoal/50 px-1 mt-1">
                          <span>0</span>
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                          <span>5+</span>
                        </div>
                      </div>
                    </div>

                    {/* Bathrooms */}
                    <div>
                      <div className="mb-2 flex justify-between items-center">
                        <label
                          htmlFor="bathroom-range"
                          className="flex items-center gap-2 text-sm font-medium text-vibe-charcoal"
                        >
                          <Bath className="h-4 w-4 text-vibe-navy" />
                          <span>Bathrooms: {filters.bathroomRange[0]} - {filters.bathroomRange[1] === 3 ? "3+" : filters.bathroomRange[1]}</span>
                        </label>
                        <span className="text-xs text-vibe-charcoal/50">
                          {filters.bathroomRange[0] === 0 && filters.bathroomRange[1] === 3 ? "Any" : ""}
                        </span>
                      </div>
                      <div className="px-2 pt-4 pb-1">
                        <RangeSlider
                          id="bathroom-range"
                          min={0}
                          max={3}
                          step={0.5}
                          value={filters.bathroomRange}
                          onValueChange={(value) => {
                            setFilters({
                              ...filters,
                              bathroomRange: value as [number, number],
                            });
                          }}
                          defaultValue={[0, 3]}
                          className="mb-4"
                        />
                        <div className="flex justify-between text-xs text-vibe-charcoal/50 px-1 mt-1">
                          <span>0</span>
                          <span>1</span>
                          <span>2</span>
                          <span>3+</span>
                        </div>
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-vibe-navy" />
                        <span className="text-sm font-medium text-vibe-charcoal">Price Range</span>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-vibe-charcoal/70">$</span>
                            </div>
                            <input
                              type="number"
                              id="price-min"
                              placeholder="Min"
                              value={filters.priceMin}
                              onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                              className="pl-8 w-full p-3 border border-gray-300 rounded-lg text-vibe-charcoal/70 focus:outline-none focus:ring-2 focus:ring-vibe-navy/30"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-vibe-charcoal/70">$</span>
                            </div>
                            <input
                              type="number"
                              id="price-max"
                              placeholder="Max"
                              value={filters.priceMax}
                              onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                              className="pl-8 w-full p-3 border border-gray-300 rounded-lg text-vibe-charcoal/70 focus:outline-none focus:ring-2 focus:ring-vibe-navy/30"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Apply Filters Button */}
                    <button
                      type="submit"
                      className="w-full py-3 bg-vibe-navy text-white rounded-lg font-medium transition-colors hover:bg-vibe-navy/90"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Display uploaded images if available */}
        {imageUrls.length > 0 && (
          <div className="mt-3">
            <div className="flex gap-2 overflow-x-auto mt-4">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img
                    src={url}
                    alt={`Search image ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-md border border-gray-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;
