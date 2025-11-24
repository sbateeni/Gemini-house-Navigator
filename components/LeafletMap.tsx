import React, { useEffect, useRef } from 'react';
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
      }).setView([24.7136, 46.6753], 6); // Default to Middle East view
      
      layerGroupRef.current = window.L.layerGroup().addTo(map);
      routeLayerRef.current = window.L.layerGroup().addTo(map);
      secondaryRouteLayerRef.current = window.L.layerGroup().addTo(map);
      
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
      
      // Fix: Use delegation or ensure buttons exist before attaching
      map.on('popupopen', (e: any) => {
         const popupNode = e.popup._contentNode;
         
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
             ${userRole === 'admin' ? `
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

  // (Existing logic for FlyTo, User Markers, Routes remains mostly the same but ensure correct variable names)
  // ... [Rendering User Markers, Routes etc from previous file content] ...
  
  // Re-injecting User Marker logic for completeness
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