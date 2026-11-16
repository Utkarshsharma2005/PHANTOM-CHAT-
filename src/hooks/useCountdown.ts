import { useEffect, useState } from 'react';

// Legacy duplicate retained for older imports; the active room uses the shared component hook.
export function useCountdown(expiresAt: number) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    let interval: number | undefined;
    const update = () => {
      const remaining = expiresAt - Date.now();
      setTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        setIsExpired(true);
        if (interval !== undefined) window.clearInterval(interval);
      }
    };
    const initial = window.setTimeout(() => {
      update();
      if (expiresAt > Date.now()) interval = window.setInterval(update, 1000);
    }, 0);
    return () => {
      window.clearTimeout(initial);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [expiresAt]);

  const totalSeconds = Math.ceil(timeLeft / 1000);
  const formattedTime = `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
  return { formattedTime, isExpired, timeLeft };
}
