import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Upload, X, Loader, ArrowDown, MessageSquare } from "lucide-react";
import { submitFeedback, uploadImagesToSupabase } from "../../lib/supabase";

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
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("suggestion");
  const [feedbackText, setFeedbackText] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const navigate = useNavigate();

  const placeholders = [
    "Describe your ideal apartment and/or upload images...",
    "Modern loft ten minutes away from the pier",
    "Cozy studio with abundant natural light near downtown",
    "Luxury two bedroom with a pool, gym, and a balcony",
    "Artsy space with exposed brick, near the Topanga trail",
    "Minimalist design with floor-to-ceiling windows"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Handle form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length === 0 && uploadedImages.length === 0) {
      return;
    }

    const hasText = searchQuery.trim().length > 0;
    const hasImages = uploadedImages.length > 0;
    let searchType = "text_only";
    if (hasText && hasImages) {
      searchType = "text_and_image";
    } else if (!hasText && hasImages) {
      searchType = "image_only";
    }

    if (hasText && !hasImages) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      return;
    }
    
    setIsLoading(true);
    try {
      const imageUrls = await uploadImagesToSupabase(uploadedImages);
      const searchContext = {
        type: searchType,
        imageUrls: imageUrls
      };
      const contextString = encodeURIComponent(JSON.stringify(searchContext));
      if (searchType === "image_only") {
        navigate(`/search?context=${contextString}`);
      } else {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}&context=${contextString}`);
      }
    } catch (err) {
      console.error("Error uploading images:", err);
    } finally {
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

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFeedbackSubmitting(true);
    
    try {
      const result = await submitFeedback({
        category: feedbackCategory,
        text: feedbackText
      });
      
      if (result.success) {
        setFeedbackSubmitted(true);
        setTimeout(() => {
          setShowFeedbackForm(false);
          setFeedbackSubmitted(false);
          setFeedbackText("");
        }, 2000);
      } else {
        console.error("Error submitting feedback:", result.error);
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsFeedbackSubmitting(false);
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

      <div className="fixed bottom-5 right-5 z-20">
        <button
          onClick={() => setShowFeedbackForm(true)}
          className="bg-vibe-navy text-white rounded-full p-3 shadow-lg hover:bg-vibe-navy/90 transition-all duration-200 flex items-center gap-2"
          aria-label="Provide feedback"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="hidden sm:inline text-sm font-medium">Feedback</span>
        </button>
      </div>

      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-sans font-medium text-vibe-charcoal/70">Help Us Improve!</h3>
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {feedbackSubmitted ? (
              <div className="py-8 text-center">
                <div className="mb-4 text-vibe-navy">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-vibe-charcoal text-lg">Thank you for your feedback!</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What kind of feedback do you have?
                  </label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-vibe-navy"
                  >
                    <option value="suggestion">Suggestion</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your feedback
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-1 focus:ring-vibe-navy min-h-[120px]"
                    placeholder="Tell us how we can make the site better..."
                    required
                  ></textarea>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackForm(false)}
                    className="text-gray-500 hover:text-gray-700 font-medium mr-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isFeedbackSubmitting || !feedbackText.trim()}
                    className="bg-vibe-navy text-white py-2 px-4 rounded-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {isFeedbackSubmitting ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      "Submit Feedback"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSection;
