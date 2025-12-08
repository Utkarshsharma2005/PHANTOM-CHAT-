import { useState, useEffect } from 'react';

export function useCountdown(expiresAt: number) {
    const [timeLeft, setTimeLeft] = useState(expiresAt - Date.now());
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = expiresAt - Date.now();

            if (remaining <= 0) {
                setTimeLeft(0);
                setIsExpired(true);
                clearInterval(interval);
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    const formattedTime = new Date(timeLeft).toISOString().substr(11, 8); // HH:MM:SS

    return { formattedTime, isExpired, timeLeft };
}
