import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Home, Upload, X, Loader, ArrowDown, MapPin } from "lucide-react";
import OpenAI from 'openai';

const HeroSection = () => {
  const globeRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const placeholders = [
    "Describe your ideal apartment and/or upload images...",
    "Modern loft ten minutes away from the pier",
    "Cozy studio with abundant natural light",
    "Luxury two bedroom with a pool and a gym",
    "Artsy space with exposed brick",
    "Minimalist design with floor-to-ceiling windows"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
      
      type ContentPart = 
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } };
      
      const textContent: ContentPart = {
        type: "text",
        text: "In less than 20 words, describe the attached image(s) in a way that would help refine an apartment search. Focus on aesthetics and design."
      };
      
      const imageContents: ContentPart[] = base64Images.map(dataUrl => ({
        type: "image_url",
        image_url: { url: dataUrl as string }
      }));
      
      const content: ContentPart[] = [textContent, ...imageContents];
      
      const client = new OpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });
      
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates semantic search descriptions for apartment listings. Follow the prompt format exactly.' },
          { role: 'user', content }
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

  const handleDroppedFiles = (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    
    const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file));
    setUploadedImages(prev => [...prev, ...imageFiles]);
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDroppedFiles(e.dataTransfer.files);
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

  const scrollToFeatureCard = () => {
    const featureCard = document.getElementById('feature-card');
    if (featureCard) {
      const headerHeight = document.querySelector('header')?.getBoundingClientRect()?.height || 0;
      try {
        window.scrollTo({
          top: featureCard.offsetTop - headerHeight,
          behavior: 'smooth'
        });
      } catch (e) {
        window.scrollTo(0, featureCard.offsetTop - headerHeight);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-vibe-light-blue/10 rounded-full filter blur-[100px] animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-[-5%] left-[-10%] w-[10%] h-[40%] bg-blue-500/10 rounded-full filter blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-purple-500/5 rounded-full filter blur-[80px] animate-float" style={{ animationDelay: '4s' }}></div>
      </div>
      <div className="container mx-auto px-4 relative z-10 text-white text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-medium text-balance leading-[1.1] text-black">
            Find&nbsp;<span className="text-vibe-navy">Your</span>&nbsp;Perfect&nbsp;Apartment
          </h1>
          <p className="text-base md:text-lg text-vibe-charcoal/70 max-w-2xl mx-auto text-balance leading-relaxed">
            <span className="block">Discover what you want, how you want.</span>
            <span className="block">Find apartments that speak to you, that match your lifestyle and aesthetic.</span>
          </p>
          <form
            onSubmit={handleSearch}
            className="mt-12 flex flex-col md:flex-row items-center justify-center gap-4"
          >
            <div className="relative w-full max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={placeholders[currentPlaceholder]}
                className={`pl-12 pr-12 w-full py-4 px-4 bg-white/90 backdrop-blur-sm text-base text-gray-900 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border ${isDragging ? 'border-vibe-navy border-dashed border-2' : 'border-vibe-charcoal/20'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
              <div 
                className="absolute inset-y-0 right-0 pr-4 flex items-center group"
                onClick={triggerFileInput}
              >
                <div className="relative">
                  <Upload className="h-5 w-5 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors" />
                  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/80 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap translate-y-2 -translate-x-1/2 left-1/2">
                    Upload inspiration images
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-black/80 rotate-45"></div>
                  </div>
                </div>
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
              className="w-full md:w-auto px-8 py-4 bg-vibe-navy text-base text-white rounded-full font-medium transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  Search
                </>
              )}
            </button>
          </form>

          {imagePreviewUrls.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-2xl mx-auto">
              {imagePreviewUrls.map((url, index) => (
                <div key={index} className="relative group transition-transform hover:scale-105 duration-200">
                  <img 
                    src={url} 
                    alt={`Upload ${index + 1}`} 
                    className="w-full aspect-square object-cover rounded-lg shadow-md border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-vibe-navy text-white rounded-full p-1.5 shadow-md transition-all duration-200 opacity-80 hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute bottom-10 left-0 right-0 flex justify-center animate-pulse-slow">
        <button 
          onClick={scrollToFeatureCard}
          className="p-2 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300"
          aria-label="Scroll down"
        >
          <ArrowDown className="h-6 w-6 text-vibe-charcoal" />
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
