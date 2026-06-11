export class PerformanceOptimizer {
  private metrics: Map<string, number[]> = new Map();

  minify(html: string): string {
    return html
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
  }

  lazyLoadImages(html: string): string {
    return html.replace(
      /<img\s+([^>]*?)src="([^"]+)"([^>]*)>/g,
      '<img $1src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%3E%3C/svg%3E" data-src="$2" loading="lazy"$3>'
    );
  }

  deferScripts(html: string): string {
    return html.replace(
      /<script\s+([^>]*?)src="([^"]+)"([^>]*)>/g,
      '<script $1src="$2" defer$3>'
    );
  }

  extractCriticalCSS(html: string, criticalThreshold: number = 10240): {
    critical: string;
    deferred: string;
  } {
    const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/g;
    const styles = html.match(styleRegex) || [];
    
    let critical = '';
    let deferred = '';
    let criticalSize = 0;

    styles.forEach(style => {
      const size = style.length;
      if (criticalSize + size <= criticalThreshold) {
        critical += style;
        criticalSize += size;
      } else {
        deferred += style;
      }
    });

    return { critical, deferred };
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getMetrics(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}
