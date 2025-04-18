import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect, useMemo } from "react";
import { SearchFilterValues } from "../components/search/SearchFilters";
import { debounce } from "../lib/utils";

interface SearchState {
  apartmentIds: string[];
  searchTerm: string;
  filterValues: SearchFilterValues | null;
  searchPerformed: boolean;
  imageUrls: string[];
  searchType: 'text' | 'image' | 'both' | 'none';
}

interface SearchContextType extends SearchState {
  setApartmentIds: (ids: string[]) => void;
  setSearchTerm: (term: string) => void;
  setFilterValues: (filters: SearchFilterValues | null) => void;
  setSearchPerformed: (performed: boolean) => void;
  setImageUrls: (urls: string[]) => void;
  setSearchType: (type: 'text' | 'image' | 'both' | 'none') => void;
  resetSearchState: () => void;
  hasResults: boolean;
  updateSearchState: (updates: Partial<SearchState>) => void;
}

const STORAGE_KEY = 'vibesearch_state';
const MAX_AGE_HOURS = 24;

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Load saved state from localStorage
const loadSavedState = (): Partial<SearchState> | null => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (!savedState) return null;
    
    const parsedState = JSON.parse(savedState);
    
    // Check if state is not too old
    const lastUpdated = new Date(parsedState.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate >= MAX_AGE_HOURS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return parsedState;
  } catch (error) {
    return null;
  }
};

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state with saved values or defaults
  const savedState = useMemo(() => loadSavedState(), []);
  
  // Initialize state with proper defaults
  const [state, setState] = useState<SearchState>({
    apartmentIds: savedState?.apartmentIds || [],
    searchTerm: savedState?.searchTerm || "",
    filterValues: savedState?.filterValues || null,
    searchPerformed: !!savedState?.searchPerformed || false,
    imageUrls: savedState?.imageUrls || [],
    searchType: savedState?.searchType || 'none',
  });
  
  // Compute derived state
  const hasResults = state.apartmentIds.length > 0;
  
  // Create individual setters using useCallback
  const setApartmentIds = useCallback((ids: string[]) => {
    setState(prev => ({ ...prev, apartmentIds: ids }));
  }, []);
  
  const setSearchTerm = useCallback((term: string) => {
    setState(prev => ({ ...prev, searchTerm: term }));
  }, []);
  
  const setFilterValues = useCallback((filters: SearchFilterValues | null) => {
    setState(prev => ({ ...prev, filterValues: filters }));
  }, []);
  
  const setSearchPerformed = useCallback((performed: boolean) => {
    setState(prev => ({ ...prev, searchPerformed: performed }));
  }, []);
  
  const setImageUrls = useCallback((urls: string[]) => {
    setState(prev => ({ ...prev, imageUrls: urls }));
  }, []);
  
  const setSearchType = useCallback((type: 'text' | 'image' | 'both' | 'none') => {
    setState(prev => ({ ...prev, searchType: type }));
  }, []);
  
  // Batch update function
  const updateSearchState = useCallback((updates: Partial<SearchState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Reset function
  const resetSearchState = useCallback(() => {
    setState({
      apartmentIds: [],
      searchTerm: "",
      filterValues: null,
      searchPerformed: false,
      imageUrls: [],
      searchType: 'none',
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  
  // Debounced saving to localStorage to avoid excessive writes
  const saveStateToStorage = useCallback(
    debounce((stateToSave: SearchState) => {
      try {
        if (stateToSave.searchPerformed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...stateToSave,
            lastUpdated: new Date().toISOString()
          }));
        }
      } catch (error) {
        // Fail silently
      }
    }, 500),
    []
  );
  
  // Create a reference to track previous state
  const prevStateRef = React.useRef<SearchState | null>(null);
  
  // Effect to persist state changes to localStorage - with state reference to prevent infinite updates
  useEffect(() => {
    if (state.searchPerformed) {
      // Only save if there's an actual change
      if (!prevStateRef.current || JSON.stringify(prevStateRef.current) !== JSON.stringify(state)) {
        prevStateRef.current = { ...state };
        saveStateToStorage(state);
      }
    }
  }, [state.apartmentIds, state.searchTerm, state.filterValues, state.searchPerformed, 
      state.imageUrls, state.searchType, saveStateToStorage]);
  
  // Create context value object with memoization
  const contextValue = useMemo(() => ({
    ...state,
    setApartmentIds,
    setSearchTerm,
    setFilterValues,
    setSearchPerformed,
    setImageUrls,
    setSearchType,
    resetSearchState,
    hasResults,
    updateSearchState,
  }), [
    state,
    setApartmentIds,
    setSearchTerm,
    setFilterValues,
    setSearchPerformed,
    setImageUrls,
    setSearchType,
    resetSearchState,
    hasResults,
    updateSearchState,
  ]);
  
  return (
    <SearchContext.Provider value={contextValue}>
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
