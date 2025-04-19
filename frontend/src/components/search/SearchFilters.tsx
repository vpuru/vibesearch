import React, { useEffect, useRef, useState } from "react";
import { Search, X, Sliders, Loader2, Map as MapIcon, LayoutGrid, DollarSign, Bed, Bath } from "lucide-react";
import { useSearch } from "../../contexts/SearchContext";
import { cn } from "../../lib/utils";

const ViewToggle: React.FC<{ currentView: "map" | "list"; onToggle: () => void }> = ({
  currentView,
  onToggle,
}) => {
  return (
    <div className="inline-flex rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={currentView === "map" ? onToggle : undefined}
        className={`inline-flex items-center justify-center gap-2 px-4 py-3 min-w-[70px] transition-colors ${
          currentView === "list" ? "bg-vibe-navy text-white" : "bg-gray-200 text-vibe-charcoal/70 hover:bg-gray-300"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <LayoutGrid className="h-5 w-5" />
          <span>Grid</span>
        </div>
      </button>
      <button
        type="button"
        onClick={currentView === "list" ? onToggle : undefined}
        className={`inline-flex items-center justify-center px-4 py-3 min-w-[70px] transition-colors ${
          currentView === "map" ? "bg-vibe-navy text-white" : "bg-gray-200 text-vibe-charcoal/70 hover:bg-gray-300"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <MapIcon className="h-5 w-5" />
          <span>Map</span>
        </div>
      </button>
    </div>
  );
};

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
  
  // Track first and second selected values for bedrooms and bathrooms
  const [bedroomSelections, setBedroomSelections] = useState<number[]>([]);
  const [bathroomSelections, setBathroomSelections] = useState<number[]>([]);
  
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

  // Update bedroom range whenever selections change
  useEffect(() => {
    if (bedroomSelections.length === 0) {
      // No selection means any bedroom
      setFilters(prev => ({
        ...prev,
        bedroomRange: [0, 5]
      }));
    } else if (bedroomSelections.length === 1) {
      // Single selection means specific bedroom count
      setFilters(prev => ({
        ...prev,
        bedroomRange: [bedroomSelections[0], bedroomSelections[0]]
      }));
    } else {
      // Two selections means range
      const sortedSelections = [...bedroomSelections].sort((a, b) => a - b);
      setFilters(prev => ({
        ...prev,
        bedroomRange: [sortedSelections[0], sortedSelections[1]]
      }));
    }
  }, [bedroomSelections]);

  // Update bathroom range whenever selections change
  useEffect(() => {
    if (bathroomSelections.length === 0) {
      // No selection means any bathroom
      setFilters(prev => ({
        ...prev,
        bathroomRange: [0, 3]
      }));
    } else if (bathroomSelections.length === 1) {
      // Single selection means specific bathroom count
      setFilters(prev => ({
        ...prev,
        bathroomRange: [bathroomSelections[0], bathroomSelections[0]]
      }));
    } else {
      // Two selections means range
      const sortedSelections = [...bathroomSelections].sort((a, b) => a - b);
      setFilters(prev => ({
        ...prev,
        bathroomRange: [sortedSelections[0], sortedSelections[1]]
      }));
    }
  }, [bathroomSelections]);

  const clearFilters = () => {
    setFilters({
      bedroomRange: [0, 5],
      bathroomRange: [0, 3],
      priceMin: "",
      priceMax: "",
    });
    setBedroomSelections([]);
    setBathroomSelections([]);
  };

  // Function to get the button style based on selection state
  const getButtonStyle = (value: number, selections: number[], isStudio = false) => {
    // For range selection, highlight all buttons in the range
    let isSelected = selections.includes(value);
    
    // If we have exactly 2 selections (a range), check if this value is in the range
    if (selections.length === 2) {
      const [min, max] = [...selections].sort((a, b) => a - b);
      isSelected = value >= min && value <= max;
    }
    
    return cn(
      "h-10 rounded-lg transition-colors font-medium text-sm flex items-center justify-center",
      isStudio ? "w-24" : "w-16",
      isSelected
        ? "bg-vibe-navy text-white"
        : "bg-gray-200 text-vibe-charcoal/70 hover:bg-gray-300"
    );
  };

  // Handle bedroom button click
  const handleBedroomClick = (value: number) => {
    setBedroomSelections(prev => {
      // If we have a range (exactly 2 selections)
      if (prev.length === 2) {
        // If clicking a value in the range but not at the boundaries, make it the only selection
        const [min, max] = [...prev].sort((a, b) => a - b);
        if (value > min && value < max) {
          return [value];
        }
        
        // If clicking on a boundary that's already selected, make it the only selection
        if (prev.includes(value)) {
          return [value];
        }
        
        // If clicking outside the current range, make it the only selection
        return [value];
      }
      
      // If already selected and it's the only selection, remove it
      if (prev.length === 1 && prev.includes(value)) {
        return [];
      }
      
      // If not selected yet, add to selection
      if (!prev.includes(value)) {
        return [...prev, value];
      }
      
      // Otherwise add to selections
      return [...prev, value];
    });
  };

  // Handle bathroom button click
  const handleBathroomClick = (value: number) => {
    setBathroomSelections(prev => {
      // If we have a range (exactly 2 selections)
      if (prev.length === 2) {
        // If clicking a value in the range but not at the boundaries, make it the only selection
        const [min, max] = [...prev].sort((a, b) => a - b);
        if (value > min && value < max) {
          return [value];
        }
        
        // If clicking on a boundary that's already selected, make it the only selection
        if (prev.includes(value)) {
          return [value];
        }
        
        // If clicking outside the current range, make it the only selection
        return [value];
      }
      
      // If already selected and it's the only selection, remove it
      if (prev.length === 1 && prev.includes(value)) {
        return [];
      }
      
      // If not selected yet, add to selection
      if (!prev.includes(value)) {
        return [...prev, value];
      }
      
      // Otherwise add to selections
      return [...prev, value];
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
    
    // Only add bedroom filters if user has explicitly selected them
    // For default range [0,5], don't add any filters
    if (bedroomSelections.length > 0) {
      if (minBeds === 0) {
        searchFilters.min_beds = 0;
      } else if (minBeds > 0) {
        searchFilters.min_beds = minBeds;
      }

      if (maxBeds < 5) {
        searchFilters.max_beds = maxBeds;
      }
    }

    // Add min/max bathrooms from range slider
    const [minBaths, maxBaths] = filters.bathroomRange;
    // Only add bathroom filters if user has explicitly selected them
    if (bathroomSelections.length > 0) {
      if (minBaths > 0) {
        searchFilters.min_baths = minBaths;
      }

      if (maxBaths < 3) {
        searchFilters.max_baths = maxBaths;
      }
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
        
        // Update bedroom selections based on range
        if (minBeds === maxBeds) {
          setBedroomSelections([minBeds]);
        } else if (minBeds > 0 || maxBeds < 5) {
          setBedroomSelections([minBeds, maxBeds]);
        } else {
          setBedroomSelections([]);
        }
      }

      // Handle bathrooms range
      if (initialValues.min_baths !== undefined || initialValues.max_baths !== undefined) {
        const minBaths = initialValues.min_baths ?? 0;
        const maxBaths = initialValues.max_baths ?? 3;
        newFilters.bathroomRange = [minBaths, maxBaths];
        
        // Update bathroom selections based on range
        if (minBaths === maxBaths) {
          setBathroomSelections([minBaths]);
        } else if (minBaths > 0 || maxBaths < 3) {
          setBathroomSelections([minBaths, maxBaths]);
        } else {
          setBathroomSelections([]);
        }
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

  // Helper to display bedroom filter range text
  const getBedroomRangeText = () => {
    const [min, max] = filters.bedroomRange;
    
    if (min === 0 && max === 5) return "Any";
    if (min === max) return min === 0 ? "Studio" : `${min} bed`;
    if (min === 0) return `Studio - ${max} beds`;
    return `${min} - ${max === 5 ? "5+" : max} beds`;
  };

  // Helper to display bathroom filter range text
  const getBathroomRangeText = () => {
    const [min, max] = filters.bathroomRange;
    
    if (min === 0 && max === 3) return "Any";
    if (min === max) return `${min} bath`;
    if (min === 0) return `0 - ${max} baths`;
    return `${min} - ${max === 3 ? "3+" : max} baths`;
  };

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
                    <h3 className="font-sans font-semibold text-vibe-navy">Filters</h3>
                    <button
                      type="button"
                      className="text-sm text-vibe-charcoal/70 hover:text-vibe-navy flex items-center gap-1"
                      onClick={clearFilters}
                    >
                      <span>Clear All</span>
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Bedrooms */}
                    <div>
                      <div className="mb-2 flex justify-between items-center">
                        <label className="flex items-center gap-2 text-sm font-medium text-vibe-charcoal/70">
                          <Bed className="h-4 w-4 text-vibe-charcoal/70" />
                          <span>Bedrooms: {getBedroomRangeText()}</span>
                        </label>
                        <span className="text-xs text-vibe-charcoal/50">
                          Select 1 or 2 options
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        <button
                          type="button"
                          className={getButtonStyle(0, bedroomSelections, true)}
                          onClick={() => handleBedroomClick(0)}
                        >
                          <span>Studio</span>
                        </button>
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={`bed-${num}`}
                            type="button" 
                            className={getButtonStyle(num, bedroomSelections, false)}
                            onClick={() => handleBedroomClick(num)}
                          >
                            <span>{num}{num === 5 ? "+" : ""}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bathrooms */}
                    <div>
                      <div className="mb-2 flex justify-between items-center">
                        <label className="flex items-center gap-2 text-sm font-medium text-vibe-charcoal/70">
                          <Bath className="h-4 w-4 text-vibe-charcoal/70" />
                          <span>Bathrooms: {getBathroomRangeText()}</span>
                        </label>
                        <span className="text-xs text-vibe-charcoal/50">
                          Select 1 or 2 options
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        <button
                          type="button"
                          className={getButtonStyle(0, bathroomSelections, false)}
                          onClick={() => handleBathroomClick(0)}
                        >
                          <span>0</span>
                        </button>
                        {[1, 1.5, 2, 2.5, 3].map(num => (
                          <button
                            key={`bath-${num}`}
                            type="button"
                            className={getButtonStyle(num, bathroomSelections, false)}
                            onClick={() => handleBathroomClick(num)}
                          >
                            <span>{num}{num === 3 ? "+" : ""}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-vibe-charcoal/70" />
                        <span className="text-sm font-medium text-vibe-charcoal/70">Price Range</span>
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
