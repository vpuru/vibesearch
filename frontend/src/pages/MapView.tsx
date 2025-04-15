import React from 'react';
import { Navigate } from 'react-router-dom';

// This component redirects to the unified search page with map view parameter
const MapViewPage = () => {
  return <Navigate to="/search?view=map" replace />;
};

export default MapViewPage;