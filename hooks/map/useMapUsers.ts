
import React, { useEffect, useRef } from 'react';
import { MapUser } from '../../types';
import { createUserIconHtml } from '../../utils/mapHelpers';

export function useMapUsers(
    mapInstanceRef: React.MutableRefObject<any>,
    otherUsers: MapUser[],
    onUserClick: ((user: MapUser) => void) | undefined,
    canSeeOthers: boolean
) {
  const userMarkersRef = useRef<{ [key: string]: any }>({});

  useEffect(() => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      const activeIds = new Set(otherUsers.map(u => u.id));

      // Remove old
      Object.keys(userMarkersRef.current).forEach(id => {
          if (!activeIds.has(id)) {
              map.removeLayer(userMarkersRef.current[id]);
              delete userMarkersRef.current[id];
          }
      });

      // Add/Update
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

  }, [otherUsers, canSeeOthers, onUserClick, mapInstanceRef.current]);
}
