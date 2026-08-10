import { useEffect } from 'react';

const SITE_URL = 'https://lucentreport.com';

// Homepage defaults — keep in sync with the static tags in index.html.
const DEFAULTS = {
  title: 'LucentReport — AI Dashboard Builder | Plain-English Analytics',
  description:
    "Connect any database, ask in plain English, and LucentReport's AI builds complete dashboards — charts, forecasts, and insights in seconds. Free to start.",
  robots: 'index, follow',
};

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface SeoOptions {
  title?: string;
  description?: string;
  /** e.g. 'noindex, nofollow' for pages that should stay out of search results */
  robots?: string;
  /** Path only, e.g. '/login' — joined onto the production origin */
  canonicalPath?: string;
}

/**
 * Per-route document metadata. The SPA serves one index.html for every URL,
 * so without this each route claims the homepage's title/canonical — a
 * duplicate-content signal to crawlers. Restores homepage defaults on unmount.
 */
export function useSeo({ title, description, robots, canonicalPath }: SeoOptions = {}) {
  useEffect(() => {
    document.title = title ?? DEFAULTS.title;
    setMeta('description', description ?? DEFAULTS.description);
    setMeta('robots', robots ?? DEFAULTS.robots);
    setCanonical(SITE_URL + (canonicalPath ?? '/'));
    return () => {
      document.title = DEFAULTS.title;
      setMeta('description', DEFAULTS.description);
      setMeta('robots', DEFAULTS.robots);
      setCanonical(SITE_URL + '/');
    };
  }, [title, description, robots, canonicalPath]);
}
