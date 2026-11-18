'use client';
import { useEffect, useState } from 'react';
import { Field, PwInput, useErrors } from './form';
import { Ic } from './Ic';
import { Ok, Panel, RowBtn, Rw } from './rows';
import { useId_ } from './state';
import { ApiError, readPlan, sayErr, signIn } from '@/lib/supabase';
import type { Plan } from '@/lib/supabase';
import { brand, luhn } from '@/lib/validate';
import { clearCards, open as openWallet, seal, testPassword, unlockWithPassword } from '@/lib/wallet';
import type { Card } from '@/lib/wallet';

const SKINS = [['#B49A57', '#171717'], ['#337957', '#FBF6EC'], ['#171717', '#FBF6EC'], ['#6FB894', '#171717']];
const SAFE_IMG = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;
const spaced = (n: string) => n.replace(/(.{4})/g, '$1 ').trim();

/** A virtual card. Saved cards show only the last four digits. */
function CardFace({ c, i, live, photo }: { c: Pick<Card, 'brand' | 'num' | 'name' | 'mm' | 'yy' | 'img'>; i: number; live?: boolean; photo?: string }) {
  const img = live ? photo : c.img;
  if (img && SAFE_IMG.test(img)) {
    return <div className={'cardface photo' + (live ? ' live' : '')} style={{ backgroundImage: `url(${img})` }}><span className="cf-last">{c.brand} •••• {c.num.slice(-4)}</span></div>;
  }
  const s = SKINS[i % SKINS.length];
  const num = live ? (c.num ? spaced((c.num + '•'.repeat(16)).slice(0, Math.max(16, c.num.length))) : '•••• •••• •••• ••••') : '•••• •••• •••• ' + c.num.slice(-4);
  return (
    <div className={'cardface' + (live ? ' live' : '')} style={{ background: s[0], color: s[1] }}>
      <span className="cf-dots" aria-hidden="true" />
      <span className="cf-top"><b className="cf-brand">{c.brand}</b><i className="cf-chip" aria-hidden="true" /></span>
      <span className="cf-num">{num}</span>
      <span className="cf-bot">
        <span><small>Name</small><b className="cf-name">{live ? c.name.trim().toUpperCase() || 'YOUR NAME' : c.name}</b></span>
        <span><small>Expires</small><b className="cf-exp">{live ? `${c.mm || 'MM'}/${c.yy || 'YY'}` : `${c.mm}/${c.yy}`}</b></span>
      </span>
    </div>
  );
}

/** The lock on the gate. Its shackle lifts and swings open when the password is right, and rattles when it is wrong. */
function Lock() {
  return (
    <svg className="lock" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      <path className="lock-sh" d="M8 11V6h8v5" />
      <rect className="lock-bd" x="4.5" y="11" width="15" height="10" fill="currentColor" />
      <path className="lock-key" d="M12 14.5v3.5" stroke="var(--g1)" />
    </svg>
  );
}

/** Stand-in cards shown blurred behind the lock. They are made up: your real cards are not on the page until the wallet is open. */
const STAND_IN = { brand: 'Card', num: '0000000000000000', name: 'Your name', mm: '12', yy: '30', img: '' };

export function WalletPage() {
  const { me, wallet, setWallet, notice, say } = useId_();
  const { errors, fail, clear, bad } = useErrors();
  const [adding, setAdding] = useState(false), [broken, setBroken] = useState(false), [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false), [nope, setNope] = useState(false);
  const rattle = () => { setNope(true); window.setTimeout(() => setNope(false), 500); };
  const [f, setF] = useState({ name: '', num: '', mm: '', yy: '' }), [photo, setPhoto] = useState('');
  const [up, setUp] = useState('');

  /* The wallet locks again when you leave this page. */
  useEffect(() => () => setWallet((w) => (w.cards ? { ...w, cards: null } : w)), [setWallet]);

  const open_ = wallet.cards !== null;
  const cards = wallet.cards ?? [];
  const save = async (next: Card[]) => { await seal(next); setWallet((w) => ({ ...w, cards: next })); };
  const stop = () => { setAdding(false); clear(); setF({ name: '', num: '', mm: '', yy: '' }); setPhoto(''); };

  /* Opens the wallet with your PMC ID password. A wrong password is counted: five misses in a row and you wait. */
  const unlock = async () => {
    if (busy) return;
    if (wallet.wait && Date.now() < wallet.wait) return void fail('wp', `Too many tries. Wait ${Math.ceil((wallet.wait - Date.now()) / 1000)} seconds.`);
    if (!up) return void fail('wp', 'Type your password.');
    setBusy(true);
    try {
      let ok = await testPassword(up);
      let sure = ok === true;
      if (!sure) {
        // No cards yet, or they do not open: ask PMC ID whether the password is right.
        try { await signIn(me?.email ?? '', up); sure = true; }
        catch (e) {
          if (e instanceof ApiError && (e.net || e.status === 429 || e.status >= 500)) return void fail('wp', sayErr(e));
        }
        if (sure && ok === false) { setBroken(true); return; }
        ok = sure;
      }
      if (!ok) {
        const fails = wallet.fails + 1;
        setWallet((w) => ({ ...w, fails, wait: fails >= 5 ? Date.now() + 30000 * Math.pow(2, fails - 5) : 0 }));
        rattle();
        return void fail('wp', fails >= 5 ? 'Too many tries. Wait a little and try again.' : 'That password is wrong.');
      }
      await unlockWithPassword(up);
      const c = await openWallet();
      setOpening(true);                                   // the lock opens and the blur clears, then the cards show
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      await new Promise((r) => window.setTimeout(r, calm ? 150 : 1050));
      setWallet({ cards: c, fails: 0, wait: 0 }); setUp(''); setOpening(false);
    } catch { setOpening(false); setBroken(true); } finally { setBusy(false); }
  };

  const addCard = () => {
    const name = f.name.trim(), num = f.num.replace(/\D/g, ''), now = new Date();
    if (!name) return void fail('cn', 'Type the name as it is on the card.');
    if (!(num.length >= 13 && luhn(num))) return void fail('cc', "That card number doesn't look right.");
    const okm = /^\d{2}$/.test(f.mm) && +f.mm >= 1 && +f.mm <= 12 && /^\d{2}$/.test(f.yy), exp = okm ? new Date(2000 + +f.yy, +f.mm, 1) : 0;
    if (!(okm && exp > now && +f.yy < (now.getFullYear() % 100) + 21)) return void fail('xm', "Type a date that hasn't passed: month, then year.");
    save([...cards, { id: 'c' + Date.now(), name, num, mm: f.mm, yy: f.yy, brand: brand(num), img: photo }]).then(() => { stop(); setAdding(false); say('Card saved in this browser.'); });
  };
  const removeCard = (id: string) => save(cards.filter((c) => c.id !== id)).then(() => say('Card removed.'));

  const onPhoto = (fl: File | undefined) => {
    setPhoto(''); if (!fl || !/^image\//.test(fl.type)) return;
    const im = new Image(), u = URL.createObjectURL(fl);
    im.onload = () => {
      const k = Math.min(1, 720 / im.width), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
      cv.getContext('2d')!.drawImage(im, 0, 0, cv.width, cv.height); setPhoto(cv.toDataURL('image/jpeg', 0.72)); URL.revokeObjectURL(u);
    };
    im.src = u;
  };

  if (broken) {
    return (
      <Panel title="Cards">
        <Rw label="Your saved cards can't be opened" icon="lock" hint="They were locked with an older password or a PIN. Remove them and add your cards again." act={<RowBtn label="Remove them" danger onClick={() => { clearCards(); void unlockWithPassword(up).then(() => { setBroken(false); setUp(''); setWallet({ cards: [], fails: 0, wait: 0 }); }); }} />} />
      </Panel>
    );
  }

  const live = { brand: brand(f.num.replace(/\D/g, '')), num: f.num.replace(/\D/g, ''), name: f.name, mm: f.mm, yy: f.yy, img: '' };
  return (
    <>
      <Panel title="Cards">
        {open_ ? (
          <>
            {cards.length ? (
              <div className="cards">
                {cards.map((c, i) => <div className="cardwrap" key={c.id}><CardFace c={c} i={i} /><div className="cw-act"><RowBtn label="Remove" onClick={() => removeCard(c.id)} /></div></div>)}
              </div>
            ) : null}
            {adding ? null : <Rw label="Add a card" icon="plus" hint={cards.length ? 'Saved in this browser with your others' : 'No cards saved yet'} act={<RowBtn label="Add" onClick={() => { say(''); setAdding(true); }} />} />}
            {adding ? (
              <form className="rw ed addform" data-form="card" noValidate onSubmit={(e) => { e.preventDefault(); addCard(); }}>
                <span className="rw-l">New card</span>
                <div className="rw-f">
                  <div className="vprev" aria-hidden="true"><CardFace c={live} i={0} live photo={photo} /></div>
                  <Field id="cn" label="Name on card" error={errors.cn}><input id="cn" autoComplete="cc-name" autoFocus value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); clear('cn'); }} {...bad('cn')} /></Field>
                  <Field id="cc" label="Card number" error={errors.cc}><input id="cc" inputMode="numeric" autoComplete="cc-number" maxLength={23} value={f.num} onChange={(e) => { setF({ ...f, num: spaced(e.target.value.replace(/\D/g, '').slice(0, 19)) }); clear('cc'); }} {...bad('cc')} /></Field>
                  <div className="f"><span className="lab" id="xl">Expires</span>
                    <div className="dob exp" role="group" aria-labelledby="xl">
                      <input id="xm" inputMode="numeric" maxLength={2} placeholder="MM" aria-label="Month" value={f.mm} {...bad('xm')} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setF({ ...f, mm: v }); clear('xm'); if (v.length === 2) document.getElementById('xy')?.focus(); }} />
                      <span className="sl">/</span>
                      <input id="xy" inputMode="numeric" maxLength={2} placeholder="YY" aria-label="Year" value={f.yy} onChange={(e) => { setF({ ...f, yy: e.target.value.replace(/\D/g, '') }); clear('xm'); }} />
                    </div>
                    {errors.xm ? <p className="err" role="alert">{errors.xm}</p> : null}
                  </div>
                  <div className="f"><label htmlFor="cp">Photo of the card front <small>Optional</small></label>
                    <input id="cp" type="file" accept="image/*" capture="environment" className="filein" onChange={(e) => onPhoto(e.target.files?.[0])} />
                    <p className="hint">Saved in this browser with your card. Leave it blank to use the card above.</p>
                  </div>
                  <div className="acts"><button className="btn" type="button" onClick={() => { stop(); }}>Cancel</button><button className="btn primary" type="submit">Save card</button></div>
                </div>
              </form>
            ) : null}
          </>
        ) : (
          <div className={'vault' + (opening ? ' opening' : '')}>
            <div className="vault-bg" aria-hidden="true" inert>
              <div className="vault-in">
                <div className="cards"><div className="cardwrap"><CardFace c={STAND_IN} i={0} /></div><div className="cardwrap"><CardFace c={STAND_IN} i={1} /></div></div>
                <div className="rw"><span className="rw-l"><span className="rw-t"><b>Add a card</b><small>Saved in this browser with your others</small></span></span></div>
              </div>
            </div>
            <form className={'vault-gate' + (opening ? ' open' : '') + (nope ? ' nope' : '')} noValidate onSubmit={(e) => { e.preventDefault(); void unlock(); }} aria-labelledby="vault-t">
              <span className="vault-ic" aria-hidden="true"><Lock /></span>
              <h3 id="vault-t">{opening ? 'Unlocked' : 'Your cards are locked'}</h3>
              <Field id="wp" label="Enter your PMC ID password" error={errors.wp}><PwInput id="wp" auto="current-password" value={up} onChange={(v) => { setUp(v); clear('wp'); }} invalid={!!errors.wp} /></Field>
              <button className="btn primary" type="submit" disabled={busy}>{opening ? 'Opening…' : busy ? 'Checking…' : 'Unlock'}</button>
            </form>
          </div>
        )}
        {open_ ? <p className="pnote"><Ic n="lock" s={16} />Saved in this browser only, never on our servers.</p> : null}
      </Panel>
      <Ok text={notice} />
      <Subscriptions />
    </>
  );
}

const day = (v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
/** What you pay for. Coe Pro is the only paid thing, and the rest are free. */
function Subscriptions() {
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);
  useEffect(() => { readPlan().then(setPlan).catch(() => setPlan(null)); }, []);
  const end = plan?.period_end ? Date.parse(plan.period_end) : 0;
  const live = !!plan && (plan.status === 'active' || plan.status === 'trialing' || plan.status === 'past_due' || (plan.status === 'canceled' && end > Date.now()));
  const hint = !plan || !live ? 'Free' : plan.status === 'past_due' ? 'Payment needed' : plan.status === 'canceled' ? `Ends ${day(plan.period_end as string)}` : end ? `Renews ${day(plan.period_end as string)}` : 'Active';
  return (
    <Panel title="Subscriptions">
      <Rw keep label="Coe" logo="coe" hint={plan === undefined ? 'Checking…' : hint} val={<span className="tag">{live ? 'Pro' : 'Free'}</span>} act={<a className="btn small" href="https://coe.pmcstudios.uk/plans/" target="_blank" rel="noopener">{live ? 'Manage' : 'See Pro'}</a>} />
      <Rw keep label="Coe Mini" logo="mini" hint="Uses your Coe plan" />
      <Rw keep label="PMC Tools" logo="tools" hint="Free, no plan needed" val={<span className="tag">Free</span>} />
    </Panel>
  );
}
