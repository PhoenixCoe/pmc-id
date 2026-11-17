/* Real addresses instead of #something: /signin/, /create/email/, /security/ ... One small table, both ways. */
import { useSyncExternalStore } from 'react';

import { CREATE, PLAIN } from './paths';

/** Every screen, by the short name the app uses inside. '' is the front page. */
export const KEYS = ['', 'choose', ...PLAIN, ...CREATE.map((_, i) => 'create-' + (i + 1))];

export function keyToPath(key: string): string {
  const m = /^create-([1-6])$/.exec(key);
  if (m) return `/create/${CREATE[+m[1] - 1]}/`;
  return key === '' || key === 'choose' ? '/' : `/${key}/`;
}

export function pathToKey(pathname: string): string {
  const p = pathname.replace(/^\/+|\/+$/g, '');
  if (p === '') return '';
  const c = /^create\/([a-z]+)$/.exec(p);
  if (c && CREATE.includes(c[1])) return 'create-' + (CREATE.indexOf(c[1]) + 1);
  return PLAIN.includes(p) ? p : '';
}

const EVENT = 'pmc-route';
export function navigate(key: string, replace = false): void {
  const q = new URLSearchParams(location.search); q.delete('add');
  const url = keyToPath(key) + (q.toString() ? '?' + q.toString() : '');
  if (url === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event(EVENT));
}

/** The old #something links keep working: they are turned into the real address once. */
export function fixOldHash(): void {
  const h = location.hash.slice(1);
  if (h && KEYS.includes(h)) { history.replaceState(null, '', keyToPath(h) + location.search); }
}

export function useRoute(): string {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('popstate', cb); window.addEventListener(EVENT, cb); return () => { window.removeEventListener('popstate', cb); window.removeEventListener(EVENT, cb); }; },
    () => pathToKey(location.pathname),
    () => '',
  );
}

/** A click on a normal link inside the app moves without reloading. Ctrl/middle click still opens a new tab. */
export function linkClick(e: React.MouseEvent<HTMLAnchorElement>, key: string): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault(); navigate(key);
}
