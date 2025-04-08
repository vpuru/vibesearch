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
  uploadedImages: string[];
  setUploadedImages: (urls: string[]) => void;
  searchType: "text" | "image" | "combined" | null;
  setSearchType: (type: "text" | "image" | "combined" | null) => void;
  imageDescriptions: string[];
  setImageDescriptions: (descriptions: string[]) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apartmentIds, setApartmentIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValues, setFilterValues] = useState<SearchFilterValues | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [searchType, setSearchType] = useState<"text" | "image" | "combined" | null>(null);
  const [imageDescriptions, setImageDescriptions] = useState<string[]>([]);

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
        uploadedImages,
        setUploadedImages,
        searchType,
        setSearchType,
        imageDescriptions,
        setImageDescriptions,
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
