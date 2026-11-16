'use client';
import { useEffect, useRef, useState } from 'react';
import { AuthCard, Acts, Av, BackLink } from './chrome';
import { CodeBoxes, Dob, Field, Meter, PmcSelect, PwInput, useErrors } from './form';
import { Ic } from './Ic';
import { useId_, EMPTY_DRAFT } from './state';
import { EMAIL, GENDERS, pad2, realDate, strength } from '@/lib/validate';

/* ---------- Choose an account ---------- */
export function Choose() {
  const { me } = useId_();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', h); return () => document.removeEventListener('pointerdown', h);
  }, [open]);
  if (!me) return null;
  return (
    <AuthCard title="Choose an account" onSubmit={() => undefined}>
      <h2>Use your PMC ID</h2><p className="lead">to carry on to Coe</p>
      <div className="acc-wrap" ref={wrap} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
        <a className="acc" href="#home"><Av u={me} /><span className="who"><b>{me.name}</b><small>{me.email}</small></span></a>
        <button className="more" type="button" aria-label={`More for ${me.email}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}><Ic n="more" /></button>
        <div className="more-pop" role="menu" hidden={!open}>
          <button type="button" role="menuitem" onClick={() => { location.hash = 'signin'; }}><Ic n="trash" s={18} />Remove from this browser</button>
        </div>
      </div>
      <a className="another" href="#signin"><Ic n="plus" />Use another account</a>
      <p className="or">or</p><p className="mid"><a className="textlink" href="#create-1">Create a PMC ID</a></p>
    </AuthCard>
  );
}

/* ---------- Sign in with another account ---------- */
export function SignIn() {
  const { me, setMe, go } = useId_();
  const { errors, fail, clear, bad } = useErrors();
  const [em, setEm] = useState(''), [pw, setPw] = useState('');
  const emRef = useRef<HTMLInputElement>(null);
  useEffect(() => emRef.current?.focus(), []);
  const submit = () => {
    if (!EMAIL.test(em.trim())) return void fail('em', 'Type the email you signed up with.');
    if (!pw) return void fail('pw', 'Type your password.');
    setMe({ name: me?.name ?? 'You', first: me?.first ?? 'You', last: '', email: em.trim(), img: '', dob: '', gender: '' }); go('home');
  };
  return (
    <AuthCard title="Sign in" onSubmit={submit}>
      <h2>Sign in to PMC ID</h2>
      <Field id="em" label="Email" error={errors.em}><input id="em" ref={emRef} type="email" autoComplete="username" spellCheck={false} value={em} onChange={(e) => { setEm(e.target.value); clear('em'); }} {...bad('em')} /></Field>
      <Field id="pw" label="Password" error={errors.pw}><PwInput id="pw" auto="current-password" value={pw} onChange={(v) => { setPw(v); clear('pw'); }} invalid={!!errors.pw} /></Field>
      <p><a className="textlink" href="#reset">Forgot your password?</a></p>
      <Acts back={<BackLink to="choose" />} label="Sign in" />
    </AuthCard>
  );
}

export function Reset() {
  const { draft, setDraft, go } = useId_();
  const { errors, fail, clear, bad } = useErrors();
  const [em, setEm] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const submit = () => {
    const v = em.trim(); if (!EMAIL.test(v)) return void fail('em', "That doesn't look like an email address.");
    setDraft({ ...draft, email: v, reset: true }); go('create-4');
  };
  return (
    <AuthCard title="Reset your password" onSubmit={submit}>
      <h2>Forgot your password?</h2><p className="lead">We&apos;ll email you a code to make a new one.</p>
      <Field id="em" label="Email" error={errors.em}><input id="em" ref={ref} type="email" autoComplete="username" spellCheck={false} value={em} onChange={(e) => { setEm(e.target.value); clear('em'); }} {...bad('em')} /></Field>
      <Acts back={<BackLink to="signin" />} label="Send code" />
    </AuthCard>
  );
}

/* ---------- Create a PMC ID: six steps ---------- */
export function Create({ n }: { n: number }) {
  const { draft, setDraft, setMe, go } = useId_();
  const { errors, fail, clear, bad } = useErrors();
  const [v, setV] = useState({ first: draft.first, last: draft.last, d: draft.d, m: draft.m, y: draft.y, gender: draft.gender, email: draft.email });
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState('');
  const [codeKey, setCodeKey] = useState(0), [sent, setSent] = useState('');
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (n === 1 || n === 3) first.current?.focus(); }, [n]);
  useEffect(() => { if (n > 1 && !draft.first && !draft.reset) go('create-1'); }, [n, draft.first, draft.reset, go]);
  const set = (k: keyof typeof v) => (val: string) => { setV((s) => ({ ...s, [k]: val })); clear(); };
  const reset = draft.reset;
  const finish = () => { setDraft(EMPTY_DRAFT); go('home'); };

  const next = (code?: string) => {
    if (n === 1) { const fn = v.first.trim(); if (!fn) return void fail('fn', 'Type your first name.'); setDraft({ ...draft, first: fn, last: v.last.trim() }); }
    if (n === 2) {
      if (!realDate(v.d, v.m, v.y)) return void fail('dd', 'Type a real date: day, month, then the full year.');
      if (!v.gender) return void fail('gen-btn', 'Pick one. "Rather not say" is fine.');
      setDraft({ ...draft, gender: v.gender, d: pad2(+v.d), m: pad2(+v.m), y: v.y });
    }
    if (n === 3) { const e = v.email.trim(); if (!EMAIL.test(e)) return void fail('em', "That doesn't look like an email address."); setDraft({ ...draft, email: e }); }
    if (n === 4 && !/^\d{6}$/.test(code ?? '')) return void fail('code', 'Type all 6 numbers from the email.');
    if (n === 5) {
      if (strength(pw) < 3) return void fail('pw', 'Make it stronger: the bar needs to reach the third step.');
      if (pw !== pw2) return void fail('pw2', "The two passwords don't match.");
      if (reset) return finish();
    }
    if (n === 6) {
      setMe({ name: draft.first, first: draft.first, last: draft.last, email: draft.email, img: '', dob: `${draft.d}/${draft.m}/${draft.y}`, gender: draft.gender });
      return finish();
    }
    go('create-' + (n + 1));
  };

  const label = n === 6 ? 'Create my PMC ID' : n === 5 && reset ? 'Save and sign in' : 'Next';
  let back = n === 1 ? <a className="textlink" href="#choose">I already have one</a> : <BackLink to={'create-' + (n - 1)} />;
  if (reset && n === 4) back = <BackLink to="reset" />;
  if (reset && n === 5) back = <></>;
  const title = reset ? 'Reset your password' : 'Create your PMC ID';

  return (
    <AuthCard title={title} step={reset ? 0 : n} onSubmit={() => next()}>
      {n === 1 && (
        <>
          <h2>What&apos;s your name?</h2>
          <div className="row2">
            <Field id="fn" label="First name" error={errors.fn}><input id="fn" ref={first} type="text" autoComplete="given-name" value={v.first} onChange={(e) => set('first')(e.target.value)} {...bad('fn')} /></Field>
            <Field id="ln" label="Last name" hint="optional"><input id="ln" type="text" autoComplete="family-name" value={v.last} onChange={(e) => set('last')(e.target.value)} /></Field>
          </div>
        </>
      )}
      {n === 2 && (
        <>
          <h2>About you</h2>
          <div className="f"><span className="lab" id="dl">Birthday</span>
            <Dob d={v.d} m={v.m} y={v.y} set={(k, val) => set(k)(val)} invalid={!!errors.dd} />
            {errors.dd ? <p className="err" role="alert">{errors.dd}</p> : null}
          </div>
          <div className="f"><span className="lab" id="gl">Gender</span>
            <PmcSelect id="gen" placeholder="Choose one" options={GENDERS} value={v.gender} onPick={(g) => { set('gender')(g); }} labelledBy="gl" invalid={!!errors['gen-btn']} />
            {errors['gen-btn'] ? <p className="err" role="alert">{errors['gen-btn']}</p> : null}
          </div>
          <details className="why"><summary><Ic n="help" s={18} />Why we ask</summary><p>Your birthday keeps PMC apps right for your age. Your gender is only used for how apps talk to you. Nobody else sees either.</p></details>
        </>
      )}
      {n === 3 && (
        <>
          <h2>Connect an email</h2><p className="lead">You&apos;ll need to confirm it belongs to you.</p>
          <Field id="em" label="Email" error={errors.em}><input id="em" ref={first} type="email" autoComplete="email" spellCheck={false} value={v.email} onChange={(e) => set('email')(e.target.value)} {...bad('em')} /></Field>
        </>
      )}
      {n === 4 && (
        <>
          <h2>Check your email</h2><p className="lead">Type the code we sent to <b>{draft.email}</b>.</p>
          <div className="f"><CodeBoxes onFull={(c) => next(c)} invalid={!!errors.code} resetKey={codeKey} />{errors.code ? <p className="err" role="alert">{errors.code}</p> : null}</div>
          <p className="hint" id="sent">{sent || <>Nothing there? Look in junk, or <button className="textlink" type="button" onClick={() => { setCodeKey(codeKey + 1); setSent('New code sent. The old one no longer works.'); }}>send a new code</button>.</>}</p>
        </>
      )}
      {n === 5 && (
        <>
          <h2>{reset ? 'Make a new password' : 'Make a password'}</h2>
          <Field id="pw" label="Password" error={errors.pw}><PwInput id="pw" auto="new-password" value={pw} onChange={(x) => { setPw(x); clear('pw'); clear('pw2'); }} invalid={!!errors.pw} /></Field>
          <Meter value={pw} />
          <Field id="pw2" label="Type it again" error={errors.pw2}><PwInput id="pw2" auto="new-password" value={pw2} onChange={(x) => { setPw2(x); clear('pw2'); }} invalid={!!errors.pw2} /></Field>
        </>
      )}
      {n === 6 && (
        <>
          <h2>Check it all</h2>
          <div className="review"><Av u={{ img: '' }} /><dl>
            <div><dt>Name</dt><dd>{`${draft.first} ${draft.last}`.trim()} <a className="edit" href="#create-1"><Ic n="pen" s={14} />Change</a></dd></div>
            <div><dt>Email</dt><dd>{draft.email} <a className="edit" href="#create-3"><Ic n="pen" s={14} />Change</a></dd></div>
            <div><dt>Birthday</dt><dd>{`${draft.d}/${draft.m}/${draft.y}`} <a className="edit" href="#create-2"><Ic n="pen" s={14} />Change</a></dd></div>
          </dl></div>
        </>
      )}
      <Acts back={back} label={label} />
    </AuthCard>
  );
}
