
import React from 'react';

const testimonials = [
  {
    quote: "I described my ideal apartment as 'sunny, modern kitchen, near parks' and Vibe Search found exactly what I was looking for. It saved me weeks of searching!",
    author: "Sarah M.",
    role: "Graphic Designer",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80"
  },
  {
    quote: "The map interface made it so easy to see which apartments were close to my office. I found the perfect place just a 10-minute walk away.",
    author: "David L.",
    role: "Software Engineer",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80"
  },
  {
    quote: "Being able to search for 'pet-friendly with hardwood floors and lots of natural light' and actually getting relevant results was game-changing.",
    author: "Emma R.",
    role: "Veterinarian",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200&q=80"
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            What Our Users Say
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands of happy renters who found their perfect apartment using Vibe Search.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="glass p-8 rounded-2xl flex flex-col"
            >
              <div className="mb-6">
                <svg width="45" height="36" className="text-primary/30" viewBox="0 0 45 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5 0C6.04125 0 0 6.04125 0 13.5C0 20.9588 6.04125 27 13.5 27C20.9588 27 27 20.9588 27 13.5C27 20.9588 33.0413 27 40.5 27C47.9587 27 54 20.9588 54 13.5C54 6.04125 47.9587 0 40.5 0C33.0413 0 27 6.04125 27 13.5C27 6.04125 20.9588 0 13.5 0Z" fill="currentColor"/>
                </svg>
              </div>
              
              <p className="text-foreground mb-6 flex-grow">
                "{testimonial.quote}"
              </p>
              
              <div className="flex items-center">
                <div className="mr-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.author} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.author}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
