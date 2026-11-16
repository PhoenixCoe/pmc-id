'use client';
import { Foot } from './chrome';
import { Ic } from './Ic';
import { IdLockup } from './Logo';
import { AppsPage, DataPage, HomePage, InfoPage, SecurityPage } from './pages';
import { ToolkitMenus } from './toolkit';
import { WalletPage } from './wallet';

export const TABS: [string, string, string][] = [
  ['home', 'Home', 'home'], ['info', 'Info', 'badge'], ['security', 'Security and sign in', 'lock'],
  ['apps', 'Linked apps', 'link'], ['wallet', 'Wallet and subscriptions', 'wallet'], ['data', 'Data and privacy', 'shield'],
];
const SHORT: Record<string, string> = { security: 'Security', apps: 'Apps', wallet: 'Wallet', data: 'Data' };
const BAND: Record<string, [string, string, string, string]> = {
  info: ['b-tint', 'badge', 'Your name and picture', 'This is what PMC apps show next to your name.'],
  security: ['b-g1', 'lock', 'Password and devices', 'Change your password and see where you are signed in.'],
  apps: ['b-gold', 'link', 'Apps you use with PMC ID', 'Remove an app and it can no longer sign you in.'],
  wallet: ['b-ink', 'wallet', 'Your cards', 'Add a card once and PMC sites can fill it in for you.'],
  data: ['b-g2', 'shield', 'Your data', 'Download a copy of it, or delete your PMC ID.'],
};

export function Dashboard({ tab }: { tab: string }) {
  const t = TABS.find((x) => x[0] === tab) ?? TABS[0];
  const b = BAND[tab];
  return (
    <div className="dash">
      <aside className="side">
        <a className="tb-brand" href="#home" aria-label="PMC ID home"><IdLockup className="mark" /></a>
        <nav className="nav" aria-label="PMC ID">
          {TABS.map((x) => (
            <a key={x[0]} href={'#' + x[0]} aria-current={x[0] === tab ? 'page' : undefined}><Ic n={x[2]} s={22} /><span className="nl">{x[1]}</span><span className="ns">{SHORT[x[0]] ?? x[1]}</span></a>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="tb">
          <h1 className="tb-title"><Ic n={t[2]} s={26} />{t[1]}</h1>
          <div className="tb-end">
            <a className="tb-help" href="https://pmcstudios.uk/help" target="_blank" rel="noopener" aria-label="Help"><Ic n="help" s={34} /></a>
            <ToolkitMenus />
          </div>
        </header>
        <main className="page">
          {b ? (
            <section className={'band ' + b[0]}>
              <span className="dots" aria-hidden="true"><i /><i /></span>
              <span className="band-ic" aria-hidden="true"><Ic n={b[1]} s={44} /></span>
              <span className="band-t"><b>{b[2]}</b><small>{b[3]}</small></span>
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
