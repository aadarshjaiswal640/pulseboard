'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVirtualizationOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface UseVirtualizationResult {
  virtualItems: { index: number; offsetTop: number; height: number }[];
  totalHeight: number;
  scrollTop: number;
  setScrollTop: (top: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useVirtualization({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualizationOptions): UseVirtualizationResult {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalHeight = itemCount * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const virtualItems: { index: number; offsetTop: number; height: number }[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    virtualItems.push({
      index: i,
      offsetTop: i * itemHeight,
      height: itemHeight,
    });
  }

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    setScrollTop,
    containerRef,
  };
}
