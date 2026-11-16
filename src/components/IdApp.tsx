'use client';
import { useEffect } from 'react';
import { Choose, Create, Reset, SignIn } from './auth';
import { Dashboard, TABS } from './dashboard';
import { IdProvider, useHash, useId_ } from './state';
import { whenToolkit } from './toolkit';

function Screen() {
  const { me, draft, setDraft } = useId_();
  const hash = useHash();
  let h = hash || 'choose';
  const m = /^create-([1-6])$/.exec(h);
  const isTab = TABS.some((t) => t[0] === h);
  /* A password-reset flag only lives on steps 4 and 5. */
  useEffect(() => { if (draft.reset && h !== 'create-4' && h !== 'create-5') setDraft({ ...draft, reset: false }); }, [h, draft, setDraft]);
  useEffect(() => whenToolkit(() => { window.PmcAccount!.close(); window.PmcBy!.close?.(); }), [h]);
  if (!me && (h === 'choose' || isTab)) h = 'signin';
  if (m) return <Create key={m[1] + (draft.reset ? 'r' : '')} n={+m[1]} />;
  if (h === 'signin') return <SignIn />;
  if (h === 'reset') return <Reset />;
  if (isTab) return <Dashboard tab={h} />;
  return <Choose />;
}

export function IdApp() {
  return <IdProvider><Screen /></IdProvider>;
}
