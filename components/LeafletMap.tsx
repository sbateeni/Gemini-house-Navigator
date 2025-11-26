
import React, { useEffect, useRef } from 'react';
import { MapNote, RouteData, MapUser } from '../types';
import { offlineMaps } from '../services/offlineMaps';
import { createNoteIconHtml, createNotePopupHtml, createUserIconHtml, createSelfIconHtml, createTempMarkerIconHtml } from '../utils/mapHelpers';

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

  useEffect(() => {
    notesRef.current = notes;
    onNavigateRef.current = onNavigate;
    onDispatchRef.current = onDispatch;
  }, [notes, onNavigate, onDispatch]);

  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(DEFAULT_CENTER, DEFAULT_ZOOM); 
      
      layerGroupRef.current = window.L.layerGroup().addTo(map);
      routeLayerRef.current = window.L.layerGroup().addTo(map);
      secondaryRouteLayerRef.current = window.L.layerGroup().addTo(map);
      
      map.on('click', (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
      
      map.on('popupopen', (e: any) => {
         const popupNode = e.popup._contentNode;
         if (!popupNode) return;
         
         const navBtn = popupNode.querySelector('.btn-navigate');
         if (navBtn) {
            navBtn.onclick = (evt: any) => {
                evt.stopPropagation();
                const noteId = navBtn.getAttribute('data-id');
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

  useEffect(() => {
    if (userLocation && mapInstanceRef.current && !hasInitialFlownToUserRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, {
        duration: 2,
        easeLinearity: 0.25
      });
      hasInitialFlownToUserRef.current = true;
    }
  }, [userLocation]);

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

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    Object.keys(markersRef.current).forEach(key => {
      if (key !== 'temp' && key !== 'temp_click') {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    notes.forEach(note => {
      const html = createNoteIconHtml(isSatellite);
      const icon = window.L.divIcon({
        className: 'custom-div-icon',
        html: html,
        iconSize: [32, 32],
        iconAnchor: [16, 30]
      });

      const canCommand = ['super_admin', 'governorate_admin', 'center_admin', 'admin'].includes(userRole || '');
      const popupContent = createNotePopupHtml(note, canCommand);

      const marker = window.L.marker([note.lat, note.lng], { icon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('popupopen', () => setSelectedNote(note));
      markersRef.current[note.id] = marker;
      if (selectedNote?.id === note.id) { marker.openPopup(); }
    });
  }, [notes, isSatellite, selectedNote, userRole]);

  useEffect(() => {
    if (!mapInstanceRef.current || !flyToTarget) return;
    mapInstanceRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom || 16, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [flyToTarget]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    if (markersRef.current['temp']) {
      map.removeLayer(markersRef.current['temp']);
      delete markersRef.current['temp'];
    }

    if (tempMarkerCoords) {
      const icon = window.L.divIcon({
        className: 'custom-div-icon',
        html: createTempMarkerIconHtml(),
        iconSize: [16, 16]
      });
      const marker = window.L.marker([tempMarkerCoords.lat, tempMarkerCoords.lng], { icon }).addTo(map);
      markersRef.current['temp'] = marker;
    }
  }, [tempMarkerCoords]);

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

  useEffect(() => {
     if (!secondaryRouteLayerRef.current || !window.L) return;
     secondaryRouteLayerRef.current.clearLayers();

     if (secondaryRoute) {
         const line = window.L.polyline(secondaryRoute.coordinates, {
             color: '#a855f7',
             weight: 4,
             dashArray: '10, 10',
             opacity: 0.8,
             lineCap: 'round'
         }).addTo(secondaryRouteLayerRef.current);
         mapInstanceRef.current.fitBounds(line.getBounds(), { padding: [50, 50] });
     }
  }, [secondaryRoute]);

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

          const html = createUserIconHtml(user);
          const icon = window.L.divIcon({
              className: 'custom-div-icon',
              html: html,
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
  
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    if (userMarkerRef.current) mapInstanceRef.current.removeLayer(userMarkerRef.current);

    const userIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: createSelfIconHtml(),
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
  }, [userLocation]);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-900 outline-none" />;
};
