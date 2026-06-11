import { PerformanceOptimizer } from './performance';

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    optimizer = new PerformanceOptimizer();
  });

  describe('Minification', () => {
    it('should minify HTML', () => {
      const html = `
        <html>
          <head>
            <title>Test</title>
          </head>
          <body>
            <p>Hello World</p>
          </body>
        </html>
      `;

      const minified = optimizer.minify(html);
      expect(minified.length).toBeLessThan(html.length);
      expect(minified).toContain('<title>Test</title>');
    });

    it('should preserve content during minification', () => {
      const html = '<p>Important content</p>';
      const minified = optimizer.minify(html);
      expect(minified).toContain('Important content');
    });
  });

  describe('Lazy Loading', () => {
    it('should add lazy loading attributes to images', () => {
      const html = '<img src="test.jpg" alt="test">';
      const result = optimizer.lazyLoadImages(html);
      expect(result).toContain('loading="lazy"');
    });

    it('should preserve image src and alt', () => {
      const html = '<img src="test.jpg" alt="test image">';
      const result = optimizer.lazyLoadImages(html);
      expect(result).toContain('src="test.jpg"');
      expect(result).toContain('alt="test image"');
    });

    it('should handle multiple images', () => {
      const html = '<img src="1.jpg"><img src="2.jpg"><img src="3.jpg">';
      const result = optimizer.lazyLoadImages(html);
      const count = (result.match(/loading="lazy"/g) || []).length;
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Script Deferring', () => {
    it('should add defer attribute to scripts', () => {
      const html = '<script src="app.js"></script>';
      const result = optimizer.deferScripts(html);
      expect(result).toContain('defer');
    });

    it('should preserve script src', () => {
      const html = '<script src="main.js"></script>';
      const result = optimizer.deferScripts(html);
      expect(result).toContain('src="main.js"');
    });

    it('should handle inline scripts', () => {
      const html = '<script>console.log("test");</script>';
      const result = optimizer.deferScripts(html);
      expect(result).toContain('console.log');
    });
  });

  describe('Metrics Collection', () => {
    it('should record metrics', () => {
      optimizer.recordMetric('test_metric', 100);
      optimizer.recordMetric('test_metric', 200);
      
      const metrics = optimizer.getMetrics('test_metric');
      expect(metrics).toBeDefined();
    });

    it('should retrieve recorded metrics', () => {
      optimizer.recordMetric('perf_test', 50);
      const metrics = optimizer.getMetrics('perf_test');
      
      expect(metrics).not.toBeNull();
    });

    it('should handle multiple metric types', () => {
      optimizer.recordMetric('metric_a', 100);
      optimizer.recordMetric('metric_b', 200);
      
      const metricsA = optimizer.getMetrics('metric_a');
      const metricsB = optimizer.getMetrics('metric_b');
      
      expect(metricsA).toBeDefined();
      expect(metricsB).toBeDefined();
    });
  });
});
