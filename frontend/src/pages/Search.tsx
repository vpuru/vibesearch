import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import SearchFilters, { SearchFilterValues } from "../components/search/SearchFilters";
import PropertyGrid from "../components/search/PropertyGrid";
import { searchApartments } from "../services/apartmentService";
import { Property } from "../components/search/PropertyCard";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(initialQuery);

  // Perform search when the component mounts if there's an initial query
  useEffect(() => {
    if (initialQuery) {
      handleSearch({ query: initialQuery });
    }
  }, [initialQuery]);

  const handleSearch = async (filterValues: SearchFilterValues) => {
    setLoading(true);
    setError(undefined);
    setCurrentSearchTerm(filterValues.query);

    try {
      // Update URL query parameter
      setSearchParams({ q: filterValues.query });

      // Prepare filter parameters for API
      const searchParams = {
        query: filterValues.query,
        filters: {
          min_beds: filterValues.min_beds,
          max_beds: filterValues.max_beds,
          min_baths: filterValues.min_baths,
          max_baths: filterValues.max_baths,
          min_rent: filterValues.min_rent,
          max_rent: filterValues.max_rent,
          studio: filterValues.studio,
          city: filterValues.city,
          state: filterValues.state,
        },
        limit: 50, // Request more results
      };

      try {
        // Perform search
        const results = await searchApartments(searchParams);
        setProperties(results);
        console.log("RESULTSLUTLSJ", results);

        // Clear any previous errors if successful
        setError(undefined);

        // Log success for debugging
        console.log(`Successfully loaded ${results.length} properties`);
      } catch (apiError: any) {
        // Handle API-specific errors
        console.error("API Error:", apiError);

        if (apiError.name === "AbortError") {
          setError("Request timed out. Please try again later.");
        } else if (
          apiError.message?.includes("Failed to fetch") ||
          apiError.message?.includes("NetworkError")
        ) {
          setError(
            "Cannot connect to the search server. Please check your connection and try again."
          );
        } else {
          // Show a more detailed error if available
          const errorMessage = apiError.message || "Unknown error occurred";
          setError(`Error searching properties: ${errorMessage}`);
        }

        // Keep the properties array empty on error
        setProperties([]);
      }
    } catch (err) {
      // Handle any other errors in the outer try/catch
      console.error("Unexpected error during search:", err);
      setError("An unexpected error occurred. Please try again.");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-16">
        {" "}
        {/* Space for fixed navbar */}
        <SearchFilters onSearch={handleSearch} initialQuery={initialQuery} />
        <main className="flex-grow">
          <PropertyGrid
            properties={properties}
            loading={loading}
            error={error}
            searchTerm={currentSearchTerm}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Search;
