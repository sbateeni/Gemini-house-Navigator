import { useState, useEffect } from 'react';
import { getRoute } from '../services/routing';
import { RouteData, MapNote } from '../types';

export function useNavigation(userLocation: {lat: number, lng: number} | null) {
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<{lat: number, lng: number} | null>(null);

  // Dynamic Rerouting Effect
  useEffect(() => {
    if (!userLocation || !navigationTarget) return;

    const updateRoute = async () => {
        const route = await getRoute(userLocation.lat, userLocation.lng, navigationTarget.lat, navigationTarget.lng);
        if (route) setCurrentRoute(route);
    };

    updateRoute();
  }, [userLocation, navigationTarget]);

  const handleNavigateToNote = async (note: MapNote, locateUserCallback: () => void) => {
      if (!userLocation) {
          alert("We need your location. Please wait for GPS.");
          locateUserCallback();
          return;
      }
      setIsRouting(true);
      setNavigationTarget({ lat: note.lat, lng: note.lng });
      const route = await getRoute(userLocation.lat, userLocation.lng, note.lat, note.lng);
      setIsRouting(false);
      if (route) setCurrentRoute(route);
      else {
        alert("Could not find a driving route.");
        setNavigationTarget(null);
      }
  };

  const handleStopNavigation = () => {
    setNavigationTarget(null);
    setCurrentRoute(null);
  };

  return {
    currentRoute,
    isRouting,
    navigationTarget,
    handleNavigateToNote,
    handleStopNavigation
  };
}