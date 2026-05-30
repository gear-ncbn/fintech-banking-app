import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ScrollTrackingOptions {
  elementId: string;
  elementName: string;
  debounceMs?: number;
  thresholds?: number[]; // Percentage thresholds to track (e.g., [25, 50, 75, 100])
}

export const useScrollTracking = ({
  elementId,
  elementName,
  debounceMs = 1000,
  thresholds = [25, 50, 75, 100]
}: ScrollTrackingOptions) => {
  const { user } = useAuth();
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastScrollPositionRef = useRef(0);
  const reachedThresholdsRef = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Calculate scroll percentage
    const maxScroll = scrollHeight - clientHeight;
    const scrollPercentage = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 0;
    
    // Track threshold milestones
    thresholds.forEach(threshold => {
      if (scrollPercentage >= threshold && !reachedThresholdsRef.current.has(threshold)) {
        reachedThresholdsRef.current.add(threshold);
      }
    });

    // Debounced scroll tracking for general scroll events
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const _scrollDirection = scrollTop > lastScrollPositionRef.current ? 'down' : 'up';
      const scrollDistance = Math.abs(scrollTop - lastScrollPositionRef.current);
      
      // Only log significant scrolls
      if (scrollDistance > 50) {
        // Scroll tracking logic removed
      }
      
      lastScrollPositionRef.current = scrollTop;
    }, debounceMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId, elementName, user, debounceMs, thresholds]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Reset thresholds when element changes
  useEffect(() => {
    reachedThresholdsRef.current.clear();
    lastScrollPositionRef.current = 0;
  }, [elementId]);

  return containerRef;
};
