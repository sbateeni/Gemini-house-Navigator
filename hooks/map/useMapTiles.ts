
import React, { useEffect } from 'react';
import { offlineMaps } from '../../services/offlineMaps';

export function useMapTiles(mapInstanceRef: React.MutableRefObject<any>, mapProvider: string) {
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    
    const layerGroup = mapInstanceRef.current.layerGroup;
    if (!layerGroup) return;

    layerGroup.clearLayers();

    // Custom TileLayer to check IndexedDB first
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

    // --- GOOGLE MAPS (Highest Zoom & Quality) ---
    if (mapProvider === 'google' || mapProvider === 'google_hybrid') {
       // Google Hybrid (Satellite + Labels) - Max Zoom 22
       const googleHybrid = new OfflineTileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
         maxZoom: 22,
         subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
         attribution: 'Google Maps'
       });
       layerGroup.addLayer(googleHybrid);

    } else if (mapProvider === 'google_streets') {
        // Google Streets - Max Zoom 22
        const googleStreets = new OfflineTileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: 'Google Maps'
        });
        layerGroup.addLayer(googleStreets);

    } else if (mapProvider === 'google_terrain') {
        // Google Terrain - Max Zoom 20 (Good for geography)
        const googleTerrain = new OfflineTileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: 'Google Maps'
        });
        layerGroup.addLayer(googleTerrain);

    // --- ESRI MAPS (Professional Cartography) ---
    } else if (mapProvider === 'esri_streets') {
        // Esri World Street Map
        const esriStreets = new OfflineTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Esri'
        });
        layerGroup.addLayer(esriStreets);

    } else if (mapProvider === 'esri') {
       // Esri Satellite (Standard)
       const imagery = new OfflineTileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
         maxZoom: 19,
         attribution: 'Esri'
       });
       const labels = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
         maxZoom: 19
       });
       layerGroup.addLayer(imagery);
       layerGroup.addLayer(labels);

    // --- OPEN SOURCES ---
    } else if (mapProvider === 'osm') {
       // OpenStreetMap
       const osm = new OfflineTileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         maxZoom: 19,
         attribution: '© OpenStreetMap contributors'
       });
       layerGroup.addLayer(osm);

    } else {
       // Carto Dark (Tactical Default)
       const darkLayer = new OfflineTileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
         subdomains: 'abcd',
         maxZoom: 20,
         attribution: 'CartoDB'
       });
       layerGroup.addLayer(darkLayer);
    }

  }, [mapProvider, mapInstanceRef.current]); 
}
