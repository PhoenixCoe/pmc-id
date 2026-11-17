'use client';
import { useEffect, useRef } from 'react';
import { useId_ } from './state';

/* The account menu (pmc-account.js) and the apps menu (pmc-by.js) are the shared PMC toolkit: the same two files run in every PMC app,
   so they are loaded as they are from /js and mounted from here. */
interface PmcAccountApi { mount: (el: HTMLElement, opts: () => unknown) => void; close: () => void; paint: (el: HTMLElement, img: string) => void }
interface PmcByApi { mount: (el: HTMLElement) => void; close?: () => void }
declare global { interface Window { PmcAccount?: PmcAccountApi; PmcBy?: PmcByApi; PmcLogo?: unknown } }

/** Runs fn once the toolkit scripts have loaded. */
export function whenToolkit(fn: () => void): () => void {
  let t: ReturnType<typeof setInterval> | undefined;
  const ready = () => !!(window.PmcAccount && window.PmcBy);
  if (ready()) { fn(); return () => undefined; }
  t = setInterval(() => { if (ready()) { clearInterval(t); fn(); } }, 40);
  return () => clearInterval(t);
}

export function ToolkitMenus() {
  const { me, saved, signOut, setPrefill } = useId_();
  const acct = useRef<HTMLButtonElement>(null), by = useRef<HTMLSpanElement>(null);
  const live = useRef({ me, saved, signOut, setPrefill });
  live.current = { me, saved, signOut, setPrefill };
  useEffect(() => whenToolkit(() => {
    if (acct.current) window.PmcAccount!.mount(acct.current, () => ({
      user: live.current.me, others: live.current.saved, manage: '/info/', addAccount: '/add/',
      onSignOut: () => { void live.current.signOut('choose'); },
      onSwitch: (a: { email: string }) => { live.current.setPrefill(a.email); void live.current.signOut('signin'); },
    }));
    if (by.current) window.PmcBy!.mount(by.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  return (
    <>
      <span id="by" ref={by} />
      <button type="button" id="acct" ref={acct} />
    </>
  );
}

/** Paints the Home banner from the picture's main colour, using the account toolkit. */
export function usePaint(sel: string, img: string, on: boolean) {
  useEffect(() => on ? whenToolkit(() => { const el = document.querySelector(sel) as HTMLElement | null; if (el) window.PmcAccount!.paint(el, img); }) : undefined, [sel, img, on]);
}
