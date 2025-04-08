import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import Footer from "../components/shared/Footer";
import SearchFilters, { SearchFilterValues } from "../components/search/SearchFilters";
import PropertyGrid from "../components/search/PropertyGrid";
import { searchApartments } from "../services/apartmentService";
import { useSearch } from "../contexts/SearchContext";
import { API_ENDPOINTS } from "../services/config";

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
    uploadedImages,
    setUploadedImages,
    searchType,
    setSearchType,
    imageDescriptions,
    setImageDescriptions,
  } = useSearch();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Perform search when the component mounts if there's an initial query or we have previous results
  useEffect(() => {
    // If there's a new query in the URL that doesn't match our current searchTerm,
    // we need to perform a new search
    if (initialQuery && initialQuery !== searchTerm) {
      console.log("New search query from URL:", initialQuery);
      handleSearch({ query: initialQuery });
      return;
    }

    // If we already performed a search previously and have results, don't search again
    if (searchPerformed && apartmentIds.length > 0) {
      console.log("Using existing search results:", apartmentIds.length, "items");
      return;
    }

    // If there's a query in the URL and we haven't performed a search yet
    if (initialQuery && !searchPerformed) {
      handleSearch({ query: initialQuery });
    }
  }, [initialQuery, searchPerformed, apartmentIds, searchTerm]);

  const handleSearch = async (newFilterValues: SearchFilterValues) => {
    setLoading(true);
    setError(undefined);
    setSearchTerm(newFilterValues.query);
    setFilterValues(newFilterValues);
    setPage(1); // Reset to first page for new searches
    setHasMoreResults(true); // Reset pagination state

    try {
      // Update URL query parameter
      setSearchParams({ q: newFilterValues.query });

      let finalQuery = newFilterValues.query;
      let currentSearchType = "text";
      if (uploadedImages.length > 0) {
        if (!newFilterValues.query.trim()) {
          currentSearchType = "image";
        } else {
          currentSearchType = "combined";
        }
        
        const imageDescription = await processImages(uploadedImages, newFilterValues.query.trim());
        setImageDescriptions([imageDescription]);
        
        if (currentSearchType === "image") {
          finalQuery = imageDescription;
        } else {
          finalQuery = `${newFilterValues.query.trim()} ${imageDescription}`;
        }

        console.log(`Search type: ${currentSearchType}, Final query: ${finalQuery}`);
      }
      
      // Update context with search type
      setSearchType(currentSearchType as "text" | "image" | "combined");
      
      // Create modified filter values with the final query
      const modifiedFilters = {
        ...newFilterValues,
        query: finalQuery
      };

      // Perform search with first page of results
      await fetchResults(modifiedFilters, 1, currentSearchType);
      
      // Clear uploaded images after search is performed
      setUploadedImages([]);
    } catch (err) {
      // Handle any other errors in the outer try/catch
      console.error("Unexpected error during search:", err);
      setError("An unexpected error occurred. Please try again.");
      setApartmentIds([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to process images with backend
  const processImages = async (imageUrls: string[], userQuery: string): Promise<string> => {
    try {
      const response = await fetch(`${API_ENDPOINTS.processImages}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageUrls,
          userQuery
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process images: ${response.status}`);
      }
      
      const data = await response.json();
      return data.description;
    } catch (error) {
      console.error("Error processing images:", error);
      return "modern stylish apartment"; // Fallback description
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
  const fetchResults = async (searchFilterValues: SearchFilterValues, pageNum: number, searchTypeParam?: string) => {
    // Prepare filter parameters for API
    const searchParams = {
      query: searchFilterValues.query,
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
      searchType: searchTypeParam || searchType || "text",
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
      <div className="pt-16">
        {" "}
        {/* Space for fixed navbar */}
        <SearchFilters
          onSearch={handleSearch}
          initialQuery={searchTerm || initialQuery}
          initialValues={filterValues || undefined}
        />
        <main className="flex-grow bg-white">
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
