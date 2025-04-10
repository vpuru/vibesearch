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

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialImageUrls = searchParams.get("imageUrls") ? 
    JSON.parse(searchParams.get("imageUrls") || "[]") : [];

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
    imageUrls,
    setImageUrls,
    searchType,
    setSearchType,
    hasResults,
  } = useSearch();
  
  // Reference to track if we already restored from URL
  const hasRestoredFromUrl = React.useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Perform search when the component mounts if there's an initial query or image URLs
  useEffect(() => {
    // Only run this effect once per mount
    if (hasRestoredFromUrl.current) return;
    hasRestoredFromUrl.current = true;
    
    // Set initial state based on URL parameters
    const setupSearch = async () => {
      console.log("Setting up initial search with URL parameters:", {
        query: initialQuery,
        imageUrls: initialImageUrls.length ? `${initialImageUrls.length} URLs` : "none",
        currentContext: { 
          searchTerm, 
          imageUrls: imageUrls.length, 
          searchPerformed 
        }
      });
      
      // Check if we need to perform a search or we're returning to an existing search
      const urlHasQuery = !!initialQuery.trim();
      const urlHasImages = initialImageUrls.length > 0;
      const contextHasSearch = searchPerformed && (searchTerm || imageUrls.length > 0);
      
      console.log("Search state on page load:", {
        urlHasQuery,
        urlHasImages,
        contextHasSearch,
        hasResults,
        apartmentIds: apartmentIds.length
      });
      
      // Case 1: URL has new search parameters - always do a fresh search
      if ((urlHasQuery && initialQuery !== searchTerm) || 
          (urlHasImages && JSON.stringify(initialImageUrls) !== JSON.stringify(imageUrls))) {
        
        // Determine search type
        let newSearchType = 'none';
        if (urlHasQuery && urlHasImages) {
          newSearchType = 'both';
        } else if (urlHasQuery) {
          newSearchType = 'text';
        } else if (urlHasImages) {
          newSearchType = 'image';
        }
        
        // Apply context updates
        if (urlHasImages) {
          setImageUrls(initialImageUrls);
        }
        
        if (urlHasQuery) {
          setSearchTerm(initialQuery);
        }
        
        setSearchType(newSearchType);
        
        // Perform the search
        console.log("Initiating fresh search from URL parameters");
        setLoading(true);
        
        try {
          await fetchResults({ 
            query: initialQuery,
          }, 1);
          
          console.log("Fresh search completed successfully");
        } catch (error) {
          console.error("Error performing fresh search:", error);
        } finally {
          setLoading(false);
        }
      } 
      // Case 2: URL has same search params and we have results - don't re-fetch
      else if ((urlHasQuery || urlHasImages) && hasResults) {
        console.log("URL matches existing search with results - no need to re-fetch");
        // Ensure UI reflects the current state
        if (urlHasQuery) {
          setSearchTerm(initialQuery);
        }
        if (urlHasImages) {
          setImageUrls(initialImageUrls);
        }
      }
      // Case 3: No URL params but we have a search with results in context
      else if (contextHasSearch && hasResults) {
        console.log("Using existing search results from context");
        // The search context already has data, no need to fetch again
      }
      // Case 4: We have search criteria but no results - need to fetch
      else if (contextHasSearch) {
        console.log("Search criteria exist but no results - fetching data");
        setLoading(true);
        
        try {
          await fetchResults({ 
            query: searchTerm,
          }, 1);
          
          console.log("Search data fetch completed");
        } catch (error) {
          console.error("Error fetching search results:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    setupSearch();
  }, [searchParams]);

  const handleSearch = async (newFilterValues: SearchFilterValues) => {
    setLoading(true);
    setError(undefined);
    setSearchTerm(newFilterValues.query);
    setFilterValues(newFilterValues);
    setPage(1); // Reset to first page for new searches
    setHasMoreResults(true); // Reset pagination state
    
    // Determine and set the searchType based on the current search parameters
    const hasQuery = !!newFilterValues.query.trim();
    const hasImages = imageUrls.length > 0;
    
    if (hasQuery && hasImages) {
      setSearchType('both');
    } else if (hasQuery) {
      setSearchType('text');
    } else if (hasImages) {
      setSearchType('image');
    } else {
      setSearchType('none');
    }

    try {
      // Build search params for URL
      const newSearchParams: Record<string, string> = {
        q: newFilterValues.query
      };
      
      // Keep image URLs in the URL if they exist
      if (initialImageUrls.length > 0) {
        // Preserve the image URLs from the URL parameter
        newSearchParams.imageUrls = searchParams.get("imageUrls") || "";
      }
      
      // Update URL query parameters
      setSearchParams(newSearchParams);

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
    // Choose the correct image URLs (from the URL parameters or context)
    const urls = initialImageUrls.length > 0 ? initialImageUrls : imageUrls;
    
    console.log("Fetching results with parameters:", {
      query: searchFilterValues.query,
      page: pageNum,
      imageUrls: urls.length > 0 ? `${urls.length} URLs` : "none",
      searchType
    });
    
    // Prepare filter parameters for API
    const searchParams = {
      query: searchFilterValues.query || initialQuery, // Use the query from URL if none in filters
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
      limit: ITEMS_PER_PAGE, // Request smaller chunks
      page: pageNum, // Add page parameter
      imageUrls: urls, // Add image URLs from URL parameters or context
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
          initialValues={filterValues || undefined}
          isLoading={loading}
        />
        <main className="flex-grow bg-white flex flex-col">
          <PropertyGrid
            propertyIds={apartmentIds}
            loading={loading}
            error={error}
            searchTerm={searchTerm || initialQuery}
            searchType={searchType}
            onLoadMore={handleLoadMore}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Search;
