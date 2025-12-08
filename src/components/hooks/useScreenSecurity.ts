import { useState, useEffect, useCallback } from 'react';

export function useScreenSecurity() {
  const [isBlurred, setIsBlurred] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  const handleBlur = useCallback(() => {
    setIsBlurred(true);
    setWarningCount(prev => prev + 1);
  }, []);

  const handleFocus = useCallback(() => {
    setIsBlurred(false);
  }, []);

  useEffect(() => {
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Detect visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleBlur, handleFocus]);

  return { isBlurred, warningCount };
}
