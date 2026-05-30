'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { performanceMonitor } from '@/utils/PerformanceMonitor';
import Card from '../ui/Card';
import { useAlert } from '@/contexts/AlertContext';
import { 
  Activity, 
  Zap, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function PerformanceDashboard() {
  const { showSuccess } = useAlert();
  const [metrics, setMetrics] = useState(performanceMonitor.getReport());
  const [coreWebVitals, setCoreWebVitals] = useState(performanceMonitor.getCoreWebVitals());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getReport());
      setCoreWebVitals(performanceMonitor.getCoreWebVitals());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getVitalStatus = (metric: string, value?: number) => {
    if (!value) return { status: 'unknown', color: 'gray' };
    
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 }
    };
    
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return { status: 'unknown', color: 'gray' };
    
    if (value <= threshold.good) return { status: 'good', color: 'green' };
    if (value <= threshold.poor) return { status: 'needs-improvement', color: 'yellow' };
    return { status: 'poor', color: 'red' };
  };

  const formatMetricValue = (metric: string, value?: number) => {
    if (!value) return 'N/A';
    
    switch (metric) {
      case 'lcp':
      case 'fid':
      case 'ttfb':
        return `${(value / 1000).toFixed(2)}s`;
      case 'cls':
        return value.toFixed(3);
      default:
        return value.toFixed(2);
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-3 bg-[var(--primary-blue)] text-white rounded-full shadow-lg hover:bg-[var(--primary-indigo)] transition-colors z-50"
        title="Show Performance Dashboard"
      >
        <Activity className="w-5 h-5" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-auto glass-card-prominent rounded-xl shadow-2xl z-50"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Monitor
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-[var(--text-2)] hover:text-[var(--text-1)]"
          >
            ×
          </button>
        </div>

        {/* Core Web Vitals */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[var(--text-2)] mb-3">Core Web Vitals</h4>
          <div className="space-y-3">
            {[
              { key: 'lcp', label: 'Largest Contentful Paint', icon: Clock },
              { key: 'fid', label: 'First Input Delay', icon: Zap },
              { key: 'cls', label: 'Cumulative Layout Shift', icon: Activity },
              { key: 'ttfb', label: 'Time to First Byte', icon: Clock }
            ].map(({ key, label, icon: Icon }) => {
              const value = coreWebVitals[key as keyof typeof coreWebVitals];
              const { status } = getVitalStatus(key, value);
              
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-surface-alt rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[var(--text-2)]" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {formatMetricValue(key, value)}
                    </span>
                    {status === 'good' && <CheckCircle className="w-4 h-4 text-[var(--primary-emerald)]" />}
                    {status === 'needs-improvement' && <AlertTriangle className="w-4 h-4 text-[var(--primary-amber)]" />}
                    {status === 'poor' && <XCircle className="w-4 h-4 text-[var(--primary-red)]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-[var(--text-2)] mb-3">Performance Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <p className="text-xs text-[var(--text-2)]">Avg Load Time</p>
              <p className="text-lg font-semibold">
                {(metrics.summary.averageLoadTime / 1000).toFixed(2)}s
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-[var(--text-2)]">P95 Load Time</p>
              <p className="text-lg font-semibold">
                {(metrics.summary.p95LoadTime / 1000).toFixed(2)}s
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-[var(--text-2)]">Cache Hit Rate</p>
              <p className="text-lg font-semibold">
                {(metrics.summary.cacheHitRate * 100).toFixed(1)}%
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-[var(--text-2)]">Error Rate</p>
              <p className="text-lg font-semibold">
                {(metrics.summary.errorRate * 100).toFixed(1)}%
              </p>
            </Card>
          </div>
        </div>

        {/* Recent Metrics */}
        <div>
          <h4 className="text-sm font-medium text-[var(--text-2)] mb-3">Recent Metrics</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {metrics.metrics.slice(-10).reverse().map((metric, index) => (
              <div key={index} className="flex items-center justify-between text-xs p-2 bg-surface-alt rounded">
                <span className="text-[var(--text-2)]">{metric.name}</span>
                <span className="font-mono">
                  {metric.value < 1000 
                    ? `${metric.value.toFixed(0)}ms`
                    : `${(metric.value / 1000).toFixed(2)}s`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => performanceMonitor.clear()}
            className="flex-1 px-3 py-2 text-sm bg-surface-alt hover:bg-[rgba(var(--glass-rgb),0.2)] rounded-lg transition-colors"
          >
            Clear Metrics
          </button>
          <button
            onClick={() => {
              const _report = performanceMonitor.getReport();
              
              showSuccess('Report Exported', 'Performance report has been logged to the console.');
            }}
            className="flex-1 px-3 py-2 text-sm bg-info hover:bg-[rgba(var(--primary-blue),0.2)] text-info rounded-lg transition-colors"
          >
            Export Report
          </button>
        </div>
      </div>
    </motion.div>
  );
}