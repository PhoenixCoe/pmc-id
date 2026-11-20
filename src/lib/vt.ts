import { flushSync } from 'react-dom';

type Transition = { finished: Promise<void> };
let running = 0;

/**
 * Runs a screen change as a view transition, so the browser shows the old card turn into the new one:
 * the card grows or shrinks, the title rolls out and the next one rolls in, the form slides across.
 * Browsers without view transitions (and anyone who asked for less motion) just get the change.
 * `sameTitle` is true when the title does not change (every step of making an account), so it stays put.
 */
export function morph(update: () => void, sameTitle = false): void {
  const d = document as Document & { startViewTransition?: (cb: () => void) => Transition };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!d.startViewTransition || calm || !document.querySelector('.split')) { update(); return; }
  const root = document.documentElement;
  running++;
  root.classList.add('vt'); root.classList.toggle('vt-same', sameTitle);
  const t = d.startViewTransition(() => { flushSync(update); });
  const end = () => { if (--running <= 0) { running = 0; root.classList.remove('vt', 'vt-same'); } };
  t.finished.then(end, end);
}
