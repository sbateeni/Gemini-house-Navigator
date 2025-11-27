
import React from 'react';
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
  currentUserId?: string; // Passed but used in filtering inside parent before passing otherUsers usually, or we filter here if needed. 
  // Note: The filtering was moved to LeafletMap props in App.tsx previously (currentUserId logic), 
  // but hooks/usePresence.ts in this version returns all users. 
  // We will handle filtering in useMapUsers if `currentUserId` is passed, or rely on App.tsx logic.
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  isSatellite,
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

  // 2. Manage Tile Layers (Satellite/Street/Offline)
  useMapTiles(mapInstanceRef, isSatellite);

  // 3. Manage Markers (Notes, Temp, Self)
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

  // Filter out self from otherUsers if currentUserId is provided to avoid duplicate markers
  const filteredOtherUsers = currentUserId 
    ? otherUsers.filter(u => u.id !== currentUserId) 
    : otherUsers;

  // 4. Manage Other Users Markers
  useMapUsers(mapInstanceRef, filteredOtherUsers, onUserClick, canSeeOthers);

  // 5. Manage Routes (Blue/Purple lines)
  useMapRoutes(mapInstanceRef, currentRoute, secondaryRoute);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-900 outline-none" />;
};
