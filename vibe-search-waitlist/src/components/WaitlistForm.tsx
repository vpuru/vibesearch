
import React, { useState } from 'react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addToWaitlist } from "@/lib/supabase";

const WaitlistForm = () => {
  const [email, setEmail] = useState('');
  const [vibe, setVibe] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit to Supabase
      const result = await addToWaitlist(email, vibe);
      
      setIsSubmitting(false);
      
      if (result.success) {
        setIsSuccess(true);
        toast.success("You've joined the waitlist! We'll notify you when we launch.");
        
        // Reset form after delay
        setTimeout(() => {
          setEmail('');
          setVibe('');
          setIsSuccess(false);
        }, 5000);
      } else {
        toast.error(result.error || "Failed to join waitlist. Please try again.");
      }
    } catch (error) {
      setIsSubmitting(false);
      console.error("Waitlist submission error:", error);
      toast.error("Something went wrong. Please try again later.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={cn(
        "glass-card rounded-xl p-6 transition-all duration-500",
        isSuccess ? "bg-vibe-sage/30" : "bg-white/70"
      )}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-vibe-charcoal/80">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="vibe-input"
              disabled={isSubmitting || isSuccess}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="vibe" className="block text-sm font-medium text-vibe-charcoal/80">
              What vibe are you looking for? (optional)
            </label>
            <input
              id="vibe"
              type="text"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="e.g., cozy studio with natural light"
              className="vibe-input"
              disabled={isSubmitting || isSuccess}
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className={cn(
              "w-full vibe-button relative overflow-hidden",
              isSubmitting && "cursor-wait",
              isSuccess && "bg-vibe-sage cursor-default"
            )}
          >
            {isSubmitting && (
              <span className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            )}
            <span className={isSubmitting ? "opacity-0" : "opacity-100"}>
              {isSuccess ? "Thank you! You're on the list" : "Join the Waitlist"}
            </span>
          </button>
        </form>
      </div>
      
      <p className="mt-4 text-center text-sm text-vibe-charcoal/70">
        Be the first to experience vibe search.
        <br />We'll never share your email with anyone else.
      </p>
    </div>
  );
};

export default WaitlistForm;
