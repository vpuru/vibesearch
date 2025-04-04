import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white py-6 border-t">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <span className="font-serif text-xl text-navy">iris</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4 md:mt-0">
            © {new Date().getFullYear()} All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
