import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Home } from "lucide-react";

const HeroSection = () => {
  const globeRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Handle form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    if (!propertiesRef.current) return;

    const createPropertyMarkers = () => {
      const totalProperties = 10;
      const container = propertiesRef.current;
      if (!container) return;

      container.innerHTML = "";

      for (let i = 0; i < totalProperties; i++) {
        const left = 20 + Math.random() * 60;
        const top = 10 + Math.random() * 60;
        const size = 8 + Math.random() * 6;
        const delay = i * 0.3;

        const marker = document.createElement("div");
        marker.className = "property-marker opacity-0";
        marker.style.left = `${left}%`;
        marker.style.top = `${top}%`;
        marker.style.width = `${size}px`;
        marker.style.height = `${size}px`;
        marker.style.animationDelay = `${delay}s`;

        container.appendChild(marker);
      }
    };

    createPropertyMarkers();

    const interval = setInterval(createPropertyMarkers, 12000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div ref={globeRef} className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 via-indigo-800/30 to-blue-500/40" />
        <div className="absolute inset-0 bg-[url('/lovable-uploads/d29daaff-efcb-4e3d-8b64-8052f3f9f429.png')] bg-no-repeat bg-top bg-contain opacity-40" />

        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmZmZmYwOCIgLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjcGF0dGVybikiIC8+PC9zdmc+')] opacity-40" />

        <div ref={propertiesRef} className="absolute inset-0 overflow-hidden" />
      </div>

      <div className="container mx-auto px-4 relative z-10 text-white text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
            Find Your Perfect Apartment with Semantic Search
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Discover apartments that match your vibe and lifestyle, not just your budget and
            location.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4"
          >
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Describe your ideal apartment..."
                className="pl-10 w-full py-3 px-4 bg-white/90 backdrop-blur-sm text-gray-900 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-3 bg-white text-primary rounded-full font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              Search Now
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="pt-8 flex flex-wrap justify-center gap-4 text-sm">
            <span
              className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full cursor-pointer hover:bg-white/30"
              onClick={() => {
                setSearchQuery("Modern Downtown Loft");
                navigate("/search?q=Modern+Downtown+Loft");
              }}
            >
              Modern Downtown Loft
            </span>
            <span
              className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full cursor-pointer hover:bg-white/30"
              onClick={() => {
                setSearchQuery("Quiet Garden View");
                navigate("/search?q=Quiet+Garden+View");
              }}
            >
              Quiet Garden View
            </span>
            <span
              className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full cursor-pointer hover:bg-white/30"
              onClick={() => {
                setSearchQuery("Near Tech Hub");
                navigate("/search?q=Near+Tech+Hub");
              }}
            >
              Near Tech Hub
            </span>
            <span
              className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full cursor-pointer hover:bg-white/30"
              onClick={() => {
                setSearchQuery("Pet Friendly");
                navigate("/search?q=Pet+Friendly");
              }}
            >
              Pet Friendly
            </span>
            <span
              className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full cursor-pointer hover:bg-white/30"
              onClick={() => {
                setSearchQuery("Minimalist Design");
                navigate("/search?q=Minimalist+Design");
              }}
            >
              Minimalist Design
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
