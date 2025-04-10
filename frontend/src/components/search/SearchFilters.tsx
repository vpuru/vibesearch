import React, { useEffect } from "react";
import { Search, X, Sliders, Loader2 } from "lucide-react";
import { useSearch } from "../../contexts/SearchContext";

export interface SearchFilterValues {
  query: string;
  min_beds?: number;
  max_beds?: number;
  min_baths?: number;
  max_baths?: number;
  min_rent?: number;
  max_rent?: number;
  studio?: boolean;
  city?: string;
  state?: string;
  amenities?: string[];
}

interface SearchFiltersProps {
  onSearch: (filters: SearchFilterValues) => void;
  initialQuery?: string;
  initialValues?: SearchFilterValues;
  isLoading?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onSearch,
  initialQuery = "",
  initialValues,
  isLoading = false,
}) => {
  const { imageUrls, searchType } = useSearch();
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [filters, setFilters] = React.useState({
    bedrooms: "",
    bathrooms: "",
    priceMin: "",
    priceMax: "",
    city: "",
    state: "",
    amenities: [] as string[],
  });

  const amenitiesList = [
    "Air Conditioning",
    "Balcony",
    "Dishwasher",
    "Elevator",
    "Fitness Center",
    "Furnished",
    "Parking",
    "Pet Friendly",
    "Pool",
    "Washer/Dryer",
    "Wheelchair Access",
    "WiFi",
  ];

  const toggleAmenity = (amenity: string) => {
    setFilters((prev) => {
      const newAmenities = prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity];

      return { ...prev, amenities: newAmenities };
    });
  };

  const clearFilters = () => {
    setFilters({
      bedrooms: "",
      bathrooms: "",
      priceMin: "",
      priceMax: "",
      city: "",
      state: "",
      amenities: [],
    });
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!searchQuery.trim()) return;

    // Convert form values to API filter values
    const searchFilters: SearchFilterValues = {
      query: searchQuery,
    };

    // Add min/max beds based on dropdown selection
    if (filters.bedrooms) {
      if (filters.bedrooms === "studio") {
        searchFilters.studio = true;
      } else if (filters.bedrooms.includes("+")) {
        // Handle "4+" case
        searchFilters.min_beds = parseFloat(filters.bedrooms.replace("+", ""));
      } else {
        // Handle exact bedroom count
        const bedroomValue = parseFloat(filters.bedrooms);
        searchFilters.min_beds = bedroomValue;
        searchFilters.max_beds = bedroomValue;
      }
    }

    // Add min/max baths based on dropdown selection
    if (filters.bathrooms) {
      if (filters.bathrooms.includes("+")) {
        // Handle "3+" case
        searchFilters.min_baths = parseFloat(filters.bathrooms.replace("+", ""));
      } else {
        // Handle exact bathroom count
        const bathroomValue = parseFloat(filters.bathrooms);
        searchFilters.min_baths = bathroomValue;
        searchFilters.max_baths = bathroomValue;
      }
    }

    // Add price range if specified
    if (filters.priceMin) {
      searchFilters.min_rent = parseInt(filters.priceMin);
    }

    if (filters.priceMax) {
      searchFilters.max_rent = parseInt(filters.priceMax);
    }

    // Add city/state if specified
    if (filters.city) {
      searchFilters.city = filters.city;
    }

    if (filters.state) {
      searchFilters.state = filters.state;
    }

    // Add amenities if selected
    if (filters.amenities.length > 0) {
      searchFilters.amenities = filters.amenities;
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

      // Handle bedrooms
      if (initialValues.studio) {
        newFilters.bedrooms = "studio";
      } else if (
        initialValues.min_beds &&
        initialValues.max_beds &&
        initialValues.min_beds === initialValues.max_beds
      ) {
        newFilters.bedrooms = String(initialValues.min_beds);
      } else if (initialValues.min_beds && initialValues.min_beds >= 4) {
        newFilters.bedrooms = "4+";
      } else if (initialValues.min_beds) {
        newFilters.bedrooms = String(initialValues.min_beds);
      }

      // Handle bathrooms
      if (
        initialValues.min_baths &&
        initialValues.max_baths &&
        initialValues.min_baths === initialValues.max_baths
      ) {
        newFilters.bathrooms = String(initialValues.min_baths);
      } else if (initialValues.min_baths && initialValues.min_baths >= 3) {
        newFilters.bathrooms = "3+";
      } else if (initialValues.min_baths) {
        newFilters.bathrooms = String(initialValues.min_baths);
      }

      // Handle price range
      if (initialValues.min_rent) {
        newFilters.priceMin = String(initialValues.min_rent);
      }

      if (initialValues.max_rent) {
        newFilters.priceMax = String(initialValues.max_rent);
      }

      // Handle location
      if (initialValues.city) {
        newFilters.city = initialValues.city;
      }

      if (initialValues.state) {
        newFilters.state = initialValues.state;
      }

      // Handle amenities
      if (initialValues.amenities && initialValues.amenities.length > 0) {
        newFilters.amenities = initialValues.amenities;
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
    <div className="w-full bg-white shadow-sm border-b">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <div>
                <label htmlFor="bedrooms" className="block text-sm font-medium text-vibe-charcoal/70 mb-1">
                  Bedrooms
                </label>
                <select
                  id="bedrooms"
                  value={filters.bedrooms}
                  onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-vibe-charcoal/70"
                >
                  <option value="">Any</option>
                  <option value="studio">Studio</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4+">4+</option>
                </select>
              </div>

              <div>
                <label htmlFor="bathrooms" className="block text-sm font-medium text-vibe-charcoal/70 mb-1">
                  Bathrooms
                </label>
                <select
                  id="bathrooms"
                  value={filters.bathrooms}
                  onChange={(e) => setFilters({ ...filters, bathrooms: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-vibe-charcoal/70"
                >
                  <option value="">Any</option>
                  <option value="1">1</option>
                  <option value="1.5">1.5</option>
                  <option value="2">2</option>
                  <option value="2.5">2.5</option>
                  <option value="3+">3+</option>
                </select>
              </div>

              <div>
                <label htmlFor="price-min" className="block text-sm font-medium text-vibe-charcoal/70 mb-1">
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
                <label htmlFor="price-max" className="block text-sm font-medium text-vibe-charcoal/70 mb-1">
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

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-vibe-charcoal/70 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  placeholder="Any city"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-vibe-charcoal/70"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-vibe-charcoal/70 mb-1">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  placeholder="Any state"
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md text-vibe-charcoal/70"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-vibe-charcoal/70 mb-2">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {amenitiesList.map((amenity) => (
                  <button
                    type="button"
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                      filters.amenities.includes(amenity)
                        ? "bg-vibe-navy text-white"
                        : "bg-gray-100 text-vibe-charcoal/70 hover:bg-gray-200"
                    }`}
                  >
                    {amenity}
                    {filters.amenities.includes(amenity) && <X className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;
