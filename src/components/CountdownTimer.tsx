import { AlertTriangle, Clock3 } from 'lucide-react';

interface CountdownTimerProps {
    formattedTime: string;
    isExpired: boolean;
    timeLeft: number | null;
}

export function CountdownTimer({ formattedTime, isExpired, timeLeft }: CountdownTimerProps) {
    const isWarning = timeLeft !== null && timeLeft <= 60 && !isExpired;

    return (
        <div className={`countdown-timer${isExpired ? ' expired' : isWarning ? ' warning' : ''}`} role="timer" aria-live="off">
            {isExpired ? <AlertTriangle size={15} /> : <Clock3 size={15} />}
            <span>{isExpired ? 'Expired' : formattedTime}</span>
        </div>
    );
}
