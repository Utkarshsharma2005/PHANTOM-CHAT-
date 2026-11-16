import { useCallback, useEffect, useState } from 'react';

export function useCountdown(expiresAt: number | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    if (!expiresAt) return null;
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;
    let interval: number | undefined;
    const update = () => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining !== null && remaining <= 0) {
        setIsExpired(true);
        if (interval !== undefined) window.clearInterval(interval);
      }
    };
    // Run after the effect commits; timer callbacks keep clock reads out of render.
    const initial = window.setTimeout(() => {
      update();
      if (calculateTimeLeft() !== null && calculateTimeLeft()! > 0) interval = window.setInterval(update, 1000);
    }, 0);
    return () => {
      window.clearTimeout(initial);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [expiresAt, calculateTimeLeft]);

  const formattedTime = useCallback((seconds: number | null): string => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return { timeLeft, isExpired, formattedTime: formattedTime(timeLeft) };
}
