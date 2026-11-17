'use client';
import { useEffect, useState } from 'react';
import { Field, useErrors } from './form';
import { Ic } from './Ic';
import { EdRow, Ok, Panel, RowBtn, Rw } from './rows';
import { useId_ } from './state';
import { readPlan } from '@/lib/supabase';
import type { Plan } from '@/lib/supabase';
import { brand, luhn } from '@/lib/validate';
import { needsPin, open as openWallet, restoreKey, seal, wipeWallet } from '@/lib/wallet';
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

export function WalletPage() {
  const { wallet, setWallet, notice, say, signOut } = useId_();
  const { errors, fail, clear, bad } = useErrors();
  const [adding, setAdding] = useState(false), [settingPin, setSettingPin] = useState(false);
  const [pinOn, setPinOn] = useState(false), [ready, setReady] = useState(false), [keyOk, setKeyOk] = useState(true), [broken, setBroken] = useState(false);
  const [f, setF] = useState({ name: '', num: '', mm: '', yy: '' }), [photo, setPhoto] = useState('');
  const [p1, setP1] = useState(''), [p2, setP2] = useState(''), [up, setUp] = useState('');

  /* The wallet opens with the key made from your PMC ID password when you signed in. */
  useEffect(() => { let live = true; restoreKey().then((ok) => { if (!live) return; setKeyOk(ok); setPinOn(needsPin()); setReady(true); }); return () => { live = false; }; }, []);
  useEffect(() => {
    if (!ready || !keyOk || wallet.cards || (pinOn && wallet.pin === null)) return;
    let live = true;
    openWallet(wallet.pin).then((c) => live && setWallet((w) => ({ ...w, cards: c })), () => live && setBroken(true));
    return () => { live = false; };
  }, [ready, keyOk, pinOn, wallet.cards, wallet.pin, setWallet]);

  const locked = pinOn && wallet.pin === null && !wallet.cards && !broken;
  const cards = wallet.cards ?? [];
  const save = async (next: Card[], pin: string | null) => { await seal(next, pin); setWallet((w) => ({ ...w, cards: next, pin })); };
  const stop = () => { setAdding(false); setSettingPin(false); clear(); setF({ name: '', num: '', mm: '', yy: '' }); setPhoto(''); setP1(''); setP2(''); };

  const unlock = () => {
    if (wallet.wait && Date.now() < wallet.wait) return void fail('up', `Too many tries. Wait ${Math.ceil((wallet.wait - Date.now()) / 1000)} seconds.`);
    openWallet(up).then((c) => { setWallet({ cards: c, pin: up, fails: 0, wait: 0 }); setUp(''); }, () => {
      const fails = wallet.fails + 1;
      setWallet((w) => ({ ...w, fails, wait: fails >= 5 ? Date.now() + 30000 * Math.pow(2, fails - 5) : 0 }));
      fail('up', fails >= 5 ? 'Too many tries. Wait a little and try again.' : 'That PIN is wrong.');
    });
  };

  const addCard = () => {
    const name = f.name.trim(), num = f.num.replace(/\D/g, ''), now = new Date();
    if (!name) return void fail('cn', 'Type the name as it is on the card.');
    if (!(num.length >= 13 && luhn(num))) return void fail('cc', "That card number doesn't look right.");
    const okm = /^\d{2}$/.test(f.mm) && +f.mm >= 1 && +f.mm <= 12 && /^\d{2}$/.test(f.yy), exp = okm ? new Date(2000 + +f.yy, +f.mm, 1) : 0;
    if (!(okm && exp > now && +f.yy < (now.getFullYear() % 100) + 21)) return void fail('xm', "Type a date that hasn't passed: month, then year.");
    save([...cards, { id: 'c' + Date.now(), name, num, mm: f.mm, yy: f.yy, brand: brand(num), img: photo }], wallet.pin).then(() => { stop(); setAdding(false); say('Card saved in this browser.'); });
  };
  const savePin = () => {
    if (!/^\d{4,6}$/.test(p1)) return void fail('p1', 'Use 4 to 6 numbers.');
    if (p2 !== p1) return void fail('p2', "The two PINs don't match.");
    save(cards, p1).then(() => { setPinOn(true); stop(); say('PIN saved.'); });
  };
  const removePin = () => save(cards, null).then(() => { setPinOn(false); say('PIN removed.'); });
  const removeCard = (id: string) => save(cards.filter((c) => c.id !== id), wallet.pin).then(() => say('Card removed.'));

  const onPhoto = (fl: File | undefined) => {
    setPhoto(''); if (!fl || !/^image\//.test(fl.type)) return;
    const im = new Image(), u = URL.createObjectURL(fl);
    im.onload = () => {
      const k = Math.min(1, 720 / im.width), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
      cv.getContext('2d')!.drawImage(im, 0, 0, cv.width, cv.height); setPhoto(cv.toDataURL('image/jpeg', 0.72)); URL.revokeObjectURL(u);
    };
    im.src = u;
  };

  if (!ready) return null;
  if (!keyOk) {
    return (
      <Panel title="Wallet">
        <Rw label="Your wallet is locked" icon="lock" hint="Sign in again with your password to open it" act={<RowBtn label="Sign in again" onClick={() => void signOut('signin')} />} />
      </Panel>
    );
  }
  if (broken) {
    return (
      <Panel title="Wallet">
        <Rw label="Your saved cards can't be opened" icon="lock" hint="They were locked with an older password. Remove them and add your cards again." act={<RowBtn label="Remove them" danger onClick={() => { wipeWallet(); setBroken(false); setPinOn(false); setWallet({ cards: [], pin: null, fails: 0, wait: 0 }); }} />} />
      </Panel>
    );
  }
  if (locked) {
    return (
      <Panel title="Wallet">
        <EdRow label="PIN" form="unlock" saveLabel="Unlock" onCancel={() => undefined} onSubmit={unlock}>
          <Field id="up" label="Enter your wallet PIN" error={errors.up}><input id="up" type="password" inputMode="numeric" maxLength={6} autoComplete="off" autoFocus value={up} onChange={(e) => { setUp(e.target.value.replace(/\D/g, '')); clear('up'); }} {...bad('up')} /></Field>
        </EdRow>
      </Panel>
    );
  }

  const live = { brand: brand(f.num.replace(/\D/g, '')), num: f.num.replace(/\D/g, ''), name: f.name, mm: f.mm, yy: f.yy, img: '' };
  return (
    <>
      <Panel title="Cards">
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
        {settingPin ? (
          <EdRow label="Wallet PIN" form="pin" saveLabel="Save PIN" onCancel={stop} onSubmit={savePin}>
            <Field id="p1" label="New PIN" hint="4 to 6 numbers" error={errors.p1}><input id="p1" type="password" inputMode="numeric" maxLength={6} autoComplete="off" value={p1} onChange={(e) => { setP1(e.target.value.replace(/\D/g, '')); clear('p1'); }} {...bad('p1')} /></Field>
            <Field id="p2" label="Type it again" error={errors.p2}><input id="p2" type="password" inputMode="numeric" maxLength={6} autoComplete="off" value={p2} onChange={(e) => { setP2(e.target.value.replace(/\D/g, '')); clear('p2'); }} {...bad('p2')} /></Field>
          </EdRow>
        ) : (
          <Rw label="Wallet PIN" icon="lock" hint={pinOn ? 'Asked before your cards show' : 'Your PMC ID password locks the wallet'} val={pinOn ? <span className="tag">On</span> : null}
            act={pinOn ? <RowBtn label="Remove PIN" onClick={removePin} /> : <RowBtn label="Set a PIN" onClick={() => { say(''); setSettingPin(true); }} />} />
        )}
        <p className="pnote"><Ic n="lock" s={16} />Saved in this browser only, never on our servers.</p>
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
