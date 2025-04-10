import React, { createContext, useState, useContext, ReactNode } from "react";
import { SearchFilterValues } from "../components/search/SearchFilters";

interface SearchContextType {
  apartmentIds: string[];
  setApartmentIds: (ids: string[]) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterValues: SearchFilterValues | null;
  setFilterValues: (filters: SearchFilterValues | null) => void;
  searchPerformed: boolean;
  setSearchPerformed: (performed: boolean) => void;
  imageUrls: string[];
  setImageUrls: (urls: string[]) => void;
  searchType: 'text' | 'image' | 'both' | 'none';
  setSearchType: (type: 'text' | 'image' | 'both' | 'none') => void;
  resetSearchState: () => void; // Function to reset all search state
  hasResults: boolean; // Whether we have results already cached
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state, potentially from localStorage
  const [apartmentIds, setApartmentIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValues, setFilterValues] = useState<SearchFilterValues | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [searchType, setSearchType] = useState<'text' | 'image' | 'both' | 'none'>('none');
  
  // Try to restore state from localStorage on initial load
  React.useEffect(() => {
    try {
      const savedState = localStorage.getItem('vibesearch_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Check if state is not too old (e.g., 24 hours)
        const lastUpdated = new Date(parsedState.lastUpdated);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          // Restore state if it's recent enough
          if (parsedState.searchTerm) setSearchTerm(parsedState.searchTerm);
          
          if (parsedState.imageUrls && Array.isArray(parsedState.imageUrls)) {
            setImageUrls(parsedState.imageUrls);
          }
          
          if (parsedState.searchType) setSearchType(parsedState.searchType);
          
          if (parsedState.filterValues) setFilterValues(parsedState.filterValues);
          
          // Restore apartment IDs to avoid re-fetching
          if (parsedState.apartmentIds && Array.isArray(parsedState.apartmentIds)) {
            setApartmentIds(parsedState.apartmentIds);
            console.log(`Restored ${parsedState.apartmentIds.length} apartment IDs from localStorage`);
          }
          
          // Mark that we have valid search state
          setSearchPerformed(true);
          
          console.log("Restored search state from localStorage");
        } else {
          // Clear outdated storage
          localStorage.removeItem('vibesearch_state');
        }
      }
    } catch (error) {
      console.error("Error restoring search state from localStorage:", error);
    }
  }, []);

  // Function to reset all search state
  const resetSearchState = () => {
    setApartmentIds([]);
    setSearchTerm("");
    setFilterValues(null);
    setSearchPerformed(false);
    setImageUrls([]);
    setSearchType('none');
    console.log("Search state has been reset");
  };
  
  // Compute whether we have results
  const hasResults = apartmentIds.length > 0;

  // Effect to persist important state to localStorage
  React.useEffect(() => {
    // Only save if a search has been performed
    if (searchPerformed) {
      try {
        const stateToSave = {
          searchTerm,
          imageUrls,
          searchType,
          apartmentIds,
          filterValues,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('vibesearch_state', JSON.stringify(stateToSave));
      } catch (error) {
        console.error("Error saving search state to localStorage:", error);
      }
    }
  }, [searchPerformed, searchTerm, imageUrls, searchType, apartmentIds, filterValues]);

  return (
    <SearchContext.Provider
      value={{
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
        resetSearchState,
        hasResults,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};

export default SearchContext;
