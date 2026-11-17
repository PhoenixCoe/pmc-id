'use client';
import { useEffect, useRef, useState } from 'react';
import { Av } from './chrome';
import { Dob, Field, Meter, PmcSelect, PwInput, useErrors } from './form';
import { Ic } from './Ic';
import { AppLogo } from './Logo';
import { EdRow, Ok, Panel, RowBtn, Rw } from './rows';
import { useId_ } from './state';
import { usePaint } from './toolkit';
import { exportData, deleteMe, fileToPic, getUser, readStamps, reauthenticate, sayErr, signIn, saveSession, toSession, authed, signOutOf } from '@/lib/supabase';
import type { ApiError } from '@/lib/supabase';
import { forget } from '@/lib/saved';
import { changePassword as rewrapWallet, hasWallet, needsPin, wipeWallet } from '@/lib/wallet';
import { keyToPath, linkClick } from '@/lib/route';
import { GENDERS, pad2, realDate, strength } from '@/lib/validate';

const dim = <span className="dim">Not set</span>;

/* ---------- Home ---------- */
const OPEN: { name: string; url: string; logo: 'coe' | 'mini' | 'tools'; hint: string }[] = [
  { name: 'Coe', url: 'https://coe.pmcstudios.uk/', logo: 'coe', hint: 'Chat, study and make things' },
  { name: 'Coe Mini', url: 'https://coe.pmcstudios.uk/about/', logo: 'mini', hint: 'Coe in your browser, beside any page' },
  { name: 'PMC Tools', url: 'https://tools.pmcstudios.uk/', logo: 'tools', hint: 'Free tools for everyday jobs' },
];
export function HomePage() {
  const { me, wallet, apps } = useId_();
  usePaint('.hero', me?.img ?? '', true);
  if (!me) return null;
  const used = apps.filter((a) => a.last_at);
  const todo: [string, string, string][] = [];
  if (!me.dob) todo.push(['Add your birthday', 'info', 'cake']);
  if (!wallet.pin && hasWallet() && !needsPin()) todo.push(['Set a wallet PIN', 'wallet', 'lock']);
  const rows: [string, string, string, string][] = [
    ['info', 'Personal info', me.name, 'user'],
    ['security', 'Security', 'Password', 'lock'],
    ['apps', 'Linked apps', used.length === 1 ? '1 app' : `${used.length} apps`, 'link'],
    ['wallet', 'Wallet', wallet.cards ? (wallet.cards.length === 1 ? '1 card' : `${wallet.cards.length} cards`) : hasWallet() ? 'Locked' : 'No cards', 'wallet'],
  ];
  return (
    <>
      <section className="hero" aria-label="You">
        <span className="dots" aria-hidden="true"><i /><i /><i /></span>
        <Av u={me} />
        <span className="who"><small>Welcome,</small><b>{me.first || me.name}</b><span>{me.email}</span></span>
      </section>
      <section className="panel"><h2>Your PMC ID</h2>
        {rows.map(([k, t, v, ic]) => (
          <a key={k} className="rw todo-r" href={keyToPath(k)} onClick={(e) => linkClick(e, k)}>
            <span className="rw-l"><span className="rw-ic" aria-hidden="true"><Ic n={ic} s={20} /></span><span className="rw-t"><b>{t}</b><small>{v}</small></span></span><span /><span className="go"><Ic n="arrow" s={18} /></span>
          </a>
        ))}
      </section>
      <section className="panel"><h2>Open an app</h2>
        {OPEN.map((a) => (
          <a key={a.name} className="rw todo-r" href={a.url} target="_blank" rel="noopener">
            <span className="rw-l"><AppLogo id={a.logo} /><span className="rw-t"><b>{a.name}</b><small>{a.hint}</small></span></span><span /><span className="go"><Ic n="external" s={18} /></span>
          </a>
        ))}
      </section>
      {todo.length ? (
        <section className="panel"><h2>To finish</h2>
          {todo.map(([t, k, icon]) => (
            <a key={t} className="rw todo-r" href={keyToPath(k)} onClick={(e) => linkClick(e, k)}>
              <span className="rw-l"><span className="rw-ic" aria-hidden="true"><Ic n={icon} s={20} /></span><span className="rw-t"><b>{t}</b></span></span><span /><span className="go"><Ic n="arrow" s={18} /></span>
            </a>
          ))}
        </section>
      ) : null}
    </>
  );
}

/* ---------- Info ---------- */
export function InfoPage() {
  const { me, saveProfile, notice, say } = useId_();
  const [ed, setEd] = useState<'name' | 'dob' | 'gender' | null>(null);
  const [busy, setBusy] = useState(false);
  const { errors, fail, clear, bad } = useErrors();
  const file = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ first: me?.first ?? '', last: me?.last ?? '' });
  const [b, setB] = useState(() => { const p = (me?.dob ?? '').split('/'); return { d: p[0] ?? '', m: p[1] ?? '', y: p[2] ?? '' }; });
  const [g, setG] = useState(me?.gender ?? '');
  if (!me) return null;
  const open = (k: 'name' | 'dob' | 'gender') => { say(''); clear(); setEd(k); };
  /* Saves to the account. Coe and Coe Mini read the same name and picture. */
  const save = async (patch: Parameters<typeof saveProfile>[0], msg: string, failId = 'form') => {
    if (busy) return; setBusy(true);
    try { await saveProfile(patch); say(msg); setEd(null); } catch (e) { fail(failId, sayErr(e)); say(''); }
    setBusy(false);
  };
  const onFile = (fl: File | undefined) => {
    if (!fl) return;
    fileToPic(fl).then((img) => save({ img }, 'Picture changed.'), (e: Error) => say(e.message));
  };

  return (
    <>
      <Panel title="Your info">
        <Rw label="Picture" icon="image" hint="Shown next to your name in PMC apps" val={<Av u={me} />}
          act={<span className="btns"><RowBtn label="Change" onClick={() => file.current?.click()} />{me.img ? <RowBtn label="Remove" onClick={() => void save({ img: '' }, 'Picture removed.')} /> : null}</span>} />
        {ed === 'name' ? (
          <EdRow label="Name" form="name" onCancel={() => setEd(null)} onSubmit={() => {
            const fn = f.first.trim(); if (!fn) return void fail('fn', 'Type your first name.');
            void save({ name: fn.slice(0, 30), last: f.last.trim().slice(0, 30) }, 'Saved.', 'fn');
          }}>
            <div className="row2">
              <Field id="fn" label="First name" error={errors.fn}><input id="fn" autoFocus maxLength={30} value={f.first} onChange={(e) => { setF({ ...f, first: e.target.value }); clear('fn'); }} {...bad('fn')} /></Field>
              <Field id="ln" label="Last name" hint="optional"><input id="ln" maxLength={30} value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} /></Field>
            </div>
          </EdRow>
        ) : <Rw label="Name" icon="user" hint="What PMC apps call you" val={me.name} act={<RowBtn label="Change" onClick={() => open('name')} />} />}
        {ed === 'dob' ? (
          <EdRow label="Birthday" form="dob" onCancel={() => setEd(null)} onSubmit={() => {
            if (!realDate(b.d, b.m, b.y)) return void fail('dd', 'Type a real date: day, month, then the full year.');
            void save({ dob: `${pad2(+b.d)}/${pad2(+b.m)}/${b.y}` }, 'Saved.', 'dd');
          }}>
            <div className="f"><Dob d={b.d} m={b.m} y={b.y} set={(k, v) => { setB({ ...b, [k]: v }); clear('dd'); }} invalid={!!errors.dd} />{errors.dd ? <p className="err" role="alert">{errors.dd}</p> : null}</div>
          </EdRow>
        ) : <Rw label="Birthday" icon="cake" hint="Keeps PMC apps right for your age" val={me.dob || dim} act={<RowBtn label={me.dob ? 'Change' : 'Add'} onClick={() => open('dob')} />} />}
        {ed === 'gender' ? (
          <EdRow label="Gender" form="gender" onCancel={() => setEd(null)} onSubmit={() => { if (!g) return void fail('gen-btn', 'Pick one. "Rather not say" is fine.'); void save({ gender: g }, 'Saved.', 'gen-btn'); }}>
            <div className="f"><PmcSelect id="gen" placeholder="Choose one" options={GENDERS} value={g} onPick={(v) => { setG(v); clear(); }} invalid={!!errors['gen-btn']} />{errors['gen-btn'] ? <p className="err" role="alert">{errors['gen-btn']}</p> : null}</div>
          </EdRow>
        ) : <Rw label="Gender" icon="tag" hint="Optional. Never changes what you see" val={me.gender || dim} act={<RowBtn label={me.gender ? 'Change' : 'Add'} onClick={() => open('gender')} />} />}
        <Rw label="Email" icon="mail" hint="You sign in with this" val={me.email} />
        <input id="file" ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </Panel>
      {errors.form ? <p className="err pgerr" role="alert">{errors.form}</p> : null}
      <Ok text={notice} />
    </>
  );
}

/* ---------- Security ---------- */
const browser = () => {
  const ua = navigator.userAgent || '';
  const b = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\/|CriOS/.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'This browser';
  const o = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iPhone or iPad' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : '';
  return { name: o ? `${b} on ${o}` : b, phone: /Android|iPhone|iPad|iPod/.test(ua) };
};

export function SecurityPage() {
  const { me, notice, say, signOut } = useId_();
  /* Changing a password takes two checks: the password you have now, and a code we email you. */
  const [ed, setEd] = useState<'a' | 'b' | null>(null), [busy, setBusy] = useState(false);
  const { errors, fail, clear } = useErrors();
  const [p0, setP0] = useState(''), [p1, setP1] = useState(''), [p2, setP2] = useState(''), [code, setCode] = useState('');
  const [dev, setDev] = useState({ name: 'This browser', phone: false });
  useEffect(() => setDev(browser()), []);
  const stop = () => { setEd(null); clear(); setP0(''); setP1(''); setP2(''); setCode(''); };
  const submit = async () => {
    if (busy || !me) return;
    if (ed === 'a') {
      if (!p0) return void fail('pw0', 'Type your current password.');
      if (strength(p1) < 3) return void fail('pw', 'Make it stronger: the bar needs to reach the third step.');
      if (p1 === p0) return void fail('pw', 'Choose a different password from the one you have now.');
      if (p1 !== p2) return void fail('pw2', "The two passwords don't match.");
      setBusy(true);
      try { const r = await signIn(me.email, p0); saveSession(toSession(r, me.email)); await reauthenticate(); setEd('b'); clear(); }
      catch (e) { fail((e as ApiError).code === 'invalid_credentials' ? 'pw0' : 'form', (e as ApiError).code === 'invalid_credentials' ? 'That is not your current password.' : sayErr(e)); }
      setBusy(false); return;
    }
    if (!/^\d{6}$/.test(code)) return void fail('code', 'Type the 6 numbers from the email.');
    setBusy(true);
    try {
      await authed('/auth/v1/user', { method: 'PUT', body: { password: p1, current_password: p0, nonce: code, data: { pw_changed_at: new Date().toISOString() } } });
      await signOutOf('others');
      await rewrapWallet(p1).catch(() => undefined);
      stop(); say('Password changed. Your other devices were signed out.');
    } catch (e) {
      const x = e as ApiError;
      if (x.code === 'reauthentication_not_valid' || x.code === 'otp_expired' || (x.status === 422 && /reauth|nonce|code/i.test(x.msg))) fail('code', 'That code is wrong or has expired. Use the newest email.');
      else if (x.code === 'weak_password' || x.code === 'same_password') { setEd('a'); fail('form', sayErr(e)); }
      else fail('form', sayErr(e));
    }
    setBusy(false);
  };
  const others = async () => { setBusy(true); await signOutOf('others'); setBusy(false); say('Signed out of every other device.'); };
  return (
    <>
      <Panel title="How you sign in">
        {ed ? (
          <EdRow label="Password" form="pw" saveLabel={ed === 'a' ? 'Email me a code' : 'Change password'} onCancel={stop} onSubmit={() => void submit()}>
            {ed === 'a' ? (
              <>
                <Field id="pw0" label="Current password" error={errors.pw0}><PwInput id="pw0" auto="current-password" value={p0} onChange={(v) => { setP0(v); clear('pw0'); }} invalid={!!errors.pw0} /></Field>
                <Field id="pw" label="New password" error={errors.pw}><PwInput id="pw" auto="new-password" value={p1} onChange={(v) => { setP1(v); clear('pw'); }} invalid={!!errors.pw} /></Field>
                <Meter value={p1} />
                <Field id="pw2" label="Type it again" error={errors.pw2}><PwInput id="pw2" auto="new-password" value={p2} onChange={(v) => { setP2(v); clear('pw2'); }} invalid={!!errors.pw2} /></Field>
              </>
            ) : (
              <>
                <p className="hint">We emailed a code to <b>{me?.email}</b>. Type it to finish.</p>
                <Field id="code" label="Code" error={errors.code}><input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); clear('code'); }} aria-invalid={!!errors.code || undefined} /></Field>
              </>
            )}
            {errors.form ? <p className="err" role="alert">{errors.form}</p> : null}
          </EdRow>
        ) : <Rw label="Password" icon="key" hint="Your PMC ID password also locks your wallet" val={<span className="dots-t" aria-hidden="true">••••••••••</span>} act={<RowBtn label="Change" onClick={() => { say(''); setEd('a'); }} />} />}
      </Panel>
      <Ok text={notice} />
      <Panel title="Where you are signed in">
        <Rw label={dev.name} icon={dev.phone ? 'mobile' : 'laptop'} hint="Active now" act={<span className="btns"><span className="tag">This device</span><RowBtn label="Sign out" onClick={() => void signOut('choose')} /></span>} />
        <Rw label="Every other device" icon="lock" hint="Ends your PMC ID sign in on all of them" act={<RowBtn label="Sign them out" onClick={() => void others()} />} />
      </Panel>
      <RecentActivity />
    </>
  );
}

/* ---------- Linked apps ---------- */
const PMC_APPS: { app: 'coe' | 'mini' | 'tools'; label: string }[] = [{ app: 'coe', label: 'Coe' }, { app: 'mini', label: 'Coe Mini' }, { app: 'tools', label: 'PMC Tools' }];
const day = (v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export function AppsPage() {
  const { apps } = useId_();
  const rows = [...apps];
  PMC_APPS.forEach((a) => { if (!rows.some((r) => r.app === a.app || (a.app === 'tools' && r.app === 'apps'))) rows.push({ app: a.app, label: a.label, pmc: true, last_at: null }); });
  rows.sort((x, y) => (y.last_at ? 1 : 0) - (x.last_at ? 1 : 0) || String(y.last_at ?? '').localeCompare(String(x.last_at ?? '')));
  return (
    <Panel title="Apps using your PMC ID">
      {rows.map((r) => {
        const logo = r.app === 'coe' || r.app === 'mini' ? r.app : r.app === 'tools' || r.app === 'apps' ? 'tools' : undefined;
        return <Rw key={r.app} label={r.label} logo={logo} icon={logo ? undefined : 'link'} hint={r.last_at ? `Last used ${day(r.last_at)}` : 'Not used yet'} val={r.pmc ? null : <span className="tag">Not PMC</span>} />;
      })}
    </Panel>
  );
}

/* ---------- Data and privacy ---------- */
export function DataPage() {
  const { me, notice, say, signOut } = useId_();
  const [del, setDel] = useState(false), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false);
  const { errors, fail, clear } = useErrors();
  if (!me) return null;
  const download = async () => {
    if (busy) return; setBusy(true); say('');
    try {
      const o = await exportData();
      const u = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' })), l = document.createElement('a');
      l.href = u; l.download = 'pmc-id-data.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      say('Your file is downloading.');
    } catch (e) { say(sayErr(e)); }
    setBusy(false);
  };
  const remove = async () => {
    if (busy) return;
    if (typed.trim().toLowerCase() !== me.email.toLowerCase()) return void fail('dm', 'Type your email exactly to confirm.');
    setBusy(true);
    try {
      await deleteMe(); wipeWallet(); forget(me.email);
      await signOut('signin');
    } catch (e) {
      const x = e as ApiError;
      fail('dm', /pro|plan/i.test(x.msg) ? 'You have a Pro plan. Cancel it in Coe (Plans, then Manage plan), then delete your PMC ID.' : x.status === 404 ? "Deleting isn't available right now. Try again later." : sayErr(e));
      setBusy(false);
    }
  };
  return (
    <>
      <Panel title="Your data"><Rw label="Download your data" icon="download" hint="Name, email, birthday, linked apps and chats, as a file" act={<RowBtn label={busy && !del ? 'Getting it ready…' : 'Download'} onClick={() => void download()} />} /></Panel>
      <Ok text={notice} />
      <Panel title="Delete">
        {del ? (
          <form className="rw ed" data-form="del" noValidate onSubmit={(e) => { e.preventDefault(); void remove(); }}>
            <span className="rw-l">Delete</span>
            <div className="rw-f">
              <p className="warn">This removes your PMC ID and everything on it. It can&apos;t be undone.</p>
              <Field id="dm" label={`Type ${me.email} to confirm`} error={errors.dm}><input id="dm" autoComplete="off" spellCheck={false} autoFocus value={typed} onChange={(e) => { setTyped(e.target.value); clear('dm'); }} aria-invalid={!!errors.dm || undefined} /></Field>
              <div className="acts"><RowBtn label="Cancel" onClick={() => { setDel(false); clear(); }} /><button className="btn danger" type="submit" disabled={busy}>{busy ? 'Deleting…' : 'Delete my PMC ID'}</button></div>
            </div>
          </form>
        ) : <Rw label="Delete your PMC ID" icon="trash" hint="Removes your account and everything on it" act={<RowBtn label="Delete…" danger onClick={() => { say(''); setDel(true); }} />} />}
      </Panel>
    </>
  );
}

/* ---------- Activity ---------- */
const when = (t: number) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
interface Ev { at: number; t: string; icon: string }
function RecentActivity() {
  const { apps } = useId_();
  const [ev, setEv] = useState<Ev[] | null>(null), [bad, setBad] = useState(false);
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const [u, st] = await Promise.all([getUser(), readStamps().catch(() => ({ name: 0, img: 0 }))]);
        const list: Ev[] = [];
        const add = (v: unknown, t: string, icon: string) => { const at = typeof v === 'number' ? v : Date.parse(String(v || '')); if (at > 0) list.push({ at, t, icon }); };
        add(u.created_at, 'PMC ID made', 'user');
        add(u.last_sign_in_at, 'Signed in', 'key');
        add(u.user_metadata?.pw_changed_at, 'Password changed', 'lock');
        add(st.name, 'Name changed', 'pen');
        add(st.img, 'Picture changed', 'image');
        apps.forEach((a) => add(a.first_at, `Started using ${a.label}`, 'link'));
        list.sort((a, b) => b.at - a.at);
        if (on) setEv(list.slice(0, 30));
      } catch { if (on) setBad(true); }
    })();
    return () => { on = false; };
  }, [apps]);
  return (
    <Panel title="Recent activity">
      {bad ? <p className="hint">This could not be loaded. Try again in a moment.</p> : ev === null ? <p className="hint">Loading…</p> : ev.map((e) => <Rw key={e.t + e.at} label={e.t} icon={e.icon} hint={when(e.at)} />)}
    </Panel>
  );
}

