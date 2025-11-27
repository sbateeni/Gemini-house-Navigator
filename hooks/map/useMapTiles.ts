
import { useEffect } from 'react';
import { offlineMaps } from '../../services/offlineMaps';

export function useMapTiles(mapInstanceRef: React.MutableRefObject<any>, isSatellite: boolean) {
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
      layerGroup.addLayer(imagery);
      layerGroup.addLayer(transport);
      layerGroup.addLayer(labels);
    } else {
       const darkLayer = new OfflineTileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20
      });
      layerGroup.addLayer(darkLayer);
    }
  }, [isSatellite, mapInstanceRef.current]); // Re-run when satellite mode changes
}
