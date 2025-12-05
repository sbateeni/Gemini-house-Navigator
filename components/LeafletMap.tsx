
import React, { useEffect, useRef, useState } from 'react';
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
  
  // New Prop for Flight Game
  isFlying?: boolean;
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
  currentUserId,
  isFlying = false
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

  // --- 6. FLIGHT SIMULATOR LOGIC ---
  const flightState = useRef({
      speed: 0,
      heading: 0, // degrees
      lat: 31.9522,
      lng: 35.2332,
      bank: 0
  });
  
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Virtual Joystick Event Listener
    const handleVirtualInput = (e: any) => {
        const { x, y } = e.detail; // x: turn (-1 to 1), y: speed input (-1 to 1)
        // Store these somewhere or apply directly in loop
        // For simplicity, we'll mimic keys in the loop
        (window as any).virtualFlightInput = { x, y };
    };
    window.addEventListener('flight-input', handleVirtualInput);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('flight-input', handleVirtualInput);
    };
  }, []);

  useEffect(() => {
    if (!isFlying || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    
    // Sync flight state with current map center initially
    const center = map.getCenter();
    flightState.current.lat = center.lat;
    flightState.current.lng = center.lng;

    let animationFrameId: number;

    const loop = () => {
        const state = flightState.current;
        const input = (window as any).virtualFlightInput || { x: 0, y: 0 };
        
        // --- INPUT HANDLING ---
        // Speed
        if (keys.current['ArrowUp'] || keys.current['KeyW']) state.speed = Math.min(state.speed + 0.00001, 0.002);
        else if (keys.current['ArrowDown'] || keys.current['KeyS']) state.speed = Math.max(state.speed - 0.00001, 0);
        else if (input.y > 0.1) state.speed = Math.min(state.speed + 0.00001, 0.002);
        else if (input.y < -0.1) state.speed = Math.max(state.speed - 0.00001, 0);
        
        // Turning (Banking)
        let targetBank = 0;
        if (keys.current['ArrowLeft'] || keys.current['KeyA'] || input.x < -0.2) targetBank = -30;
        else if (keys.current['ArrowRight'] || keys.current['KeyD'] || input.x > 0.2) targetBank = 30;
        
        // Smooth banking
        state.bank += (targetBank - state.bank) * 0.1;

        // Apply Heading Change based on Bank
        // A bank of 30 degrees turns the plane
        state.heading += state.bank * 0.1;

        // --- PHYSICS UPDATE ---
        // Convert heading to rad
        const rad = (state.heading - 90) * (Math.PI / 180); // -90 offset because 0 is North in LatLng but 0 is East in Math
        
        // Move
        state.lat += Math.sin(rad) * state.speed; // Lat is Y
        state.lng += Math.cos(rad) * state.speed; // Lng is X

        // Update Map
        // Use panTo for smooth movement, or setView with animate: false for instant
        map.setView([state.lat, state.lng], map.getZoom(), { animate: false });

        // Dispatch visual update to PlaneView
        window.dispatchEvent(new CustomEvent('flight-update', { detail: { bank: state.bank, speed: state.speed } }));

        animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isFlying]);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-900 outline-none" />;
};
