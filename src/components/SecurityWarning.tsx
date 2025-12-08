import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Eye, Shield } from 'lucide-react';

interface SecurityWarningProps {
  isVisible: boolean;
  warningCount: number;
}

export function SecurityWarning({ isVisible, warningCount }: SecurityWarningProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <div className="text-center space-y-6 p-8">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ 
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="inline-flex p-4 rounded-full bg-destructive/20 border border-destructive/50"
            >
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </motion.div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-destructive font-mono">
                ⚠ SECURITY ALERT
              </h2>
              <p className="text-muted-foreground max-w-md">
                Focus change detected. This may indicate a screenshot attempt.
                Your session is being monitored for security.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span>Warnings: {warningCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>E2E Encrypted</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/60 font-mono">
              Return focus to continue chatting...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
