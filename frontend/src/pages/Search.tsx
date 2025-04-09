import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import SearchFilters, { SearchFilterValues } from "../components/search/SearchFilters";
import PropertyGrid from "../components/search/PropertyGrid";
import { searchApartments } from "../services/apartmentService";
import { useSearch } from "../contexts/SearchContext";

// Number of items to fetch per page
const ITEMS_PER_PAGE = 25;

interface SearchResult {
  id: string;
  score: number;
  metadata: any;
}

// Interface for search context with image URLs
interface SearchContext {
  type: 'text_only' | 'image_only' | 'text_and_image';
  imageUrls: string[];
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const contextParam = searchParams.get("context") || "";
  const [searchContext, setSearchContext] = useState<SearchContext | null>(null);
  
  useEffect(() => {
    if (contextParam) {
      try {
        const parsedContext = JSON.parse(decodeURIComponent(contextParam)) as SearchContext;
        setSearchContext(parsedContext);
        console.log(parsedContext);
      } catch (err) {
        console.error("Error parsing search context:", err);
      }
    } else {
      setSearchContext(null);
    }
  }, [contextParam]);

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
  const [page, setPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Perform search when the component mounts if there's an initial query or we have previous results
  useEffect(() => {
    if (!initialQuery && !searchContext?.imageUrls?.length) {
      setApartmentIds([]);
      setSearchPerformed(false);
      setSearchTerm("");
      setFilterValues(null);
      return;
    }
    
    // If there's a new query or context in the URL that doesn't match our current searchTerm,
    // we need to perform a new search
    const shouldPerformNewSearch = 
      (initialQuery && initialQuery !== searchTerm) || 
      (searchContext && !searchPerformed);
      
    if (shouldPerformNewSearch) {
      console.log("New search query or context from URL:", { initialQuery, searchContext });
      handleSearch({ 
        query: initialQuery,
        // Pass any other necessary filter values
      });
      return;
    }

    // If we already performed a search previously and have results, don't search again
    if (searchPerformed && apartmentIds.length > 0) {
      console.log("Using existing search results:", apartmentIds.length, "items");
      return;
    }

    // If there's a query/context in the URL and we haven't performed a search yet
    if ((initialQuery || searchContext) && !searchPerformed) {
      handleSearch({ query: initialQuery });
    }
  }, [initialQuery, searchContext, searchPerformed, apartmentIds, searchTerm]);

  const handleSearch = async (newFilterValues: SearchFilterValues) => {
    setLoading(true);
    setError(undefined);
    setSearchTerm(newFilterValues.query);
    setFilterValues(newFilterValues);
    setPage(1); 
    setHasMoreResults(true);

    try {
      // Update URL query parameter, preserving context if it exists
      const updatedParams = new URLSearchParams();
      updatedParams.set('q', newFilterValues.query);
      if (contextParam) {
        updatedParams.set('context', contextParam);
        
        // Force re-parse context if needed
        if (!searchContext) {
          try {
            const parsedContext = JSON.parse(decodeURIComponent(contextParam)) as SearchContext;
            console.log("Re-parsed context in handleSearch:", parsedContext);
            setSearchContext(parsedContext);
          } catch (err) {
            console.error("Error re-parsing search context:", err);
          }
        }
      }
      console.log("Search params in handleSearch:", updatedParams.toString());
      console.log("Current search context in handleSearch:", searchContext);
      setSearchParams(updatedParams);

      // Perform search with first page of results
      await fetchResults(newFilterValues, 1);
    } catch (err) {
      // Handle any other errors in the outer try/catch
      console.error("Unexpected error during search:", err);
      setError("An unexpected error occurred. Please try again.");
      setApartmentIds([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to load more results when scrolling
  const handleLoadMore = async () => {
    if (!hasMoreResults || loadingMore || loading || !filterValues) return;

    const nextPage = page + 1;
    console.log(`Loading more results: page ${nextPage}`);
    setLoadingMore(true);

    try {
      await fetchResults(filterValues, nextPage);
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more results:", err);
      // Don't show error UI, just stop pagination
      setHasMoreResults(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Shared function to fetch results (used by both initial search and pagination)
  const fetchResults = async (searchFilterValues: SearchFilterValues, pageNum: number) => {
    console.log("fetchResults - Current contextParam:", contextParam);
    console.log("fetchResults - Current searchContext:", searchContext);
    console.log("fetchResults - searchFilterValues:", searchFilterValues);
    
    // Ensure we have a valid searchContext if contextParam exists
    let effectiveSearchContext = searchContext;
    if (contextParam && !effectiveSearchContext) {
      try {
        effectiveSearchContext = JSON.parse(decodeURIComponent(contextParam)) as SearchContext;
        console.log("Parsed context from param in fetchResults:", effectiveSearchContext);
      } catch (err) {
        console.error("Error parsing context in fetchResults:", err);
      }
    }
    
    // Prepare filter parameters for API
    const searchParams = {
      query: searchFilterValues.query || "",  // Ensure query is at least an empty string
      filters: {
        min_beds: searchFilterValues.min_beds,
        max_beds: searchFilterValues.max_beds,
        min_baths: searchFilterValues.min_baths,
        max_baths: searchFilterValues.max_baths,
        min_rent: searchFilterValues.min_rent,
        max_rent: searchFilterValues.max_rent,
        studio: searchFilterValues.studio,
        city: searchFilterValues.city,
        state: searchFilterValues.state,
      },
      limit: ITEMS_PER_PAGE,
      page: pageNum,
      // Add context data if available
      context: effectiveSearchContext,
    };

    try {
      // Perform search
      const results = await searchApartments(searchParams);

      // If we got fewer results than requested, there are no more pages
      if (results.length < ITEMS_PER_PAGE) {
        setHasMoreResults(false);
      }

      // Extract just the IDs from the search results
      const ids = results.map((property) => property.id);

      // For the first page, replace results; otherwise append
      if (pageNum === 1) {
        setApartmentIds(ids);
      } else {
        // Get current IDs and append new ones
        const updatedIds = [...apartmentIds, ...ids];
        setApartmentIds(updatedIds);
      }

      setSearchPerformed(true);

      console.log(`Page ${pageNum}: Loaded ${ids.length} apartment IDs`);

      // Clear any previous errors if successful
      setError(undefined);

      return ids.length;
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

      // If this is the first page, clear results
      if (pageNum === 1) {
        setApartmentIds([]);
      }

      throw apiError;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-16 flex flex-col flex-grow">
        {" "}
        {/* Space for fixed navbar */}
        <SearchFilters
          onSearch={handleSearch}
          initialQuery={searchTerm || initialQuery}
          initialValues={filterValues === null ? undefined : filterValues}
          key={`filters-${initialQuery}`}
        />
        <main className="flex-grow bg-white flex flex-col">
          <PropertyGrid
            propertyIds={apartmentIds}
            loading={loading}
            error={error}
            searchTerm={searchTerm || initialQuery}
            searchType={searchContext?.type || 'text_only'} 
            onLoadMore={handleLoadMore}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Search;