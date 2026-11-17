import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Ic } from './Ic';
import { Mark } from './Logo';
import type { User } from './state';

export function Av({ u }: { u: Pick<User, 'img'> }) {
  return (
    <span className="av">
      {u.img ? <img alt="" src={u.img} /> : (
        <svg className="dpfp" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="miter" aria-hidden="true"><rect x="8" y="3" width="8" height="8" /><path d="M3 21v-6h18v6" /></svg>
      )}
    </span>
  );
}

export function Foot() {
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
/* When a card is replaced by the next step within a moment, only its contents slide in. A card arriving fresh rises into place. */
let lastGone = 0;

/** Makes the card grow or shrink smoothly whenever its contents change size. */
function useSmoothHeight(box: React.RefObject<HTMLDivElement | null>, inner: React.RefObject<HTMLDivElement | null>, lead: React.RefObject<HTMLHeadingElement | null>) {
  useLayoutEffect(() => {
    const el = box.current, content = inner.current, head = lead.current;
    if (!el || !content || !head) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animating = false, fontsReady = document.fonts.status === 'loaded';
    const done = () => { animating = false; el.classList.remove('easing'); el.style.transition = ''; el.style.height = ''; };
    const sync = () => {
      const from = animating ? el.getBoundingClientRect().height : lastHeight;
      el.style.transition = 'none'; el.style.height = 'auto';
      const to = el.getBoundingClientRect().height;
      if (!calm && fontsReady && from && Math.abs(to - from) > 1) {
        animating = true; el.classList.add('easing');
        el.style.height = from + 'px'; void el.offsetHeight;
        el.style.transition = 'height .38s cubic-bezier(.3,.7,.2,1)'; el.style.height = to + 'px';
      } else done();
      lastHeight = to;
    };
    const end = (e: TransitionEvent) => { if (e.target === el && e.propertyName === 'height') done(); };
    el.addEventListener('transitionend', end);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(content); ro.observe(head);
    let gone = false;
    document.fonts.ready.then(() => { if (!gone) { fontsReady = true; if (!animating) lastHeight = el.getBoundingClientRect().height; } });
    return () => { gone = true; ro.disconnect(); el.removeEventListener('transitionend', end); };
  }, [box, inner, lead]);
}

export function AuthCard({ title, step, onSubmit, children }: { title: string; step?: number; onSubmit: () => void; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null), lead = useRef<HTMLHeadingElement>(null);
  useSmoothHeight(box, inner, lead);
  const [flow] = useState(() => Date.now() - lastGone < 500);
  useEffect(() => () => { lastGone = Date.now(); }, []);
  return (
    <div className="auth">
      <main className="auth-mid">
        <div className={'split ' + (flow ? 'in-flow' : 'in-first')} ref={box}>
          <div className="split-l">
            <div className="ht" aria-hidden="true"><i /><i /><i /></div>
            <a className="split-logo" href="https://pmcstudios.uk" aria-label="PMC Studios"><Mark /></a>
            <h1 ref={lead}>{title}</h1>
          </div>
          <form className="split-r" noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}><div className="sr-in" ref={inner}>{children}</div></form>
        </div>
        {step ? <div className="steps" role="img" aria-label={`Step ${step} of 6`}>{[1, 2, 3, 4, 5, 6].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div> : null}
      </main>
      <Foot />
    </div>
  );
}

export const BackLink = ({ to }: { to: string }) => <a className="btn" href={`#${to}`}><Ic n="back" />Back</a>;
export const Acts = ({ back, label }: { back: ReactNode; label: string }) => <div className="acts">{back}<button className="btn primary" type="submit">{label}</button></div>;
