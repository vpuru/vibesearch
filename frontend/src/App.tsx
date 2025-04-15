import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Search from "./pages/Search";
import PropertyView from "./pages/PropertyView";
import PropertyDetail from "./pages/PropertyDetail";
import NotFound from "./pages/NotFound";
import { SearchProvider } from "./contexts/SearchContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SearchProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<Search />} />
            {/* Redirect /map to /search with map view param */}
            <Route path="/map" element={<Navigate to="/search?view=map" replace />} />
            <Route path="/property/detail/:id" element={<PropertyDetail />} />
            <Route path="/property/:id" element={<PropertyView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SearchProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
