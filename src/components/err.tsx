'use client';
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Where the sign in and create cards want their errors shown: a spot under the card (set by AuthCard).
 * undefined = no card around (the account pages), so the error sits where it was raised; null = the card is still setting up.
 */
export const ErrSlot = createContext<HTMLElement | null | undefined>(undefined);

const TITLES: Record<string, string> = {
  form: 'That did not work', code: 'Check the code', pw: 'Check the password', pw2: 'Check the password', em: 'Check the email',
  fn: 'Check your name', dd: 'Check the date', 'gen-btn': 'Pick one',
};
/** Orange = it could not get through (connection, too many tries); red = something needs fixing. Same boxes as Coe. */
const level = (t: string) => (/could not reach|connection|too many|in a minute|timed out/i.test(t) ? 'orange' : 'red');

/** An error, in the small PMC box Coe uses (red or orange, "!" square, short title, one line of words). */
export function Err({ id, children }: { id?: string; children: ReactNode }) {
  const slot = useContext(ErrSlot);
  const text = typeof children === 'string' ? children : String(children ?? '');
  if (!text || slot === null) return null;
  const box = (
    <div className={`err-box ${level(text)}`} role="alert">
      <span className="err-i" aria-hidden>!</span>
      <h4 className="d">{(id && TITLES[id]) || 'Check this'}</h4>
      <p>{text}</p>
    </div>
  );
  return slot ? createPortal(box, slot) : box;
}
