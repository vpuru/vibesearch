import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Home, Upload, X, Loader } from "lucide-react";
import OpenAI from 'openai';

const HeroSection = () => {
  const globeRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Handle form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedImages.length === 0) {
      if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
      return;
    }
    setIsLoading(true);
    try {
      const base64Images = await Promise.all(
        uploadedImages.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      const content = [
        { type: "text", text: "In less than 20 words, describe the attached image(s) in a way that would help refine an apartment search. Focus on aesthetics and design." },
        ...base64Images.map(dataUrl => ({ type: "image_url", image_url: { url: dataUrl } }))
      ];
      const client = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates semantic search descriptions for apartment listings. Follow the prompt format exactly.' },
          { role: 'user', content: content },
        ],
      });
      const llmDescription = completion.choices[0].message.content.trim();
      const combinedQuery = (searchQuery.trim() ? searchQuery.trim() + " " : "") + llmDescription;
      navigate(`/search?q=${encodeURIComponent(combinedQuery)}`);
    } catch (err) {
      console.error("Error processing images with OpenAI model:", err);
      setIsLoading(false); 
    }
  };
  

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setUploadedImages(prev => [...prev, ...newFiles]);
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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
            Find Your Perfect Apartment
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Discover apartments that you want, how you want.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4"
          >
            <div className="relative w-full max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Describe your ideal apartment and/or upload images..."
                className="pl-10 w-full py-3 px-4 bg-white/90 backdrop-blur-sm text-gray-900 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div 
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                onClick={triggerFileInput}
              >
                <Upload className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-6 py-3 bg-white text-primary rounded-full font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  Search Now
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          {imagePreviewUrls.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={url} 
                    alt={`Upload ${index + 1}`} 
                    className="w-16 h-16 object-cover rounded-md border-2 border-white/50"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
