'use client';
import { useEffect } from 'react';
import { Choose, Create, Going, Off, Reset, SignIn } from './auth';
import { Dashboard, TABS } from './dashboard';
import { IdProvider, useHash, useId_ } from './state';
import { whenToolkit } from './toolkit';
import { fixOldHash } from '@/lib/route';

function Screen() {
  const { status, me, saved, handoff, go, signOut } = useId_();
  const h = useHash();
  useEffect(() => { fixOldHash(); }, []);
  useEffect(() => { if (new URLSearchParams(location.search).get('add') === '1') go('add'); }, [go]);
  const isTab = TABS.some((t) => t[0] === h);
  const m = /^create-([1-6])$/.exec(h);
  const inn = status === 'in' && !!me;
  /* An app is waiting for this sign in: a signed in person is asked which account, then sent back. */
  const waiting = inn && !!handoff && (h === '' || h === 'choose' || h === 'going' || h === 'signin');

  useEffect(() => whenToolkit(() => { window.PmcAccount!.close(); window.PmcBy!.close?.(); }), [h]);
  useEffect(() => {
    if (status === 'loading') return;
    if (h === 'add') void signOut('signin');                       // "Add account" in the account menu
    else if (h === 'profile') go('info');                          // an app's picture button
    else if (inn && !isTab && !waiting) go('home');
  }, [status, inn, isTab, waiting, h, go, signOut]);

  if (status === 'loading') return null;
  if (status === 'off') return <Off />;
  if (h === 'going' && handoff) return <Going />;
  if (inn) {
    if (waiting) return <Choose />;
    return <Dashboard tab={isTab ? h : 'home'} />;
  }
  /* Signed out: the accounts used on this device first, or straight to sign in. */
  if (m) return <Create key={m[1]} n={+m[1]} />;
  if (h === 'reset') return <Reset />;
  if (h === 'signin' || h === 'add') return <SignIn />;
  return saved.length ? <Choose /> : <SignIn />;
}

export function IdApp() {
  return <IdProvider><Screen /></IdProvider>;
}
