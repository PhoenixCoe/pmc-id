import { keyToPath, linkClick } from '@/lib/route';
import { useId_ } from './state';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Ic } from './Ic';
import { Mark } from './Logo';
import { ErrSlot } from './err';
import type { User } from './state';

export function Av({ u }: { u: Pick<User, 'img'> }) {
  return (
    <span className="av">
      {u.img ? <img alt="" src={u.img} /> : (
        <svg className="dpfp" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="miter" strokeLinecap="square" aria-hidden="true"><rect x="8" y="3" width="8" height="8" /><path d="M3 21v-6h18v6" /></svg>
      )}
    </span>
  );
}

/* The sign in screens have no bar: the way back to the app is the one button above the card. */
export function Foot(_: { back?: boolean }) {
  return (
    <footer className="foot">
      <a className="foot-mark" href="https://pmcstudios.uk/" aria-label="PMC Studios"><Mark /></a>
      <span className="c">© 2026 PMC Studios</span>
      <a href="https://pmcstudios.uk/privacy">Privacy</a>
      <a href="https://pmcstudios.uk/terms">Terms</a>
    </footer>
  );
}

/** The split sign-in card: dark halftone panel on the left, the form on the right. */
/* The height the last card had, so the next card can ease from it instead of jumping. */
let lastHeight = 0;
/* How many cards are on screen, and when the last one left. A card that arrives while another is still there (the next step replaces it in the same moment) or just after one left is a
   continuation: it does not fade or rise, it just takes the old card's height and eases to its own. Only the first card on a page rises into place. */
let alive = 0;
let lastGone = 0;

/** Makes the card grow or shrink smoothly whenever its contents change size. (When the screen itself changes, the view transition in lib/vt.ts does it instead.) */
function useSmoothHeight(box: React.RefObject<HTMLDivElement | null>, inner: React.RefObject<HTMLDivElement | null>, lead: React.RefObject<HTMLHeadingElement | null>, flow: boolean) {
  useLayoutEffect(() => {
    const el = box.current, content = inner.current, head = lead.current;
    if (!el || !content || !head) return;
    if (!flow) lastHeight = 0; /* a card arriving fresh has nothing to ease from */
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animating = false, fontsReady = document.fonts.status === 'loaded';
    const done = () => { animating = false; el.classList.remove('easing'); el.style.transition = ''; el.style.height = ''; };
    const sync = () => {
      const from = animating ? el.getBoundingClientRect().height : lastHeight;
      el.style.transition = 'none'; el.style.height = 'auto';
      const to = el.getBoundingClientRect().height;
      if (!calm && fontsReady && from && Math.abs(to - from) > 1 && !document.documentElement.classList.contains('vt')) {
        animating = true; el.classList.add('easing');
        el.style.height = from + 'px'; void el.offsetHeight;
        el.style.transition = 'height .38s cubic-bezier(.3,.7,.2,1)'; el.style.height = to + 'px';
      } else done();
      lastHeight = to;
    };
    const end = (e: TransitionEvent) => { if (e.target === el && e.propertyName === 'height') done(); };
    el.addEventListener('transitionend', end);
    sync();
    /* Watch what is inside the form, not the form box itself: the box stretches to the card's height (so the buttons sit on the card's bottom line), and watching it would
       restart the easing on every frame of the easing. */
    const ro = new ResizeObserver(sync);
    const watch = () => { ro.disconnect(); ro.observe(head); for (const c of Array.from(content.children)) ro.observe(c); };
    watch();
    const mo = new MutationObserver(() => { watch(); sync(); });
    mo.observe(content, { childList: true });
    let gone = false;
    document.fonts.ready.then(() => { if (!gone) { fontsReady = true; if (!animating) lastHeight = el.getBoundingClientRect().height; } });
    return () => { gone = true; ro.disconnect(); mo.disconnect(); el.removeEventListener('transitionend', end); };
  }, [box, inner, lead, flow]);
}

export function AuthCard({ title, step, onSubmit, children }: { title: string; step?: number; onSubmit: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null), lead = useRef<HTMLHeadingElement>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null); /* errors are shown under the card, not inside the form */
  const [flow] = useState(() => alive > 0 || Date.now() - lastGone < 1500);
  useSmoothHeight(box, inner, lead, flow);
  const { from, leave } = useId_();
  useEffect(() => { alive++; return () => { alive--; lastGone = Date.now(); }; }, []);
  return (
    <div className="auth">
      <main className="auth-mid">
        {from ? <div className="auth-top"><a className="btn small" href={from.url} onClick={leave} aria-label={`Back to ${from.name}`}><Ic n="back" s={18} />{from.name}</a></div> : null}
        <div className={'split ' + (flow ? 'in-flow' : 'in-first')} ref={box}>
          <div className="split-l">
            <div className="ht" aria-hidden="true"><i /><i /><i /></div>
            <h1 ref={lead}>{title}</h1>
          </div>
          <form className="split-r" noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}><ErrSlot.Provider value={slot}><div className="sr-in" ref={inner}>{children}</div></ErrSlot.Provider></form>
        </div>
        {step ? <div className="steps" role="img" aria-label={`Step ${step} of 6`}>{[1, 2, 3, 4, 5, 6].map((i) => <i key={i} className={i < step ? 'on' : i === step ? 'on cur' : ''} />)}</div> : null}
        <div className="auth-err" ref={setSlot} aria-live="polite" />
      </main>
      <Foot back />
    </div>
  );
}

export const BackLink = ({ to }: { to: string }) => <a className="btn" href={keyToPath(to)} onClick={(e) => linkClick(e, to)}><Ic n="back" />Back</a>;
export const Acts = ({ back, label }: { back: ReactNode; label: string }) => <div className="acts">{back}<button className="btn primary" type="submit">{label}</button></div>;
