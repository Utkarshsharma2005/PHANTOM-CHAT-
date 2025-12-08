import { motion } from 'framer-motion';
import { Timer, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  formattedTime: string;
  isExpired: boolean;
  timeLeft: number | null;
}

export function CountdownTimer({ formattedTime, isExpired, timeLeft }: CountdownTimerProps) {
  const isWarning = timeLeft !== null && timeLeft <= 60 && !isExpired;
  const isCritical = timeLeft !== null && timeLeft <= 30 && !isExpired;

  return (
    <motion.div
      animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm ${
        isExpired
          ? 'bg-destructive/20 text-destructive border border-destructive/50'
          : isWarning
          ? 'bg-warning/20 text-warning border border-warning/50'
          : 'bg-primary/10 text-primary border border-primary/30'
      }`}
    >
      {isExpired ? (
        <AlertTriangle className="w-4 h-4" />
      ) : (
        <Timer className={`w-4 h-4 ${isCritical ? 'animate-pulse' : ''}`} />
      )}
      <span className="tracking-wider">
        {isExpired ? 'EXPIRED' : formattedTime}
      </span>
    </motion.div>
  );
}
