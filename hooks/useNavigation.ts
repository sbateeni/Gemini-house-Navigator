


import { useState, useEffect, useRef } from 'react';
import { getRoute } from '../services/routing';
import { RouteData, MapNote } from '../types';

export function useNavigation(userLocation: {lat: number, lng: number} | null) {
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [secondaryRoute, setSecondaryRoute] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<{lat: number, lng: number} | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic Rerouting for Main Route (Me -> Target) with debounce
  useEffect(() => {
    if (!userLocation || !navigationTarget) return;
    if (userLocation.lat === 0 && userLocation.lng === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
        const route = await getRoute(userLocation.lat, userLocation.lng, navigationTarget.lat, navigationTarget.lng);
        if (route) setCurrentRoute(route);
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [userLocation, navigationTarget]);

  const warnGpsRequired = () => {
    alert('يرجى تفعيل GPS/خدمات الموقع أولاً ثم إعادة الضغط على زر "ذهاب".');
  };

  const handleNavigateToNote = async (note: MapNote, locateUserCallback: () => void) => {
      setNavigationTarget({ lat: note.lat, lng: note.lng });
      if (!userLocation) {
          warnGpsRequired();
          locateUserCallback();
          return;
      }
      setIsRouting(true);
      const route = await getRoute(userLocation.lat, userLocation.lng, note.lat, note.lng);
      setIsRouting(false);
      if (route) setCurrentRoute(route);
      else {
        alert("تعذر العثور على مسار قيادة.");
        setNavigationTarget(null);
      }
  };

  const handleNavigateToPoint = async (lat: number, lng: number, locateUserCallback?: () => void) => {
      setNavigationTarget({ lat, lng });
      if (!userLocation) {
          warnGpsRequired();
          locateUserCallback?.();
          return;
      }
      setIsRouting(true);
      const route = await getRoute(userLocation.lat, userLocation.lng, lat, lng);
      setIsRouting(false);
      if (route) setCurrentRoute(route);
  };

  const calculateRoute = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
      return await getRoute(start.lat, start.lng, end.lat, end.lng);
  };

  const handleStopNavigation = () => {
    setNavigationTarget(null);
    setCurrentRoute(null);
  };

  const clearSecondaryRoute = () => {
      setSecondaryRoute(null);
  };

  return {
    currentRoute,
    secondaryRoute,
    setSecondaryRoute,
    isRouting,
    navigationTarget,
    handleNavigateToNote,
    handleNavigateToPoint,
    calculateRoute,
    handleStopNavigation,
    clearSecondaryRoute
  };
}
