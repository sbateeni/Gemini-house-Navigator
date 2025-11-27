


import { useState, useEffect } from 'react';

export function useGeolocation(session: any, isApproved: boolean) {
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!session || !isApproved) return;
    
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            },
            (err) => console.log("Location access denied or error", err),
            { 
              enableHighAccuracy: true,
              maximumAge: 10000, // Accept positions up to 10s old (Fixes Safari flickering)
              timeout: 20000     // Wait 20s before timing out
            }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [session, isApproved]);

  return { userLocation };
}
