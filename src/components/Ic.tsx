import { ALIAS, PATHS } from '@/lib/icons';

/** One PMC Icon. Colour is the text colour around it. */
export function Ic({ n, s = 20 }: { n: string; s?: number }) {
  const d = PATHS[n] ?? PATHS[ALIAS[n]];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="square" strokeLinejoin="miter" strokeMiterlimit={1.5} aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}
