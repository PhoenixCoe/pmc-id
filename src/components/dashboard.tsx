'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Foot } from './chrome';
import { Ic } from './Ic';
import { Mark } from './Logo';
import { AppsPage, DataPage, HomePage, InfoPage, SecurityPage } from './pages';
import { useId_ } from './state';
import { ToolkitMenus } from './toolkit';
import { WalletPage } from './wallet';
import { keyToPath, linkClick } from '@/lib/route';

export const TABS: [string, string, string][] = [
  ['home', 'Home', 'home'], ['info', 'Personal info', 'user'],
  ['security', 'Security', 'lock'],
  ['apps', 'Linked apps', 'link'], ['wallet', 'Wallet', 'wallet'],
  ['data', 'Data and privacy', 'shield'],
];
const SHORT: Record<string, string> = { info: 'Info', apps: 'Apps', data: 'Data' };
const NOTE: Record<string, string> = {
  info: 'What PMC apps show next to your name.', security: 'How you sign in, where, and what has happened.',
  apps: 'Where your PMC ID is used.', wallet: 'Cards that PMC sites can fill in for you, and what you pay for.',
  data: 'Take a copy of your data, or delete your PMC ID.',
};
const HELP: [string, string, string][] = [
  ['Change my password', 'security', 'key'], ['Change my name or picture', 'info', 'user'], ['Add a card', 'wallet', 'wallet'],
  ['Sign out of other devices', 'security', 'lock'], ['Download or delete my data', 'data', 'shield'],
];
/** A box like the apps button. It opens a short list of the things people ask for most. */
function HelpMenu() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null), btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  useEffect(() => { const h = () => setOpen(false); window.addEventListener('pmc-route', h); return () => window.removeEventListener('pmc-route', h); }, []);
  return (
    <span className="help" ref={box}>
      <button className="tb-help" type="button" ref={btn} aria-label="Help" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}><Ic n="qm" s={29} /></button>
      {open ? (
        <div className="help-pop" role="menu" aria-label="Help">
          <p className="help-h">What do you need?</p>
          {HELP.map(([t, k, ic]) => <a key={t} role="menuitem" href={keyToPath(k)} onClick={(e) => linkClick(e, k)}><Ic n={ic} s={18} />{t}</a>)}
          <a role="menuitem" href="https://pmcstudios.uk/privacy" target="_blank" rel="noopener"><Ic n="external" s={18} />Privacy and terms</a>
        </div>
      ) : null}
    </span>
  );
}

/** The green block behind the open tab. It slides to whichever one is clicked. */
function useSlide(tab: string) {
  const nav = useRef<HTMLElement>(null), bar = useRef<HTMLSpanElement>(null), first = useRef(true);
  useLayoutEffect(() => {
    const place = () => {
      const n = nav.current, b = bar.current, a = n?.querySelector<HTMLElement>('a[aria-current]');
      if (!n || !b || !a) return;
      b.style.transition = first.current ? 'none' : '';
      b.style.width = a.offsetWidth + 'px'; b.style.height = a.offsetHeight + 'px';
      b.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
      b.style.opacity = '1';
      if (first.current) { void b.offsetWidth; first.current = false; }
    };
    place();
    window.addEventListener('resize', place);
    const f = document.fonts?.ready; f?.then(place).catch(() => undefined);
    return () => window.removeEventListener('resize', place);
  }, [tab]);
  return { nav, bar };
}

export function Dashboard({ tab }: { tab: string }) {
  const { from, leave } = useId_();
  const { nav, bar } = useSlide(tab);
  const t = TABS.find((x) => x[0] === tab) ?? TABS[0];
  return (
    <div className="dash2">
      <header className="gt">
        <a className="gt-brand" href="/home/" onClick={(e) => linkClick(e, 'home')} aria-label="PMC ID home"><Mark className="mark" /><span className="gt-tag">ID</span></a>
        <div className="gt-end">
          {from ? <a className="tb-back" href={from.url} onClick={leave} aria-label={`Back to ${from.name}`}><Ic n="back" s={20} /><span>{from.name}</span></a> : null}
          <HelpMenu />
          <ToolkitMenus />
        </div>
      </header>
      <div className="gw">
        <nav className="gnav" aria-label="PMC ID" ref={nav}>
          <span className="slide" ref={bar} aria-hidden="true" />
          {TABS.map((x) => (
            <a key={x[0]} href={keyToPath(x[0])} title={x[1]} onClick={(e) => linkClick(e, x[0])} aria-current={x[0] === tab ? 'page' : undefined}><Ic n={x[2]} s={24} /><span className="nl">{x[1]}</span><span className="ns">{SHORT[x[0]] ?? x[1]}</span></a>
          ))}
        </nav>
        <main className="gm" key={tab}>
          {tab !== 'home' ? <div className="gh"><h1>{t[1]}</h1><p>{NOTE[tab]}</p></div> : null}
          <div id="pg">
            {tab === 'home' && <HomePage />}
            {tab === 'info' && <InfoPage />}
            {tab === 'security' && <SecurityPage />}
            {tab === 'apps' && <AppsPage />}
            {tab === 'wallet' && <WalletPage />}
            {tab === 'data' && <DataPage />}
          </div>
        </main>
      </div>
      <Foot />
    </div>
  );
}
