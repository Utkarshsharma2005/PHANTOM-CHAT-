import { useState, useEffect } from 'react';

export function useScreenSecurity() {
    const [isBlurred, setIsBlurred] = useState(false);
    const [warningCount, setWarningCount] = useState(0);

    useEffect(() => {
        const handleBlur = () => {
            setIsBlurred(true);
            setWarningCount(prev => prev + 1);
        };

        const handleFocus = () => {
            setIsBlurred(false);
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    return { isBlurred, warningCount };
}
