import React, { useEffect } from "react";
import { Search, X, Sliders, Loader2, Map as MapIcon, LayoutGrid } from "lucide-react";
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

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  initialQuery = "",
  initialValues,
  isLoading = false,
  currentView = "list",
  onViewToggle,
}) => {
  const { imageUrls, searchType } = useSearch();
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [filters, setFilters] = React.useState({
    bedroomRange: [0, 5], // [min, max]
    bathroomRange: [0, 3], // [min, max]
    priceMin: "",
    priceMax: "",
  });

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

    onSearch(searchFilters);
  };

  // Handle Enter key in search box
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Initialize filters from initialValues if provided
  useEffect(() => {
    if (initialValues) {
      console.log("Restoring filter values:", initialValues);
      const newFilters = { ...filters };

      // Handle bedrooms range - use min_beds for the slider value
      if (initialValues.min_beds !== undefined) {
        newFilters.bedroomRange = [initialValues.min_beds, initialValues.min_beds];
      }

      // Handle bathrooms range - use min_baths for the slider value
      if (initialValues.min_baths !== undefined) {
        newFilters.bathroomRange = [initialValues.min_baths, initialValues.min_baths];
      }

      // Handle price range
      if (initialValues.min_rent) {
        newFilters.priceMin = String(initialValues.min_rent);
      }

      if (initialValues.max_rent) {
        newFilters.priceMax = String(initialValues.max_rent);
      }

      setFilters(newFilters);

      // If filters are specified, show the filters panel
      if (Object.values(newFilters).some((v) => v !== "" && (!Array.isArray(v) || v.length > 0))) {
        setShowFilters(true);
      }
    }
  }, [initialValues]);

  // Use a ref to track if we should trigger a search when the query changes
  const isInitialMount = React.useRef(true);

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
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
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

          <div className="flex gap-2">
            {/* View Toggle Button */}
            {onViewToggle && (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-3 bg-gray-200 text-vibe-charcoal/70 hover:bg-gray-300 rounded-lg transition-colors"
                onClick={onViewToggle}
              >
                {currentView === "list" ? (
                  <>
                    <MapIcon className="h-5 w-5" />
                    <span>Map</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid className="h-5 w-5" />
                    <span>List</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                showFilters
                  ? "bg-vibe-navy text-white"
                  : "bg-gray-200 text-vibe-charcoal/70 hover:bg-gray-300"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Sliders className="h-5 w-5" />
              <span>{showFilters ? "Hide Filters" : "Filters"}</span>
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

        {showFilters && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium font-sans text-vibe-charcoal/70">Refine Search</h3>
              <button
                className="text-sm text-vibe-charcoal/70 hover:text-vibe-charcoal"
                onClick={clearFilters}
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-2">
                <div className="mb-2 flex justify-between items-center">
                  <label
                    htmlFor="bedroom-range"
                    className="block text-sm font-medium text-vibe-charcoal/70"
                  >
                    Bedrooms: {filters.bedroomRange[0]} -{" "}
                    {filters.bedroomRange[1] === 5 ? "5+" : filters.bedroomRange[1]}
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

              <div className="md:col-span-2">
                <div className="mb-2 flex justify-between items-center">
                  <label
                    htmlFor="bathroom-range"
                    className="block text-sm font-medium text-vibe-charcoal/70"
                  >
                    Bathrooms: {filters.bathroomRange[0]} -{" "}
                    {filters.bathroomRange[1] === 3 ? "3+" : filters.bathroomRange[1]}
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

              <div>
                <label
                  htmlFor="price-min"
                  className="block text-sm font-medium text-vibe-charcoal/70 mb-1"
                >
                  Min Price
                </label>
                <input
                  type="number"
                  id="price-min"
                  placeholder="$0"
                  value={filters.priceMin}
                  onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-vibe-charcoal/70"
                />
              </div>

              <div>
                <label
                  htmlFor="price-max"
                  className="block text-sm font-medium text-vibe-charcoal/70 mb-1"
                >
                  Max Price
                </label>
                <input
                  type="number"
                  id="price-max"
                  placeholder="No max"
                  value={filters.priceMax}
                  onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-vibe-charcoal/70"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;
