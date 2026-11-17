'use client';
import { useEffect, useRef, useState } from 'react';
import { Foot } from './chrome';
import { Ic } from './Ic';
import { IdLockup } from './Logo';
import { AppsPage, DataPage, HomePage, InfoPage, SecurityPage } from './pages';
import { useId_ } from './state';
import { ToolkitMenus } from './toolkit';
import { WalletPage } from './wallet';
import { keyToPath, linkClick } from '@/lib/route';

export const TABS: [string, string, string][] = [
  ['home', 'Home', 'home'], ['info', 'Info', 'badge'], ['security', 'Security and sign in', 'lock'],
  ['apps', 'Linked apps', 'link'], ['wallet', 'Wallet and subscriptions', 'wallet'], ['data', 'Data and privacy', 'shield'],
];
const SHORT: Record<string, string> = { security: 'Security', apps: 'Apps', wallet: 'Wallet', data: 'Data' };
const BAND: Record<string, [string, string, string, string]> = {
  info: ['b-g1', 'badge', 'Your name and picture', 'This is what PMC apps show next to your name.'],
  security: ['b-g1', 'lock', 'Password and devices', 'Change your password and see where you are signed in.'],
  apps: ['b-g1', 'link', 'Apps you use with PMC ID', 'Every app and site you have signed in to with your PMC ID.'],
  wallet: ['b-g1', 'wallet', 'Your cards', 'Add a card once and PMC sites can fill it in for you.'],
  data: ['b-g1', 'shield', 'Your data', 'Download a copy of it, or delete your PMC ID.'],
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

export function Dashboard({ tab }: { tab: string }) {
  const { from, leave } = useId_();
  const t = TABS.find((x) => x[0] === tab) ?? TABS[0];
  const b = BAND[tab];
  return (
    <div className="dash">
      <aside className="side">
        <a className="tb-brand" href="/home/" onClick={(e) => linkClick(e, 'home')} aria-label="PMC ID home"><IdLockup className="mark" /></a>
        <nav className="nav" aria-label="PMC ID">
          {TABS.map((x) => (
            <a key={x[0]} href={keyToPath(x[0])} onClick={(e) => linkClick(e, x[0])} aria-current={x[0] === tab ? 'page' : undefined}><Ic n={x[2]} s={22} /><span className="nl">{x[1]}</span><span className="ns">{SHORT[x[0]] ?? x[1]}</span></a>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="tb">
          <h1 className="tb-title" key={tab}><Ic n={t[2]} s={26} /><span className="nl">{t[1]}</span><span className="ns">{SHORT[tab] ?? t[1]}</span></h1>
          <div className="tb-end">
            {from ? <a className="tb-back" href={from.url} onClick={leave} aria-label={`Back to ${from.name}`}><Ic n="back" s={20} /><span>{from.name}</span></a> : null}
            <HelpMenu />
            <ToolkitMenus />
          </div>
        </header>
        <main className="page" key={tab}>
          {b ? (
            <section className={'band ' + b[0]}>
              <span className="dots" aria-hidden="true"><i /><i /></span>
              <span className="band-ic" aria-hidden="true"><Ic n={b[1]} s={34} /></span>
              <span className="band-t"><b>{b[2]}</b></span>
            </section>
          ) : null}
          <div id="pg">
            {tab === 'home' && <HomePage />}
            {tab === 'info' && <InfoPage />}
            {tab === 'security' && <SecurityPage />}
            {tab === 'apps' && <AppsPage />}
            {tab === 'wallet' && <WalletPage />}
            {tab === 'data' && <DataPage />}
          </div>
        </main>
        <Foot />
      </div>
    </div>
  );
}
