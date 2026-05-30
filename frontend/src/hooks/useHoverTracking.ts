import { useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface HoverTrackingOptions {
  elementId: string;
  elementName: string;
  minHoverDuration?: number; // Minimum hover duration in ms before logging
  trackDuration?: boolean; // Whether to track hover duration
}

export const useHoverTracking = ({
  elementId,
  elementName,
  minHoverDuration = 500,
  trackDuration = true
}: HoverTrackingOptions) => {
  const { user } = useAuth();
  const hoverStartTimeRef = useRef<number>(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasLoggedRef = useRef(false);

  const handleMouseEnter = useCallback((event?: React.MouseEvent) => {
    hoverStartTimeRef.current = Date.now();
    hasLoggedRef.current = false;

    // Capture element type before setTimeout (event object gets recycled)
    const _elementType = event?.currentTarget?.tagName?.toLowerCase() || 'unknown';

    // Log hover after minimum duration
    hoverTimeoutRef.current = setTimeout(() => {
      if (!hasLoggedRef.current) {
        hasLoggedRef.current = true;
      }
    }, minHoverDuration);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId, elementName, user, minHoverDuration]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (trackDuration && hasLoggedRef.current && hoverStartTimeRef.current > 0) {
      const _hoverDuration = Date.now() - hoverStartTimeRef.current;
      
    }

    hoverStartTimeRef.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId, elementName, user, trackDuration]);

  // Return props to spread on the element
  return {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    'data-hover-tracked': 'true'
  };
};
