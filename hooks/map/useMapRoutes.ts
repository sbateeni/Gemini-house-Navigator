


import React, { useEffect } from 'react';
import { RouteData } from '../../types';

export function useMapRoutes(
    mapInstanceRef: React.MutableRefObject<any>,
    currentRoute: RouteData | null,
    secondaryRoute: RouteData | null | undefined
) {
  
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const routeLayer = mapInstanceRef.current.routeLayer;
    
    if (routeLayer) routeLayer.clearLayers();

    if (currentRoute && routeLayer) {
      const line = window.L.polyline(currentRoute.coordinates, {
        color: '#3b82f6',
        weight: 6,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(routeLayer);
      mapInstanceRef.current.fitBounds(line.getBounds(), { padding: [50, 50] });
    }
  }, [currentRoute, mapInstanceRef.current]);

  useEffect(() => {
     if (!mapInstanceRef.current || !window.L) return;
     const secondaryLayer = mapInstanceRef.current.secondaryRouteLayer;

     if (secondaryLayer) secondaryLayer.clearLayers();

     if (secondaryRoute && secondaryLayer) {
         const line = window.L.polyline(secondaryRoute.coordinates, {
             color: '#a855f7',
             weight: 4,
             dashArray: '10, 10',
             opacity: 0.8,
             lineCap: 'round'
         }).addTo(secondaryLayer);
         mapInstanceRef.current.fitBounds(line.getBounds(), { padding: [50, 50] });
     }
  }, [secondaryRoute, mapInstanceRef.current]);
}
