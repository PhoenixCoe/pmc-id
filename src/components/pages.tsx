'use client';
import { useRef, useState } from 'react';
import { Av } from './chrome';
import { Dob, Field, Meter, PmcSelect, PwInput, useErrors } from './form';
import { Ic } from './Ic';
import { AppLogo } from './Logo';
import { EdRow, Ok, Panel, RowBtn, Rw } from './rows';
import { useId_ } from './state';
import { usePaint } from './toolkit';
import { hasWallet, wipeWallet } from '@/lib/wallet';
import { GENDERS, pad2, realDate, strength } from '@/lib/validate';

const dim = <span className="dim">Not set</span>;

/* ---------- Home ---------- */
const OPEN: { name: string; url: string; logo: 'coe' | 'mini' | 'tools'; hint: string }[] = [
  { name: 'Coe', url: 'https://coe.pmcstudios.uk/', logo: 'coe', hint: 'Chat, study and make things' },
  { name: 'Coe Mini', url: 'https://coe.pmcstudios.uk/about/', logo: 'mini', hint: 'Coe in your browser, beside any page' },
  { name: 'PMC Tools', url: 'https://tools.pmcstudios.uk/', logo: 'tools', hint: 'Free tools for everyday jobs' },
];
export function HomePage() {
  const { me, wallet } = useId_();
  usePaint('.me', me?.img ?? '', true);
  if (!me) return null;
  const todo: [string, string, string][] = [];
  if (!me.dob) todo.push(['Add your birthday', '#info', 'cake']);
  if (!me.gender) todo.push(['Add your gender', '#info', 'tag']);
  if (!wallet.pin && hasWallet()) todo.push(['Set a wallet PIN', '#wallet', 'lock']);
  return (
    <>
      <section className="me" aria-label="You">
        <span className="dots" aria-hidden="true"><i /><i /></span>
        <Av u={me} /><span className="who"><b>{me.name}</b><small>{me.email}</small></span>
        <a className="btn-ic pen" href="#info" aria-label="Change your name and picture"><Ic n="pen" /></a>
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
          {todo.map(([t, href, icon]) => (
            <a key={t} className="rw todo-r" href={href}>
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
  const { me, setMe, notice, say } = useId_();
  const [ed, setEd] = useState<'name' | 'dob' | 'gender' | null>(null);
  const { errors, fail, clear, bad } = useErrors();
  const file = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ first: me?.first ?? '', last: me?.last ?? '' });
  const [b, setB] = useState(() => { const p = (me?.dob ?? '').split('/'); return { d: p[0] ?? '', m: p[1] ?? '', y: p[2] ?? '' }; });
  const [g, setG] = useState(me?.gender ?? '');
  if (!me) return null;
  const open = (k: 'name' | 'dob' | 'gender') => { say(''); clear(); setEd(k); };
  const done = (patch: Partial<typeof me>) => { setMe({ ...me, ...patch }); say('Saved.'); setEd(null); };

  const onFile = (fl: File | undefined) => {
    if (!fl) return;
    if (!/^image\//.test(fl.type) || fl.size > 4e6) { say('Pick a picture under 4 MB.'); return; }
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'), s = Math.min(im.width, im.height), n = 256; c.width = c.height = n;
        c.getContext('2d')!.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, n, n);
        setMe({ ...me, img: c.toDataURL('image/png') }); say('Picture changed.');
      };
      im.src = String(r.result);
    };
    r.readAsDataURL(fl);
  };

  return (
    <>
      <Panel title="Your info">
        <Rw label="Picture" icon="image" hint="Shown next to your name in PMC apps" val={<Av u={me} />}
          act={<span className="btns"><RowBtn label="Change" onClick={() => file.current?.click()} />{me.img ? <RowBtn label="Remove" onClick={() => { setMe({ ...me, img: '' }); say('Picture removed.'); }} /> : null}</span>} />
        {ed === 'name' ? (
          <EdRow label="Name" form="name" onCancel={() => setEd(null)} onSubmit={() => {
            const fn = f.first.trim(); if (!fn) return void fail('fn', 'Type your first name.');
            done({ first: fn, last: f.last.trim(), name: `${fn} ${f.last.trim()}`.trim() });
          }}>
            <div className="row2">
              <Field id="fn" label="First name" error={errors.fn}><input id="fn" autoFocus value={f.first} onChange={(e) => { setF({ ...f, first: e.target.value }); clear('fn'); }} {...bad('fn')} /></Field>
              <Field id="ln" label="Last name" hint="optional"><input id="ln" value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} /></Field>
            </div>
          </EdRow>
        ) : <Rw label="Name" icon="user" hint="What PMC apps call you" val={me.name} act={<RowBtn label="Change" onClick={() => open('name')} />} />}
        {ed === 'dob' ? (
          <EdRow label="Birthday" form="dob" onCancel={() => setEd(null)} onSubmit={() => {
            if (!realDate(b.d, b.m, b.y)) return void fail('dd', 'Type a real date: day, month, then the full year.');
            done({ dob: `${pad2(+b.d)}/${pad2(+b.m)}/${b.y}` });
          }}>
            <div className="f"><Dob d={b.d} m={b.m} y={b.y} set={(k, v) => { setB({ ...b, [k]: v }); clear('dd'); }} invalid={!!errors.dd} />{errors.dd ? <p className="err" role="alert">{errors.dd}</p> : null}</div>
          </EdRow>
        ) : <Rw label="Birthday" icon="cake" hint="Keeps PMC apps right for your age" val={me.dob || dim} act={<RowBtn label={me.dob ? 'Change' : 'Add'} onClick={() => open('dob')} />} />}
        {ed === 'gender' ? (
          <EdRow label="Gender" form="gender" onCancel={() => setEd(null)} onSubmit={() => { if (!g) return void fail('gen-btn', 'Pick one. "Rather not say" is fine.'); done({ gender: g }); }}>
            <div className="f"><PmcSelect id="gen" placeholder="Choose one" options={GENDERS} value={g} onPick={(v) => { setG(v); clear(); }} invalid={!!errors['gen-btn']} />{errors['gen-btn'] ? <p className="err" role="alert">{errors['gen-btn']}</p> : null}</div>
          </EdRow>
        ) : <Rw label="Gender" icon="tag" hint="Only used for how apps talk to you" val={me.gender || dim} act={<RowBtn label={me.gender ? 'Change' : 'Add'} onClick={() => open('gender')} />} />}
        <Rw label="Email" icon="mail" hint="You sign in with this" val={me.email} />
        <input id="file" ref={file} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </Panel>
      <Ok text={notice} />
    </>
  );
}

/* ---------- Security ---------- */
export function SecurityPage() {
  const { devices, setDevices, notice, say } = useId_();
  const [ed, setEd] = useState(false);
  const { errors, fail, clear } = useErrors();
  const [p0, setP0] = useState(''), [p1, setP1] = useState(''), [p2, setP2] = useState('');
  const submit = () => {
    if (!p0) return void fail('pw0', 'Type your current password.');
    if (strength(p1) < 3) return void fail('pw', 'Make it stronger: the bar needs to reach the third step.');
    if (p1 !== p2) return void fail('pw2', "The two passwords don't match.");
    say('Password changed.'); setEd(false); setP0(''); setP1(''); setP2('');
  };
  return (
    <>
      <Panel title="How you sign in">
        {ed ? (
          <EdRow label="Password" form="pw" onCancel={() => { setEd(false); clear(); }} onSubmit={submit}>
            <Field id="pw0" label="Current password" error={errors.pw0}><PwInput id="pw0" auto="current-password" value={p0} onChange={(v) => { setP0(v); clear('pw0'); }} invalid={!!errors.pw0} /></Field>
            <Field id="pw" label="New password" error={errors.pw}><PwInput id="pw" auto="new-password" value={p1} onChange={(v) => { setP1(v); clear('pw'); }} invalid={!!errors.pw} /></Field>
            <Meter value={p1} />
            <Field id="pw2" label="Type it again" error={errors.pw2}><PwInput id="pw2" auto="new-password" value={p2} onChange={(v) => { setP2(v); clear('pw2'); }} invalid={!!errors.pw2} /></Field>
          </EdRow>
        ) : <Rw label="Password" icon="key" hint="Your PMC ID password also locks your wallet" val={<span className="dots-t" aria-hidden="true">••••••••••</span>} act={<RowBtn label="Change" onClick={() => { say(''); setEd(true); }} />} />}
      </Panel>
      <Ok text={notice} />
      <Panel title="Where you are signed in">
        {devices.map((d) => (
          <Rw key={d.id} label={d.name} icon={/phone|android|iphone/i.test(d.name) ? 'mobile' : 'laptop'} hint={d.when}
            act={d.cur ? <span className="tag">This device</span> : <RowBtn label="Sign out" onClick={() => { setDevices(devices.filter((x) => x.id !== d.id)); say('Signed out of that device.'); }} />} />
        ))}
      </Panel>
    </>
  );
}

/* ---------- Linked apps ---------- */
export function AppsPage() {
  const { linked, setLinked, notice, say } = useId_();
  return (
    <>
      <Panel title="Apps using your PMC ID">
        {linked.length ? linked.map((a) => (
          <Rw key={a.id} label={a.name} logo={a.id} hint={a.when} act={<RowBtn label="Remove access" onClick={() => { setLinked(linked.filter((x) => x.id !== a.id)); say(`${a.name} can no longer use your PMC ID.`); }} />} />
        )) : <p className="pempty">No apps use your PMC ID yet. Sign in to a PMC app and it shows up here.</p>}
      </Panel>
      <Ok text={notice} />
    </>
  );
}

/* ---------- Data and privacy ---------- */
export function DataPage() {
  const { me, setMe, others, setOthers, linked, resetWallet, notice, say, go } = useId_();
  const [del, setDel] = useState(false), [typed, setTyped] = useState('');
  const { errors, fail, clear } = useErrors();
  if (!me) return null;
  const download = () => {
    const o = { name: me.name, email: me.email, birthday: me.dob, gender: me.gender, linkedApps: linked.map((x) => x.name) };
    const u = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' })), l = document.createElement('a');
    l.href = u; l.download = 'my-pmc-id-data.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 500);
    say('Your file is downloading.');
  };
  const remove = () => {
    if (typed.trim().toLowerCase() !== me.email.toLowerCase()) return void fail('dm', 'Type your email exactly to confirm.');
    resetWallet(); wipeWallet();
    if (others.length) { setMe(others[0]); setOthers(others.slice(1)); go('choose'); } else { setMe(null); go('create-1'); }
  };
  return (
    <>
      <Panel title="Your data"><Rw label="Download your data" icon="download" hint="Name, email, birthday and linked apps, as a file" act={<RowBtn label="Download" onClick={download} />} /></Panel>
      <Ok text={notice} />
      <Panel title="Delete">
        {del ? (
          <form className="rw ed" data-form="del" noValidate onSubmit={(e) => { e.preventDefault(); remove(); }}>
            <span className="rw-l">Delete</span>
            <div className="rw-f">
              <p className="warn">This removes your PMC ID and everything on it. It can&apos;t be undone.</p>
              <Field id="dm" label={`Type ${me.email} to confirm`} error={errors.dm}><input id="dm" autoComplete="off" spellCheck={false} autoFocus value={typed} onChange={(e) => { setTyped(e.target.value); clear('dm'); }} aria-invalid={!!errors.dm || undefined} /></Field>
              <div className="acts"><RowBtn label="Cancel" onClick={() => { setDel(false); clear(); }} /><button className="btn danger" type="submit">Delete my PMC ID</button></div>
            </div>
          </form>
        ) : <Rw label="Delete your PMC ID" icon="trash" hint="Removes your account and everything on it" act={<RowBtn label="Delete…" danger onClick={() => { say(''); setDel(true); }} />} />}
      </Panel>
    </>
  );
}
