
import React, { useEffect, useRef, useState } from 'react';
import { MapNote, RouteData, MapUser } from '../types';
import { offlineMaps } from '../services/offlineMaps';

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
}

// Palestine Coordinates (General Center)
const DEFAULT_CENTER: [number, number] = [31.9522, 35.2332]; // Near Jerusalem/Ramallah
const DEFAULT_ZOOM = 9;

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
  userRole
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const secondaryRouteLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const userMarkersRef = useRef<{ [key: string]: any }>({});
  const hasInitialFlownToUserRef = useRef(false);

  const notesRef = useRef(notes);
  const onNavigateRef = useRef(onNavigate);
  const onDispatchRef = useRef(onDispatch);

  // Update refs to ensure event listeners have latest data
  useEffect(() => {
    notesRef.current = notes;
    onNavigateRef.current = onNavigate;
    onDispatchRef.current = onDispatch;
  }, [notes, onNavigate, onDispatch]);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(DEFAULT_CENTER, DEFAULT_ZOOM); // Set default view to Palestine
      
      layerGroupRef.current = window.L.layerGroup().addTo(map);
      routeLayerRef.current = window.L.layerGroup().addTo(map);
      secondaryRouteLayerRef.current = window.L.layerGroup().addTo(map);
      
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
      
      // Popup Event Delegation
      map.on('popupopen', (e: any) => {
         const popupNode = e.popup._contentNode;
         if (!popupNode) return;
         
         const navBtn = popupNode.querySelector('.btn-navigate');
         if (navBtn) {
            navBtn.onclick = (evt: any) => {
                evt.stopPropagation();
                // Get ID from attribute
                const noteId = navBtn.getAttribute('data-id');
                // Find note in REF (fresh data)
                const note = notesRef.current.find((n: MapNote) => n.id === noteId);
                if (note && onNavigateRef.current) {
                    onNavigateRef.current(note);
                    map.closePopup();
                }
            };
         }
         
         const dispatchBtn = popupNode.querySelector('.btn-dispatch');
         if (dispatchBtn) {
            dispatchBtn.onclick = (evt: any) => {
                evt.stopPropagation();
                const noteId = dispatchBtn.getAttribute('data-id');
                const note = notesRef.current.find((n: MapNote) => n.id === noteId);
                if (note && onDispatchRef.current) {
                    onDispatchRef.current(note);
                    map.closePopup();
                }
            };
         }
      });

      mapInstanceRef.current = map;
      
      window.addEventListener('download-offline-map', ((e: CustomEvent) => {
          if (e.detail && e.detail.callback) {
              const bounds = map.getBounds();
              e.detail.callback(bounds);
          }
      }) as EventListener);
    }
  }, []);

  // Auto-Fly to User Location on First Fix
  useEffect(() => {
    if (userLocation && mapInstanceRef.current && !hasInitialFlownToUserRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, {
        duration: 2,
        easeLinearity: 0.25
      });
      hasInitialFlownToUserRef.current = true;
    }
  }, [userLocation]);

  // Update Offline/Online Layers
  useEffect(() => {
    if (!layerGroupRef.current || !window.L) return;

    layerGroupRef.current.clearLayers();

    const OfflineTileLayer = window.L.TileLayer.extend({
        createTile: function(coords: any, done: any) {
            const tile = document.createElement('img');
            offlineMaps.getTile(coords.x, coords.y, coords.z).then((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    tile.src = url;
                    done(null, tile);
                } else {
                    tile.src = this.getTileUrl(coords);
                }
            }).catch(() => {
                tile.src = this.getTileUrl(coords);
            });
            window.L.DomEvent.on(tile, 'load', window.L.Util.bind(this._tileOnLoad, this, done, tile));
            window.L.DomEvent.on(tile, 'error', window.L.Util.bind(this._tileOnError, this, done, tile));
            return tile;
        }
    });

    if (isSatellite) {
      const imagery = new OfflineTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
      const labels = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
      const transport = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
      layerGroupRef.current.addLayer(imagery);
      layerGroupRef.current.addLayer(transport);
      layerGroupRef.current.addLayer(labels);
    } else {
       const darkLayer = new OfflineTileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20
      });
      layerGroupRef.current.addLayer(darkLayer);
    }
  }, [isSatellite]);

  // Handle Note Markers Re-rendering
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.keys(markersRef.current).forEach(key => {
      if (key !== 'temp' && key !== 'temp_click') {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    notes.forEach(note => {
      const icon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          width: 32px; 
          height: 32px; 
          background-color: ${isSatellite ? '#ef4444' : '#3b82f6'}; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 30]
      });

      // Arabic Popup Content
      const popupContent = `
        <div class="font-sans min-w-[180px] text-right" dir="rtl">
          <strong class="text-sm text-blue-400 block mb-1">${note.locationName}</strong>
          <p class="text-xs mb-3 line-clamp-2 text-slate-300">${note.userNote}</p>
          <div class="flex gap-2">
             <button class="btn-navigate flex-1 bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-blue-500 transition-colors" data-id="${note.id}">
                ذهاب
             </button>
             ${userRole === 'admin' || userRole === 'super_admin' || userRole === 'governorate_admin' || userRole === 'center_admin' ? `
               <button class="btn-dispatch flex-1 bg-purple-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-purple-500 transition-colors" data-id="${note.id}">
                  توجيه
               </button>
             ` : ''}
          </div>
        </div>
      `;

      const marker = window.L.marker([note.lat, note.lng], { icon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('popupopen', () => setSelectedNote(note));
      markersRef.current[note.id] = marker;
      if (selectedNote?.id === note.id) { marker.openPopup(); }
    });
  }, [notes, isSatellite, selectedNote, userRole]);

  // Handle FlyTo Animation
  useEffect(() => {
    if (!mapInstanceRef.current || !flyToTarget) return;
    mapInstanceRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom || 16, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [flyToTarget]);

  // Handle Temporary Marker (Create Mode)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    // Remove old temp marker
    if (markersRef.current['temp']) {
      map.removeLayer(markersRef.current['temp']);
      delete markersRef.current['temp'];
    }

    if (tempMarkerCoords) {
      const icon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-4 h-4 bg-white border-2 border-slate-900 rounded-full animate-bounce shadow-xl"></div>`,
        iconSize: [16, 16]
      });
      const marker = window.L.marker([tempMarkerCoords.lat, tempMarkerCoords.lng], { icon }).addTo(map);
      markersRef.current['temp'] = marker;
    }
  }, [tempMarkerCoords]);

  // Handle Current Route Drawing
  useEffect(() => {
    if (!routeLayerRef.current || !window.L) return;
    routeLayerRef.current.clearLayers();

    if (currentRoute) {
      const line = window.L.polyline(currentRoute.coordinates, {
        color: '#3b82f6',
        weight: 6,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(routeLayerRef.current);
      
      mapInstanceRef.current.fitBounds(line.getBounds(), { padding: [50, 50] });
    }
  }, [currentRoute]);

  // Handle Secondary Route (Tactical) Drawing
  useEffect(() => {
     if (!secondaryRouteLayerRef.current || !window.L) return;
     secondaryRouteLayerRef.current.clearLayers();

     if (secondaryRoute) {
         const line = window.L.polyline(secondaryRoute.coordinates, {
             color: '#a855f7', // Purple
             weight: 4,
             dashArray: '10, 10',
             opacity: 0.8,
             lineCap: 'round'
         }).addTo(secondaryRouteLayerRef.current);
         
         mapInstanceRef.current.fitBounds(line.getBounds(), { padding: [50, 50] });
     }
  }, [secondaryRoute]);

  // Handle Other Users Rendering
  useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      const activeIds = new Set(otherUsers.map(u => u.id));

      Object.keys(userMarkersRef.current).forEach(id => {
          if (!activeIds.has(id)) {
              map.removeLayer(userMarkersRef.current[id]);
              delete userMarkersRef.current[id];
          }
      });

      otherUsers.forEach(user => {
          if (!canSeeOthers) return;

          const iconHtml = `
            <div style="position: relative; width: 34px; height: 34px; transition: all 0.5s ease;">
                <div style="
                    background-color: ${user.color || '#3b82f6'};
                    width: 100%; height: 100%;
                    border-radius: 50%;
                    border: 2px solid white;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                ">
                    <span style="font-size: 12px; font-weight: bold; color: white;">${user.username.charAt(0).toUpperCase()}</span>
                </div>
                ${user.isSOS ? `<div style="position: absolute; inset: -10px; border-radius: 50%; border: 3px solid #ef4444; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
                <div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(15, 23, 42, 0.8); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; backdrop-filter: blur(4px);">${user.username}</div>
            </div>
          `;

          const icon = window.L.divIcon({
              className: 'custom-div-icon',
              html: iconHtml,
              iconSize: [34, 34],
              iconAnchor: [17, 17]
          });

          if (userMarkersRef.current[user.id]) {
              const marker = userMarkersRef.current[user.id];
              marker.setLatLng([user.lat, user.lng]);
              marker.setIcon(icon);
              marker.setZIndexOffset(100);
          } else {
              const marker = window.L.marker([user.lat, user.lng], { icon, zIndexOffset: 100 }).addTo(map);
              marker.on('click', () => {
                  if (onUserClick) onUserClick(user);
              });
              userMarkersRef.current[user.id] = marker;
          }
      });

      if (!canSeeOthers) {
           Object.keys(userMarkersRef.current).forEach(id => {
              map.removeLayer(userMarkersRef.current[id]);
              delete userMarkersRef.current[id];
           });
      }

  }, [otherUsers, canSeeOthers, onUserClick]);
  
  // Handle Current User Marker (Self)
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    if (userMarkerRef.current) mapInstanceRef.current.removeLayer(userMarkerRef.current);

    const userIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `
        <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">أنا</div>
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #3b82f6; border: 2px solid white; border-radius: 50%; z-index: 2;"></div>
            <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: pulse 2s infinite;"></div>
        </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
  }, [userLocation]);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-900 outline-none" />;
};
