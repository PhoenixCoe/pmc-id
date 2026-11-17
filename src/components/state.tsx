'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { forget, remember, savedList } from '@/lib/saved';
import type { Saved } from '@/lib/saved';
import { navigate, useRoute } from '@/lib/route';
import { LIVE, clearFrom, readFrom, type From, SESSION_EVENT, getSession, getUser, listApps, readHandoff, readProfile, saveSession, setPasswordWith, signOutOf, toSession, writeProfile } from '@/lib/supabase';
import type { AppRow, Handoff, Profile, Session } from '@/lib/supabase';
import { lockWallet, restoreKey, setOwner, unlockWithPassword } from '@/lib/wallet';
import type { Card } from '@/lib/wallet';

export interface User { name: string; first: string; last: string; email: string; img: string; dob: string; gender: string }
export interface Draft { first: string; last: string; d: string; m: string; y: string; gender: string; email: string; pw: string }
export interface WalletState { cards: Card[] | null; pin: string | null; fails: number; wait: number }
export type Status = 'loading' | 'off' | 'out' | 'in';

export const EMPTY_DRAFT: Draft = { first: '', last: '', d: '', m: '', y: '', gender: '', email: '', pw: '' };
const EMPTY_WALLET: WalletState = { cards: null, pin: null, fails: 0, wait: 0 };

interface Ctx {
  status: Status; session: Session | null;
  me: User | null; saved: Saved[]; forgetSaved: (email: string) => void;
  apps: AppRow[]; handoff: Handoff | null;
  from: From | null; leave: () => void;
  prefill: string; setPrefill: (email: string) => void; pickAccount: (email: string) => void;
  draft: Draft; setDraft: (d: Draft) => void;
  wallet: WalletState; setWallet: (w: WalletState | ((w: WalletState) => WalletState)) => void; resetWallet: () => void;
  notice: string; say: (t: string) => void; go: (hash: string) => void;
  /** Takes a sign in (the answer from the account service). With the password, the wallet is unlocked too. */
  signedIn: (r: unknown, password?: string) => Promise<void>;
  signOut: (toHash?: string) => Promise<void>;
  /** The sign in was handed to an app on purpose: this tab keeps nothing, and stays where it is. */
  endSession: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
  setPassword: (token: string, password: string) => Promise<void>;
  reloadApps: () => Promise<void>;
}
const C = createContext<Ctx | null>(null);
export const useId_ = () => { const c = useContext(C); if (!c) throw new Error('no provider'); return c; };

/** The screen the address bar shows, as a store, so the screen changes when it does. */
export const useHash = useRoute;

const toUser = (email: string, p: Profile): User => {
  const first = p.name || email.split('@')[0].slice(0, 30);
  return { name: `${first} ${p.last}`.trim(), first, last: p.last, email, img: p.img, dob: p.dob, gender: p.gender };
};

export function IdProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [prefill, setPrefill] = useState('');
  const [from, setFrom] = useState<From | null>(null);
  useEffect(() => { setFrom(readFrom()); }, []);
  const leave = useCallback(() => { clearFrom(); setFrom(null); }, []);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [notice, setNotice] = useState('');
  const say = useCallback((t: string) => setNotice(t), []);
  const go = useCallback((h: string) => { navigate(h); }, []);
  const resetWallet = useCallback(() => setWallet(EMPTY_WALLET), []);
  const hash = useHash();
  const meRef = useRef<User | null>(null); meRef.current = me;

  /* The saved accounts exclude the one that is signed in. */
  const others = useCallback((email?: string) => savedList().filter((a) => a.email.toLowerCase() !== (email ?? '').toLowerCase()), []);

  const load = useCallback(async (s: Session) => {
    setOwner(s.uid); void restoreKey();
    const [u, p, a] = await Promise.all([getUser(), readProfile().catch(() => ({ name: '', last: '', dob: '', gender: '', img: '' }) as Profile), listApps().catch(() => [] as AppRow[])]);
    const email = String(u.email || s.email);
    if (u.id && u.id !== s.uid) { s.uid = u.id; saveSession(s); setOwner(u.id); }
    const user = toUser(email, p);
    remember({ email, name: user.first, img: user.img });
    setSession(getSession() ?? s); setMe(user); setApps(a); setSaved(others(email)); setStatus('in');
  }, [others]);

  /* On the first load: take up a sign in that is still in this tab, and see whether an app is asking for one. */
  useEffect(() => {
    setHandoff(readHandoff());
    const l = savedList();
    if (!LIVE) { setStatus('off'); return; }
    const s = getSession();
    if (!s) { setSaved(l); setStatus('out'); return; }
    load(s).catch(() => { saveSession(null); setSaved(l); setStatus('out'); });
  }, [load]);

  /* A sign in that ends by itself (it could not be renewed). */
  useEffect(() => {
    const h = () => { if (!getSession() && meRef.current) { setSession(null); setMe(null); setSaved(savedList()); setStatus('out'); setNotice('Your sign in timed out. Sign in again.'); navigate('signin'); } };
    window.addEventListener(SESSION_EVENT, h); return () => window.removeEventListener(SESSION_EVENT, h);
  }, []);

  const signedIn = useCallback(async (r: unknown, password?: string) => {
    const s = toSession(r as Record<string, unknown>);
    saveSession(s); setOwner(s.uid);
    if (password) { try { await unlockWithPassword(password); } catch { /* the wallet stays locked */ } }
    await load(s);
  }, [load]);

  const signOut = useCallback(async (toHash = 'choose') => {
    await signOutOf('local');
    saveSession(null); await lockWallet();
    setSession(null); setMe(null); setApps([]); setWallet(EMPTY_WALLET); setDraft(EMPTY_DRAFT); setSaved(savedList()); setStatus('out');
    navigate(toHash);
  }, []);

  const endSession = useCallback(async () => {
    saveSession(null, true); await lockWallet();
    setSession(null); setMe(null); setApps([]); setWallet(EMPTY_WALLET); setDraft(EMPTY_DRAFT); setSaved(savedList()); setStatus('out');
  }, []);

  const saveProfile = useCallback(async (patch: Partial<Profile>) => {
    const m = meRef.current, s = getSession(); if (!m || !s) return;
    await writeProfile(s.uid, patch);
    const first = patch.name ?? m.first, last = patch.last ?? m.last;
    const next: User = { ...m, first, last, name: `${first} ${last}`.trim(), img: patch.img ?? m.img, dob: patch.dob ?? m.dob, gender: patch.gender ?? m.gender };
    setMe(next); remember({ email: next.email, name: next.first, img: next.img });
  }, []);

  const setPassword = useCallback(async (token: string, password: string) => { await setPasswordWith(token, password); }, []);
  const reloadApps = useCallback(async () => { setApps(await listApps().catch(() => [])); }, []);
  const forgetSaved = useCallback((email: string) => { setSaved(forget(email).filter((a) => a.email.toLowerCase() !== (meRef.current?.email ?? '').toLowerCase())); }, []);
  const pickAccount = useCallback((email: string) => { setPrefill(email); navigate('signin'); }, []);

  useEffect(() => { setNotice(''); window.scrollTo(0, 0); }, [hash]);
  const v = useMemo<Ctx>(() => ({ status, session, me, saved, forgetSaved, apps, handoff, from, leave, prefill, setPrefill, pickAccount, draft, setDraft, wallet, setWallet, resetWallet, notice, say, go, signedIn, signOut, endSession, saveProfile, setPassword, reloadApps }),
    [status, session, me, saved, forgetSaved, apps, handoff, from, leave, prefill, setPrefill, pickAccount, draft, wallet, notice, say, go, resetWallet, signedIn, signOut, endSession, saveProfile, setPassword, reloadApps]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export { C as IdContext };
