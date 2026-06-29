
import { useState, useEffect, useCallback, useRef } from 'react';

export function useGeolocation(enabled: boolean) {
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setPermissionDenied(false);
        },
        (err) => {
            if (err.code === 1) setPermissionDenied(true);
            console.log("Location watch error", err);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setPermissionDenied(false);
            startWatching();
        },
        (err) => {
            if (err.code === 1) setPermissionDenied(true);
            console.log("Initial location request", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, startWatching]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setPermissionDenied(false);
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            startWatching();
        },
        (err) => {
            if (err.code === 1) setPermissionDenied(true);
            console.log("Manual location request denied", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [startWatching]);

  return { userLocation, requestLocation, permissionDenied };
}
