/**
 * Prometheus Metrics
 * Performance and usage metrics
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

// Simple metrics implementation (can be replaced with prom-client if needed)
class Metrics {
  constructor() {
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
  }

  /**
   * Increment counter
   */
  incrementCounter(name, labels = {}) {
    const key = this.getKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + 1);
  }

  /**
   * Record histogram value
   */
  recordHistogram(name, value, labels = {}) {
    const key = this.getKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
  }

  /**
   * Set gauge value
   */
  setGauge(name, value, labels = {}) {
    const key = this.getKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Get key for labels
   */
  getKey(name, labels) {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Export metrics in Prometheus format
   */
  export() {
    const lines = [];
    
    // Counters
    for (const [key, value] of this.counters.entries()) {
      lines.push(`# TYPE ${key.split('{')[0]} counter`);
      lines.push(`${key} ${value}`);
    }
    
    // Histograms
    for (const [key, values] of this.histograms.entries()) {
      const baseName = key.split('{')[0];
      lines.push(`# TYPE ${baseName} histogram`);
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        
        lines.push(`${key}_sum ${sum}`);
        lines.push(`${key}_count ${values.length}`);
        lines.push(`${key}_avg ${avg.toFixed(2)}`);
        lines.push(`${key}_p50 ${p50}`);
        lines.push(`${key}_p95 ${p95}`);
        lines.push(`${key}_p99 ${p99}`);
      }
    }
    
    // Gauges
    for (const [key, value] of this.gauges.entries()) {
      lines.push(`# TYPE ${key.split('{')[0]} gauge`);
      lines.push(`${key} ${value}`);
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}

export const metrics = new Metrics();

/**
 * Middleware to record HTTP request metrics
 */
export function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const route = req.route?.path || req.path;
    
    metrics.incrementCounter('http_requests_total', {
      method: req.method,
      route,
      status: res.statusCode,
    });
    
    metrics.recordHistogram('http_request_duration_ms', duration, {
      method: req.method,
      route,
      status: res.statusCode,
    });
  });
  
  next();
}
