import { useEffect, useState, useCallback, RefObject } from 'react';

interface Position {
  top: number;
  left: number;
  width?: number;
}

interface UseFloatingPositionProps {
  triggerRef: RefObject<HTMLElement | null>;
  floatingRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  placement?: 'bottom' | 'top' | 'auto';
  offset?: number;
}

export const useFloatingPosition = ({
  triggerRef,
  isOpen,
  placement = 'bottom',
  offset = 8,
}: UseFloatingPositionProps): Position => {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !isOpen) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Since we're using fixed positioning in a Portal, we don't need to add scroll offsets
    let calculatedPlacement = placement;
    
    // For initial calculation, estimate floating element height
    const estimatedHeight = 240; // Reasonable default for dropdown menus
    
    // Auto placement logic
    if (placement === 'auto') {
      const spaceBelow = viewportHeight - (triggerRect.bottom + offset);
      const spaceAbove = triggerRect.top - offset;
      
      calculatedPlacement = spaceBelow >= estimatedHeight || spaceBelow > spaceAbove 
        ? 'bottom' 
        : 'top';
    }

    // Calculate vertical position (viewport relative for fixed positioning)
    let top: number;
    if (calculatedPlacement === 'bottom') {
      top = triggerRect.bottom + offset;
      // Check if it goes beyond viewport
      if (top + estimatedHeight > viewportHeight) {
        top = triggerRect.top - estimatedHeight - offset;
      }
    } else {
      top = triggerRect.top - estimatedHeight - offset;
      // Check if it goes above viewport
      if (top < 0) {
        top = triggerRect.bottom + offset;
      }
    }

    // Calculate horizontal position (viewport relative for fixed positioning)
    let left = triggerRect.left;
    
    // Adjust if it goes beyond right edge
    const estimatedWidth = Math.max(200, triggerRect.width); // Min width for dropdowns
    if (left + estimatedWidth > viewportWidth) {
      left = Math.max(0, triggerRect.right - estimatedWidth);
    }
    
    // Adjust if it goes beyond left edge
    if (left < 0) {
      left = 0;
    }

    setPosition({
      top,
      left,
      width: triggerRect.width, // Optional: match trigger width
    });
  }, [triggerRef, isOpen, placement, offset]);

  useEffect(() => {
    if (!isOpen) return;

    calculatePosition();

    // Recalculate on scroll or resize
    const handleUpdate = () => calculatePosition();
    
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    
    // Use ResizeObserver if available
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && triggerRef.current) {
      resizeObserver = new ResizeObserver(handleUpdate);
      resizeObserver.observe(triggerRef.current);
    }

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, calculatePosition]);

  return position;
};

export default useFloatingPosition;