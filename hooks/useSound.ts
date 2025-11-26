
import { useRef, useCallback, useEffect } from 'react';

export const useSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopSiren = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) { /* ignore */ }
      oscillatorRef.current = null;
    }
    if (gainNodeRef.current) {
        try {
            gainNodeRef.current.disconnect();
        } catch(e) { /* ignore */ }
        gainNodeRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const playSiren = useCallback(() => {
    // Stop any existing sound first
    stopSiren();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Siren effect: Sawtooth wave varying frequency
    osc.type = 'sawtooth';
    
    // Create a wailing sound (Frequency sweep)
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.5);
    osc.frequency.linearRampToValueAtTime(600, now + 1.0);
    osc.frequency.linearRampToValueAtTime(1200, now + 1.5);
    osc.frequency.linearRampToValueAtTime(600, now + 2.0);
    osc.frequency.linearRampToValueAtTime(1200, now + 2.5);
    osc.frequency.linearRampToValueAtTime(600, now + 3.0);
    osc.frequency.linearRampToValueAtTime(1200, now + 3.5);
    osc.frequency.linearRampToValueAtTime(600, now + 4.0);
    osc.frequency.linearRampToValueAtTime(1200, now + 4.5);
    osc.frequency.linearRampToValueAtTime(600, now + 5.0);

    // Volume
    gain.gain.setValueAtTime(0.1, now);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    oscillatorRef.current = osc;
    gainNodeRef.current = gain;

    // Auto stop after 5 seconds
    timerRef.current = setTimeout(() => {
      stopSiren();
    }, 5000);

  }, [stopSiren]);

  useEffect(() => {
    return () => {
      stopSiren();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopSiren]);

  return { playSiren, stopSiren };
};
