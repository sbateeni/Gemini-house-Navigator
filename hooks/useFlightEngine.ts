
import { useState, useEffect, useCallback, useRef } from 'react';

export interface FlightState {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  isFlying: boolean;
}

export function useFlightEngine(initialLat: number = 31.9522, initialLng: number = 35.2332) {
  const [state, setState] = useState<FlightState>({
    lat: initialLat,
    lng: initialLng,
    speed: 0,
    heading: 0,
    altitude: 1000,
    isFlying: false
  });

  const requestRef = useRef<number>(undefined);
  const lastTimeRef = useRef<number>(undefined);

  const startFlight = () => setState(prev => ({ ...prev, isFlying: true, speed: 0.0001 }));
  const stopFlight = () => setState(prev => ({ ...prev, isFlying: false, speed: 0 }));

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      
      setState(prev => {
        if (!prev.isFlying) return prev;

        // Simple flight physics
        const radians = (prev.heading * Math.PI) / 180;
        const dLat = Math.cos(radians) * prev.speed;
        const dLng = Math.sin(radians) * prev.speed;

        return {
          ...prev,
          lat: prev.lat + dLat,
          lng: prev.lng + dLng,
          // Altitude variation for realism
          altitude: prev.altitude + (Math.random() - 0.5) * 2
        };
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  const controlFlight = (action: 'left' | 'right' | 'up' | 'down' | 'faster' | 'slower') => {
    setState(prev => {
      let { heading, speed, altitude } = prev;
      switch (action) {
        case 'left': heading -= 5; break;
        case 'right': heading += 5; break;
        case 'up': altitude += 100; break;
        case 'down': altitude = Math.max(100, altitude - 100); break;
        case 'faster': speed = Math.min(0.005, speed + 0.0001); break;
        case 'slower': speed = Math.max(0, speed - 0.0001); break;
      }
      return { ...prev, heading, speed, altitude };
    });
  };

  return { ...state, startFlight, stopFlight, controlFlight, setState };
}
