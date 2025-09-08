import { useEffect, useState, RefObject, useCallback } from 'react';

export const useHorizontalScrollPosition = (ref: RefObject<HTMLElement>) => {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [requestId, setRequestId] = useState<number | null>(null);

  const updateScrollPosition = useCallback(() => {
    if (ref.current) {
      const currentScrollLeft = ref.current.scrollLeft;
      setScrollLeft(currentScrollLeft);
    }
    setRequestId(null);
  }, [ref]);

  const handleScroll = useCallback(() => {
    if (requestId === null) {
      const id = requestAnimationFrame(updateScrollPosition);
      setRequestId(id);
    }
  }, [requestId, updateScrollPosition]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Initial position
    setScrollLeft(element.scrollLeft);

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (requestId !== null) {
        cancelAnimationFrame(requestId);
      }
    };
  }, [ref, handleScroll, requestId]);

  return scrollLeft;
};
