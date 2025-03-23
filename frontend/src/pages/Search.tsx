import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import SearchFilters, { SearchFilterValues } from "../components/search/SearchFilters";
import PropertyGrid from "../components/search/PropertyGrid";
import { searchApartments } from "../services/apartmentService";
import { useSearch } from "../contexts/SearchContext";

interface SearchResult {
  id: string;
  score: number;
  metadata: any;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  // Use the search context
  const {
    apartmentIds,
    setApartmentIds,
    searchTerm,
    setSearchTerm,
    filterValues,
    setFilterValues,
    searchPerformed,
    setSearchPerformed,
  } = useSearch();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Perform search when the component mounts if there's an initial query or we have previous results
  useEffect(() => {
    // If we already performed a search previously and have results, don't search again
    if (searchPerformed && apartmentIds.length > 0) {
      console.log("Using existing search results:", apartmentIds.length, "items");
      return;
    }

    // If there's a query in the URL and we haven't performed a search yet
    if (initialQuery && !searchPerformed) {
      handleSearch({ query: initialQuery });
    }
  }, [initialQuery, searchPerformed, apartmentIds]);

  const handleSearch = async (newFilterValues: SearchFilterValues) => {
    setLoading(true);
    setError(undefined);
    setSearchTerm(newFilterValues.query);
    setFilterValues(newFilterValues);

    try {
      // Update URL query parameter
      setSearchParams({ q: newFilterValues.query });

      // Prepare filter parameters for API
      const searchParams = {
        query: newFilterValues.query,
        filters: {
          min_beds: newFilterValues.min_beds,
          max_beds: newFilterValues.max_beds,
          min_baths: newFilterValues.min_baths,
          max_baths: newFilterValues.max_baths,
          min_rent: newFilterValues.min_rent,
          max_rent: newFilterValues.max_rent,
          studio: newFilterValues.studio,
          city: newFilterValues.city,
          state: newFilterValues.state,
        },
        limit: 50, // Request more results
      };

      try {
        // Perform search
        const results = await searchApartments(searchParams);

        // Extract just the IDs from the search results
        const ids = results.map((property) => property.id);
        setApartmentIds(ids);
        setSearchPerformed(true);

        console.log("Search results IDs:", ids);

        // Clear any previous errors if successful
        setError(undefined);

        // Log success for debugging
        console.log(`Successfully loaded ${ids.length} apartment IDs`);
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

        // Keep the apartment IDs array empty on error
        setApartmentIds([]);
      }
    } catch (err) {
      // Handle any other errors in the outer try/catch
      console.error("Unexpected error during search:", err);
      setError("An unexpected error occurred. Please try again.");
      setApartmentIds([]);
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
        <SearchFilters
          onSearch={handleSearch}
          initialQuery={searchTerm || initialQuery}
          initialValues={filterValues || undefined}
        />
        <main className="flex-grow">
          <PropertyGrid
            propertyIds={apartmentIds}
            loading={loading}
            error={error}
            searchTerm={searchTerm || initialQuery}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Search;
