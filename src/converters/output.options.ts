export type OutputTheme = 'light' | 'dark' | 'minimal' | 'none';

export interface OutputOptions {
  theme?: OutputTheme;
  includeToc?: boolean;       // Table of contents
  minify?: boolean;
  header?: string;             // Custom HTML header content
  footer?: string;             // Custom HTML footer content
  syntaxHighlight?: boolean;   // Apply code highlighting
  syntaxTheme?: string;        // highlight.js theme name
  customCss?: string;          // Extra CSS to inject
  title?: string;              // Document title override
  lang?: string;               // Document language
}

export const DEFAULT_OUTPUT_OPTIONS: Required<OutputOptions> = {
  theme: 'light',
  includeToc: false,
  minify: false,
  header: '',
  footer: '',
  syntaxHighlight: false,
  syntaxTheme: 'github',
  customCss: '',
  title: '',
  lang: 'en'
};

export function mergeOptions(options?: Partial<OutputOptions>): Required<OutputOptions> {
  return { ...DEFAULT_OUTPUT_OPTIONS, ...options };
}

export function applyTheme(html: string, theme: OutputTheme): string {
  if (theme === 'none') return html;

  const themeStyles: Record<string, string> = {
    light: `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
             color: #333; background: #fff; line-height: 1.6; padding: 2rem; }
      h1,h2,h3 { color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
      code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
      pre { background: #f4f4f4; padding: 1rem; border-radius: 6px; overflow-x: auto; }
      table { border-collapse: collapse; width: 100%; }
      th,td { border: 1px solid #ddd; padding: 8px; }
      th { background: #f9f9f9; }
      blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1rem; color: #666; }`,
    dark: `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
             color: #e0e0e0; background: #1e1e1e; line-height: 1.6; padding: 2rem; }
      h1,h2,h3 { color: #fff; border-bottom: 1px solid #444; padding-bottom: 0.3em; }
      code { background: #2d2d2d; padding: 0.2em 0.4em; border-radius: 3px; }
      pre { background: #2d2d2d; padding: 1rem; border-radius: 6px; overflow-x: auto; }
      table { border-collapse: collapse; width: 100%; }
      th,td { border: 1px solid #444; padding: 8px; }
      th { background: #2d2d2d; }
      blockquote { border-left: 4px solid #555; margin: 0; padding-left: 1rem; color: #aaa; }`,
    minimal: `
      body { font-family: Georgia, serif; color: #222; background: #fff;
             line-height: 1.7; padding: 2rem; max-width: 720px; margin: 0 auto; }
      h1,h2,h3 { font-weight: normal; }
      code { font-family: 'Courier New', monospace; }
      pre { font-family: 'Courier New', monospace; }`
  };

  const style = themeStyles[theme] || themeStyles['light'];
  return html.replace('</head>', `<style>${style}</style></head>`);
}

export function injectCustomCss(html: string, css: string): string {
  if (!css) return html;
  return html.replace('</head>', `<style>${css}</style></head>`);
}

export function wrapWithHeaderFooter(html: string, header: string, footer: string): string {
  if (header) {
    html = html.replace('<body>', `<body>${header}`);
  }
  if (footer) {
    html = html.replace('</body>', `${footer}</body>`);
  }
  return html;
}