
import React from 'react';
import { cn } from "@/lib/utils";

interface VibeCardProps {
  title: string;
  description: string;
  imageUrl: string;
  color: string;
  delay?: number;
}

const VibeCard: React.FC<VibeCardProps> = ({
  title,
  description,
  imageUrl,
  color,
  delay = 0
}) => {
  return (
    <div 
      className={cn(
        "glass-card rounded-xl overflow-hidden transition-all duration-500 hover:shadow-xl",
        "opacity-0 animate-fade-up"
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards'
      }}
    >
      <div className="relative h-48 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
        <div 
          className="absolute inset-0 opacity-30"
          style={{ backgroundColor: color }}
        />
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-medium mb-2">{title}</h3>
        <p className="text-vibe-charcoal/80 text-sm">{description}</p>
      </div>
    </div>
  );
};

export default VibeCard;
