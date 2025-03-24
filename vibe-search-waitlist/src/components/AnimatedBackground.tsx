
import React from 'react';

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-vibe-light-blue/10 rounded-full filter blur-[100px] animate-float" style={{ animationDelay: '0s' }}></div>
      <div className="absolute bottom-[-5%] left-[-10%] w-[40%] h-[40%] bg-vibe-sage/10 rounded-full filter blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-vibe-terracotta/5 rounded-full filter blur-[80px] animate-float" style={{ animationDelay: '4s' }}></div>
    </div>
  );
};

export default AnimatedBackground;
