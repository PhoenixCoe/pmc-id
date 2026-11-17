'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthCard, Acts, Av, BackLink } from './chrome';
import { CodeBoxes, Dob, Field, Meter, PmcSelect, PwInput, useErrors } from './form';
import { Ic } from './Ic';
import { keyToPath, linkClick } from '@/lib/route';
import { useId_, EMPTY_DRAFT } from './state';
import { ApiError, handBack, getSession, recover, resendSignup, saveSession, sayErr, setPasswordWith, signIn, signUp, toSession, verifyCode, writeProfile } from '@/lib/supabase';
import { EMAIL, GENDERS, pad2, realDate, strength } from '@/lib/validate';

/** A wait before "send a new code" works again. */
function useCooldown(n = 45): [number, () => void] {
  const [left, setLeft] = useState(0);
  useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [left]);
  return [left, useCallback(() => setLeft(n), [n])];
}
const nl = (s: string) => s.trim().toLowerCase();

/* ---------- Not switched on ---------- */
export function Off() {
  return (
    <AuthCard title="PMC ID" onSubmit={() => undefined}>
      <h2>Not available right now</h2><p className="lead">PMC ID can&apos;t be reached at the moment. Try again in a little while.</p>
    </AuthCard>
  );
}

/* ---------- Choose an account ---------- */
export function Choose() {
  const { me, saved, handoff, pickAccount, forgetSaved, signOut, go } = useId_();
  const [open, setOpen] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(''); };
    document.addEventListener('pointerdown', h); return () => document.removeEventListener('pointerdown', h);
  }, [open]);
  const rows = [...(me ? [{ email: me.email, name: me.name, img: me.img, now: true }] : []), ...saved.map((a) => ({ ...a, now: false }))];
  return (
    <AuthCard title="Choose an account" onSubmit={() => undefined}>
      <h2>Use your PMC ID</h2><p className="lead">{handoff ? `to carry on to ${handoff.name}` : 'one sign in for every PMC app'}</p>
      <div ref={wrap} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(''); }} className="accs">
        {rows.map((a) => (
          <div className="acc-wrap" key={a.email}>
            <button className="acc" type="button" onClick={() => (a.now ? go(handoff ? 'going' : 'home') : pickAccount(a.email))}>
              <Av u={a} /><span className="who"><b>{a.name}</b><small>{a.email}</small></span>
            </button>
            <button className="more" type="button" aria-label={`More for ${a.email}`} aria-expanded={open === a.email} aria-haspopup="menu" onClick={() => setOpen(open === a.email ? '' : a.email)}><Ic n="more" /></button>
            <div className="more-pop" role="menu" hidden={open !== a.email}>
              {a.now
                ? <button type="button" role="menuitem" onClick={() => void signOut('choose')}><Ic n="back" s={18} />Sign out</button>
                : <button type="button" role="menuitem" onClick={() => { forgetSaved(a.email); setOpen(''); }}><Ic n="trash" s={18} />Remove from this browser</button>}
            </div>
          </div>
        ))}
      </div>
      <a className="another" href="/signin/" onClick={(e) => { if (me) { e.preventDefault(); void signOut('signin'); } else linkClick(e, 'signin'); }}><Ic n="plus" />Use another account</a>
      <p className="or">or</p><p className="mid"><a className="textlink" href={keyToPath('create-1')} onClick={(e) => linkClick(e, 'create-1')}>Create a PMC ID</a></p>
    </AuthCard>
  );
}

/* ---------- Sign in ---------- */
export function SignIn() {
  const { signedIn, handoff, prefill, setDraft, go } = useId_();
  const { errors, fail, clear, bad } = useErrors();
  const start = prefill || handoff?.hint || '';
  const [em, setEm] = useState(start), [pw, setPw] = useState(''), [busy, setBusy] = useState(false);
  const emRef = useRef<HTMLInputElement>(null), pwRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (start) setEm(start); (start ? pwRef : emRef).current?.focus(); }, [start]);
  const submit = async () => {
    if (busy) return;
    const email = nl(em);
    if (!EMAIL.test(email)) return void fail('em', 'Type the email you signed up with.');
    if (!pw) return void fail('pw', 'Type your password.');
    setBusy(true);
    try {
      const r = await signIn(email, pw);
      await signedIn(r, pw);
      go(handoff ? 'going' : 'home');
    } catch (e) {
      setBusy(false);
      if ((e as ApiError).code === 'email_not_confirmed') { resendSignup(email).catch(() => undefined); setDraft({ ...EMPTY_DRAFT, email }); go('create-6'); return; }
      fail((e as ApiError).code === 'invalid_credentials' ? 'pw' : 'form', sayErr(e));
    }
  };
  return (
    <AuthCard title="Sign in" onSubmit={submit}>
      <h2>Sign in to PMC ID</h2>
      {handoff ? <p className="lead">to carry on to {handoff.name}</p> : null}
      <Field id="em" label="Email" error={errors.em}><input id="em" ref={emRef} type="email" autoComplete="username" spellCheck={false} value={em} onChange={(e) => { setEm(e.target.value); clear('em'); }} {...bad('em')} /></Field>
      <Field id="pw" label="Password" error={errors.pw}><PwInput id="pw" inputRef={pwRef} auto="current-password" value={pw} onChange={(v) => { setPw(v); clear('pw'); }} invalid={!!errors.pw} /></Field>
      {errors.form ? <p className="err" role="alert">{errors.form}</p> : null}
      <p><a className="textlink" href="/reset/" onClick={(e) => linkClick(e, 'reset')}>Forgot your password?</a></p>
      <Acts back={<BackLink to="choose" />} label={busy ? 'Signing in…' : 'Sign in'} />
    </AuthCard>
  );
}

/* ---------- Reset a password: the email, then the code with the new password ---------- */
export function Reset() {
  const { signedIn, handoff, go } = useId_();
  const { errors, fail, clear, bad } = useErrors();
  const [stage, setStage] = useState<1 | 2>(1);
  const [em, setEm] = useState(''), [code, setCode] = useState(''), [pw, setPw] = useState(''), [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false), [note, setNote] = useState(''), [codeKey, setCodeKey] = useState(0);
  const [left, startCool] = useCooldown();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const submit = async () => {
    if (busy) return;
    if (stage === 1) {
      const e = nl(em); if (!EMAIL.test(e)) return void fail('em', "That doesn't look like an email address.");
      setBusy(true);
      try { await recover(e); setEm(e); setStage(2); startCool(); } catch (x) { fail('em', sayErr(x)); }
      setBusy(false); return;
    }
    if (code.length < 6) return void fail('code', 'Type all 6 numbers from the email.');
    if (strength(pw) < 3) return void fail('pw', 'Make it stronger: the bar needs to reach the third step.');
    if (pw !== pw2) return void fail('pw2', "The two passwords don't match.");
    setBusy(true);
    try {
      /* A code for a reset. An address that was never checked gets a sign up code, so that is tried second. */
      const r = await verifyCode('recovery', em, code).catch((x) => { if ((x as ApiError).net || (x as ApiError).status === 429) throw x; return verifyCode('signup', em, code); }) as { access_token: string };
      await setPasswordWith(r.access_token, pw);
      await signedIn(r, pw);
      go(handoff ? 'going' : 'home');
    } catch (x) {
      setBusy(false);
      const bad = /code|otp|token/i.test((x as ApiError).msg + (x as ApiError).code) || (x as ApiError).status === 403;
      fail(bad ? 'code' : 'pw', sayErr(x, 'code')); if (bad) setCodeKey(codeKey + 1);
    }
  };
  const again = () => { if (left > 0) return; recover(em).then(() => { startCool(); setNote('A new code is on its way. Use the newest email.'); setCodeKey(codeKey + 1); }, (x) => fail('code', sayErr(x))); };
  return (
    <AuthCard title="Reset your password" onSubmit={submit}>
      {stage === 1 ? (
        <>
          <h2>Forgot your password?</h2><p className="lead">We&apos;ll email you a code to make a new one.</p>
          <Field id="em" label="Email" error={errors.em}><input id="em" ref={ref} type="email" autoComplete="username" spellCheck={false} value={em} onChange={(e) => { setEm(e.target.value); clear('em'); }} {...bad('em')} /></Field>
          <Acts back={<BackLink to="signin" />} label={busy ? 'Sending…' : 'Send code'} />
        </>
      ) : (
        <>
          <h2>Make a new password</h2><p className="lead">Type the code we sent to <b>{em}</b>, then a new password.</p>
          <div className="f"><CodeBoxes onChange={(c) => { setCode(c); if (c) clear('code'); }} invalid={!!errors.code} resetKey={codeKey} />{errors.code ? <p className="err" role="alert">{errors.code}</p> : null}</div>
          <p className="hint">{note || <>Nothing there? Look in junk, or <button className="textlink" type="button" onClick={again} disabled={left > 0}>{left > 0 ? `send a new code (${left})` : 'send a new code'}</button>.</>}</p>
          <Field id="pw" label="New password" error={errors.pw}><PwInput id="pw" auto="new-password" value={pw} onChange={(x) => { setPw(x); clear('pw'); clear('pw2'); }} invalid={!!errors.pw} /></Field>
          <Meter value={pw} />
          <Field id="pw2" label="Type it again" error={errors.pw2}><PwInput id="pw2" auto="new-password" value={pw2} onChange={(x) => { setPw2(x); clear('pw2'); }} invalid={!!errors.pw2} /></Field>
          <Acts back={<BackLink to="signin" />} label={busy ? 'Saving…' : 'Save and sign in'} />
        </>
      )}
    </AuthCard>
  );
}

/* ---------- Create a PMC ID: six steps ----------
   1 name, 2 about you, 3 email, 4 password, 5 check it all (the account is made here and a code is emailed), 6 the code. */
export function Create({ n }: { n: number }) {
  const { draft, setDraft, signedIn, handoff, go } = useId_();
  const { errors, fail, clear, bad } = useErrors();
  const [v, setV] = useState({ first: draft.first, last: draft.last, d: draft.d, m: draft.m, y: draft.y, gender: draft.gender, email: draft.email });
  const [pw, setPw] = useState(draft.pw), [pw2, setPw2] = useState(draft.pw);
  const [codeKey, setCodeKey] = useState(0), [sent, setSent] = useState(''), [busy, setBusy] = useState(false);
  const [left, startCool] = useCooldown();
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (n === 1 || n === 3) first.current?.focus(); }, [n]);
  useEffect(() => { if (n > 1 && !(draft.first || (n === 6 && draft.email))) go('create-1'); }, [n, draft.first, draft.email, go]);
  useEffect(() => { if (n === 6) startCool(); }, [n, startCool]);
  const set = (k: keyof typeof v) => (val: string) => { setV((s) => ({ ...s, [k]: val })); clear(); };

  /* Signed in at last: the name, birthday and gender are saved to the profile, then on to Home (or back to the app that asked). */
  const complete = async (r: unknown) => {
    const s = toSession(r as Record<string, unknown>, draft.email);
    saveSession(s);
    await writeProfile(s.uid, { name: draft.first.slice(0, 30), last: draft.last.slice(0, 30), dob: draft.d ? `${draft.d}/${draft.m}/${draft.y}` : '', gender: draft.gender }).catch(() => undefined);
    await signedIn(r, draft.pw);
    setDraft(EMPTY_DRAFT); go(handoff ? 'going' : 'home');
  };

  const next = async (code?: string) => {
    if (busy) return;
    if (n === 1) { const fn = v.first.trim(); if (!fn) return void fail('fn', 'Type your first name.'); setDraft({ ...draft, first: fn.slice(0, 30), last: v.last.trim().slice(0, 30) }); }
    if (n === 2) {
      if (!realDate(v.d, v.m, v.y)) return void fail('dd', 'Type a real date: day, month, then the full year.');
      if (!v.gender) return void fail('gen-btn', 'Pick one. "Rather not say" is fine.');
      setDraft({ ...draft, gender: v.gender, d: pad2(+v.d), m: pad2(+v.m), y: v.y });
    }
    if (n === 3) { const e = nl(v.email); if (!EMAIL.test(e)) return void fail('em', "That doesn't look like an email address."); setDraft({ ...draft, email: e }); }
    if (n === 4) {
      if (strength(pw) < 3) return void fail('pw', 'Make it stronger: the bar needs to reach the third step.');
      if (pw !== pw2) return void fail('pw2', "The two passwords don't match.");
      setDraft({ ...draft, pw });
    }
    if (n === 5) {
      setBusy(true);
      try {
        const r = await signUp(draft.email, draft.pw) as { access_token?: string };
        if (r?.access_token) { await complete(r); return; }
        go('create-6');
      } catch (e) { fail('form', sayErr(e)); }
      setBusy(false); return;
    }
    if (n === 6) {
      if (!/^\d{6}$/.test(code ?? '')) return void fail('code', 'Type all 6 numbers from the email.');
      setBusy(true);
      try { await complete(await verifyCode('signup', draft.email, code!)); } catch (e) { setBusy(false); fail('code', sayErr(e, 'code')); setCodeKey(codeKey + 1); }
      return;
    }
    if (n < 6) go('create-' + (n + 1));
  };
  const again = () => { if (left > 0) return; resendSignup(draft.email).then(() => { startCool(); setCodeKey(codeKey + 1); setSent('New code sent. The old one no longer works.'); }, (e) => fail('code', sayErr(e))); };

  const label = n === 5 ? (busy ? 'Creating…' : 'Create my PMC ID') : 'Next';
  const back = n === 1 ? <a className="textlink" href="/" onClick={(e) => linkClick(e, 'choose')}>I already have one</a> : <BackLink to={'create-' + (n - 1)} />;

  return (
    <AuthCard title="Create your PMC ID" step={n} onSubmit={() => next()}>
      {n === 1 && (
        <>
          <h2>What&apos;s your name?</h2>
          <div className="row2">
            <Field id="fn" label="First name" error={errors.fn}><input id="fn" ref={first} type="text" autoComplete="given-name" maxLength={30} value={v.first} onChange={(e) => set('first')(e.target.value)} {...bad('fn')} /></Field>
            <Field id="ln" label="Last name" hint="optional"><input id="ln" type="text" autoComplete="family-name" maxLength={30} value={v.last} onChange={(e) => set('last')(e.target.value)} /></Field>
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
          <details className="why"><summary><Ic n="help" s={18} />Why we ask</summary><p>Your birthday helps PMC apps fit your age. Gender is optional and never changes what you are shown. Nobody else sees either.</p></details>
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
          <h2>Make a password</h2>
          <Field id="pw" label="Password" error={errors.pw}><PwInput id="pw" auto="new-password" value={pw} onChange={(x) => { setPw(x); clear('pw'); clear('pw2'); }} invalid={!!errors.pw} /></Field>
          <Meter value={pw} />
          <Field id="pw2" label="Type it again" error={errors.pw2}><PwInput id="pw2" auto="new-password" value={pw2} onChange={(x) => { setPw2(x); clear('pw2'); }} invalid={!!errors.pw2} /></Field>
        </>
      )}
      {n === 5 && (
        <>
          <h2>Check it all</h2>
          <div className="review"><Av u={{ img: '' }} /><dl>
            <div><dt>Name</dt><dd>{`${draft.first} ${draft.last}`.trim()} <a className="edit" href={keyToPath('create-1')} onClick={(e) => linkClick(e, 'create-1')}><Ic n="pen" s={14} />Change</a></dd></div>
            <div><dt>Email</dt><dd>{draft.email} <a className="edit" href={keyToPath('create-3')} onClick={(e) => linkClick(e, 'create-3')}><Ic n="pen" s={14} />Change</a></dd></div>
            <div><dt>Birthday</dt><dd>{`${draft.d}/${draft.m}/${draft.y}`} <a className="edit" href={keyToPath('create-2')} onClick={(e) => linkClick(e, 'create-2')}><Ic n="pen" s={14} />Change</a></dd></div>
          </dl></div>
          <p className="hint">Next we email you a code to check the address is yours.</p>
          {errors.form ? <p className="err" role="alert">{errors.form}</p> : null}
        </>
      )}
      {n === 6 && (
        <>
          <h2>Check your email</h2><p className="lead">Type the code we sent to <b>{draft.email}</b>.</p>
          <div className="f"><CodeBoxes onFull={(c) => void next(c)} invalid={!!errors.code} resetKey={codeKey} />{errors.code ? <p className="err" role="alert">{errors.code}</p> : null}</div>
          <p className="hint">{sent || <>Nothing there? Look in junk, or <button className="textlink" type="button" onClick={again} disabled={left > 0}>{left > 0 ? `send a new code (${left})` : 'send a new code'}</button>.</>}</p>
        </>
      )}
      {n === 6 ? <div className="acts">{back}<button className="btn primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Next'}</button></div> : <Acts back={back} label={label} />}
    </AuthCard>
  );
}

/* ---------- Taking the sign in back to the app that asked ---------- */
export function Going() {
  const { handoff, session, go, signOut, endSession } = useId_();
  const [text, setText] = useState(''), [err, setErr] = useState(''), [done, setDone] = useState(false), [tries, setTries] = useState(0);
  const sent = useRef(false);
  const run = useCallback(() => {
    const s = getSession(); if (!handoff || !s) { go('home'); return; }
    setErr('');
    if (handoff.url) {
      setText(`Taking you back to ${handoff.name}…`);
      /* The app takes the sign in and ends it on our side, so this tab keeps nothing. */
      handBack(handoff, s); void endSession();
    } else {
      setText(`Sending your sign in to ${handoff.name}…`);
      handBack(handoff, s);
      window.setTimeout(() => { if (!sent.current) { setText(''); setErr(`Could not reach ${handoff.name}. Make sure it is installed and turned on in this browser, then press Try again.`); } }, 4000);
    }
  }, [handoff, go, endSession]);
  useEffect(() => {
    if (!handoff) return;
    const onMsg = (ev: MessageEvent) => {
      if (ev.source !== window || ev.origin !== location.origin) return;
      const d = ev.data; if (!d || d.pmc !== 'ack' || d.state !== handoff.state) return;
      sent.current = true;
      if (d.ok) { setErr(''); setDone(true); setText(`You are signed in to ${handoff.name}. You can close this tab.`); void endSession(); }
      else { setText(''); setErr(`${handoff.name} did not accept this sign in. Open ${handoff.name} and press Sign in with PMC again.`); }
    };
    window.addEventListener('message', onMsg);
    const t = window.setTimeout(run, 600);
    return () => { window.removeEventListener('message', onMsg); clearTimeout(t); };
  }, [handoff, run, tries]);
  if (!handoff) return null;
  return (
    <AuthCard title="You are in" onSubmit={() => undefined}>
      <h2>{done ? 'All done' : 'One moment'}</h2>
      {text ? <p className="lead" role="status">{text}</p> : null}
      {err ? <p className="err" role="alert">{err}</p> : null}
      {err ? <div className="acts"><button className="btn" type="button" onClick={() => void signOut('signin')}>Sign in again</button><button className="btn primary" type="button" onClick={() => { sent.current = false; setTries(tries + 1); }}>Try again</button></div> : null}
      {handoff.url && !done && session ? <div className="acts"><span /><button className="btn primary" type="button" onClick={run}>Continue to {handoff.name}</button></div> : null}
    </AuthCard>
  );
}
