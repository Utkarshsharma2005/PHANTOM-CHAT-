import { useState, useEffect, useCallback } from 'react';

export function useCountdown(expiresAt: number | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    if (!expiresAt) return null;
    const now = Date.now();
    const remaining = expiresAt - now;
    return Math.max(0, Math.floor(remaining / 1000));
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;

    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    
    if (initial !== null && initial <= 0) {
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining !== null && remaining <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, calculateTimeLeft]);

  const formatTime = useCallback((seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return { timeLeft, isExpired, formattedTime: formatTime(timeLeft) };
}
