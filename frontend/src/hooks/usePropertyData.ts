import { useQuery } from "@tanstack/react-query";
import { fetchApartmentPreview } from "../services/apartmentService";
import { Property } from "../components/search/PropertyCard";

export const usePropertyData = (propertyId: string, searchTerm?: string) => {
  return useQuery({
    queryKey: ["property", propertyId, searchTerm],
    queryFn: () => fetchApartmentPreview(propertyId, searchTerm),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes
  });
};
