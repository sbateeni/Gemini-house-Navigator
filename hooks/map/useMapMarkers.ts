


import React, { useEffect, useRef } from 'react';
import { MapNote } from '../../types';
import { createNoteIconHtml, createNotePopupHtml, createTempMarkerIconHtml, createSelfIconHtml } from '../../utils/mapHelpers';

export function useMapMarkers(
    mapInstanceRef: React.MutableRefObject<any>,
    notes: MapNote[],
    selectedNote: MapNote | null,
    setSelectedNote: (note: MapNote | null) => void,
    flyToTarget: { lat: number; lng: number; zoom?: number; timestamp: number; showPulse?: boolean } | null,
    tempMarkerCoords: { lat: number; lng: number } | null,
    userLocation: { lat: number; lng: number } | null,
    onNavigate: ((note: MapNote) => void) | undefined,
    onDispatch: ((note: MapNote) => void) | undefined,
    userRole: string | null,
    isSatellite: boolean
) {
  const markersRef = useRef<{ [key: string]: any }>({});
  const userMarkerRef = useRef<any>(null);
  const hasInitialFlownToUserRef = useRef(false);

  // Use refs for data access inside event listener closures
  const notesRef = useRef(notes);
  const onNavigateRef = useRef(onNavigate);
  const onDispatchRef = useRef(onDispatch);

  useEffect(() => {
    notesRef.current = notes;
    onNavigateRef.current = onNavigate;
    onDispatchRef.current = onDispatch;
  }, [notes, onNavigate, onDispatch]);

  // 1. Setup Global Event Listeners for Popup Buttons
  // This replaces the fragile Leaflet 'popupopen' DOM traversal
  useEffect(() => {
      const handleNavigate = (e: any) => {
          const noteId = e.detail;
          const note = notesRef.current.find(n => n.id === noteId);
          if (note && onNavigateRef.current) {
              onNavigateRef.current(note);
              mapInstanceRef.current?.closePopup();
          }
      };

      const handleDispatch = (e: any) => {
          const noteId = e.detail;
          const note = notesRef.current.find(n => n.id === noteId);
          if (note && onDispatchRef.current) {
              onDispatchRef.current(note);
              mapInstanceRef.current?.closePopup();
          }
      };

      window.addEventListener('map-navigate', handleNavigate);
      window.addEventListener('map-dispatch', handleDispatch);

      return () => {
          window.removeEventListener('map-navigate', handleNavigate);
          window.removeEventListener('map-dispatch', handleDispatch);
      };
  }, []); // Run once to attach global listeners

  // 2. Render Note Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Cleanup deleted notes
    Object.keys(markersRef.current).forEach(key => {
      if (key !== 'temp') {
        if (!notes.find(n => n.id === key)) {
            map.removeLayer(markersRef.current[key]);
            delete markersRef.current[key];
        }
      }
    });

    // Add/Update notes
    notes.forEach(note => {
      if (markersRef.current[note.id]) return; // Already exists

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
    });
    
    // Open popup if selected
    if (selectedNote && markersRef.current[selectedNote.id]) {
        markersRef.current[selectedNote.id].openPopup();
    }

  }, [notes, isSatellite, selectedNote, userRole, mapInstanceRef.current]);

  // 3. Handle FlyTo
  useEffect(() => {
    if (!mapInstanceRef.current || !flyToTarget) return;
    mapInstanceRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom || 16, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [flyToTarget]);

  // 4. Temp Marker
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

  // 5. Self Location Marker
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

    // Initial FlyTo
    if (!hasInitialFlownToUserRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, {
        duration: 2,
        easeLinearity: 0.25
      });
      hasInitialFlownToUserRef.current = true;
    }
  }, [userLocation]);
}
