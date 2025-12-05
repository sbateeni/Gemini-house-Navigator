
import React, { useEffect, useRef } from 'react';
import { MapNote, RouteData, MapUser } from '../types';
import { useMapInstance } from '../hooks/map/useMapInstance';
import { useMapTiles } from '../hooks/map/useMapTiles';
import { useMapMarkers } from '../hooks/map/useMapMarkers';
import { useMapUsers } from '../hooks/map/useMapUsers';
import { useMapRoutes } from '../hooks/map/useMapRoutes';

declare global {
  interface Window {
    L: any;
  }
}

interface LeafletMapProps {
  isSatellite: boolean;
  mapProvider: string;
  notes: MapNote[];
  selectedNote: MapNote | null;
  setSelectedNote: (note: MapNote | null) => void;
  onMapClick: (lat: number, lng: number) => void;
  flyToTarget: { lat: number; lng: number; zoom?: number; timestamp: number; showPulse?: boolean } | null;
  tempMarkerCoords: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number } | null;
  currentRoute: RouteData | null;
  otherUsers?: MapUser[]; 
  onUserClick?: (user: MapUser) => void; 
  secondaryRoute?: RouteData | null;
  canSeeOthers?: boolean;
  onNavigate?: (note: MapNote) => void;
  onDispatch?: (note: MapNote) => void;
  userRole?: string | null;
  currentUserId?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  isSatellite,
  mapProvider,
  notes,
  selectedNote,
  setSelectedNote,
  onMapClick,
  flyToTarget,
  tempMarkerCoords,
  userLocation,
  currentRoute,
  otherUsers = [],
  onUserClick,
  secondaryRoute,
  canSeeOthers = true,
  onNavigate,
  onDispatch,
  userRole,
  currentUserId
}) => {
  // 1. Initialize Map
  const { mapContainerRef, mapInstanceRef } = useMapInstance(onMapClick);

  // 2. Manage Tile Layers
  useMapTiles(mapInstanceRef, mapProvider);

  // 3. Manage Markers
  useMapMarkers(
    mapInstanceRef, 
    notes, 
    selectedNote, 
    setSelectedNote, 
    flyToTarget, 
    tempMarkerCoords, 
    userLocation, 
    onNavigate, 
    onDispatch, 
    userRole, 
    isSatellite
  );

  const filteredOtherUsers = currentUserId 
    ? otherUsers.filter(u => u.id !== currentUserId) 
    : otherUsers;

  // 4. Manage Other Users Markers
  useMapUsers(mapInstanceRef, filteredOtherUsers, onUserClick, canSeeOthers);

  // 5. Manage Routes
  useMapRoutes(mapInstanceRef, currentRoute, secondaryRoute);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-900 outline-none" />;
};
