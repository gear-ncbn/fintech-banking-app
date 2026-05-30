'use client';

import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { performanceMonitor } from '@/utils/PerformanceMonitor';

// Virtual scrolling component for long lists
interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number | ((item: T, index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export const VirtualList = memo(function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  className = ''
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const getItemHeight = useCallback(
    (item: T, index: number) =>
      typeof itemHeight === 'function' ? itemHeight(item, index) : itemHeight,
    [itemHeight]
  );

  // Prefix sums of item offsets for variable-height support
  const offsets = useMemo(() => {
    const result: number[] = [0];
    for (let i = 0; i < items.length; i++) {
      result.push(result[i] + getItemHeight(items[i], i));
    }
    return result;
  }, [items, getItemHeight]);

  const totalHeight = offsets[items.length] ?? 0;

  let startIndex = 0;
  while (startIndex < items.length && offsets[startIndex + 1] < scrollTop) {
    startIndex++;
  }
  startIndex = Math.max(0, startIndex - overscan);

  let endIndex = startIndex;
  while (endIndex < items.length && offsets[endIndex] < scrollTop + height) {
    endIndex++;
  }
  endIndex = Math.min(items.length - 1, endIndex + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = offsets[startIndex] ?? 0;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: getItemHeight(item, startIndex + index) }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}) as <T>(props: VirtualListProps<T>) => React.ReactElement;

// Lazy loading image component
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWUiLz48L3N2Zz4=',
  onLoad,
  onError
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoading, setIsLoading] = React.useState(true);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px'
  });

  useEffect(() => {
    if (inView && imageSrc === placeholder) {
      performanceMonitor.mark(`image-load-start-${src}`);
      
      const img = new Image();
      img.src = src;
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoading(false);
        performanceMonitor.measure(`image-load-${src}`, `image-load-start-${src}`);
        onLoad?.();
      };
      
      img.onerror = () => {
        setIsLoading(false);
        onError?.();
      };
    }
  }, [inView, src, placeholder, imageSrc, onLoad, onError]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
      {isLoading && (
        <div className="absolute inset-0 skeleton-item animate-pulse" />
      )}
    </div>
  );
});

// Memoized chart component wrapper
interface MemoizedChartProps {
  data: unknown[];
  type: 'line' | 'bar' | 'pie';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any;
  className?: string;
}

export const MemoizedChart = memo(function MemoizedChart({
  data,
  className
}: MemoizedChartProps) {
  const chartData = useMemo(() => {
    performanceMonitor.mark('chart-process-start');
    
    // Process chart data here
    const processed = data; // Add actual processing logic
    
    performanceMonitor.measure('chart-process', 'chart-process-start');
    return processed;
  }, [data]);

  // Render chart based on type
  return (
    <div className={className}>
      {/* Chart implementation */}
      <pre>{JSON.stringify(chartData, null, 2)}</pre>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
    prevProps.type === nextProps.type &&
    JSON.stringify(prevProps.options) === JSON.stringify(nextProps.options)
  );
});

// Debounced input component
interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onDebouncedChange: (value: string) => void;
  delay?: number;
}

export const DebouncedInput = memo(function DebouncedInput({
  value,
  onDebouncedChange,
  delay = 300,
  onChange,
  ...props
}: DebouncedInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (onChange) {
      onChange(e);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onDebouncedChange(newValue);
    }, delay);
  }, [onChange, onDebouncedChange, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      {...props}
      value={localValue}
      onChange={handleChange}
    />
  );
});

// Progressive enhancement wrapper
interface ProgressiveEnhancementProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  enhanced: boolean;
}

export const ProgressiveEnhancement = memo(function ProgressiveEnhancement({
  children,
  fallback,
  enhanced
}: ProgressiveEnhancementProps) {
  const [isClient, setIsClient] = React.useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !enhanced) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
});

// Optimized table with virtual scrolling
interface OptimizedTableProps<T> {
  columns: Array<{
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
  }>;
  data: T[];
  rowHeight?: number;
  height?: number;
  className?: string;
}

export const OptimizedTable = memo(function OptimizedTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowHeight = 50,
  height = 400,
  className = ''
}: OptimizedTableProps<T>) {
  const renderRow = useCallback((item: T, index: number) => (
    <tr key={index} className="border-b hover:bg-surface-alt">
      {columns.map(column => (
        <td key={column.key} className="px-4 py-2">
          {column.render ? column.render(item) : (item[column.key] as React.ReactNode)}
        </td>
      ))}
    </tr>
  ), [columns]);

  return (
    <div className={`overflow-hidden ${className}`}>
      <table className="w-full">
        <thead className="bg-surface-alt sticky top-0 z-10">
          <tr>
            {columns.map(column => (
              <th key={column.key} className="px-4 py-2 text-left">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      <VirtualList
        items={data}
        height={height - 50} // Subtract header height
        itemHeight={rowHeight}
        renderItem={(item, index) => (
          <table className="w-full">
            <tbody>{renderRow(item, index)}</tbody>
          </table>
        )}
      />
    </div>
  );
}) as <T extends Record<string, unknown>>(props: OptimizedTableProps<T>) => React.ReactElement;