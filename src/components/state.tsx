'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { Card } from '@/lib/wallet';

export interface User { name: string; first: string; last: string; email: string; img: string; dob: string; gender: string }
export interface Draft { first: string; last: string; d: string; m: string; y: string; gender: string; email: string; reset: boolean }
export interface Linked { id: 'coe' | 'mini' | 'tools'; name: string; when: string }
export interface Device { id: number; name: string; cur?: boolean; when: string }
export interface WalletState { cards: Card[] | null; pin: string | null; fails: number; wait: number }

const PIC2 = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect width="60" height="60" fill="#337957"/><rect x="18" y="12" width="24" height="24" fill="#FBF6EC"/><rect x="12" y="40" width="36" height="20" fill="#1A4934"/></svg>');
const user = (first: string, email: string, img = ''): User => ({ name: first, first, last: '', email, img, dob: '', gender: '' });
export const EMPTY_DRAFT: Draft = { first: '', last: '', d: '', m: '', y: '', gender: '', email: '', reset: false };
const EMPTY_WALLET: WalletState = { cards: null, pin: null, fails: 0, wait: 0 };

interface Ctx {
  me: User | null; setMe: (u: User | null) => void;
  others: User[]; setOthers: (u: User[]) => void;
  linked: Linked[]; setLinked: (l: Linked[]) => void;
  devices: Device[]; setDevices: (d: Device[]) => void;
  draft: Draft; setDraft: (d: Draft) => void;
  wallet: WalletState; setWallet: (w: WalletState | ((w: WalletState) => WalletState)) => void; resetWallet: () => void;
  notice: string; say: (t: string) => void;
  go: (hash: string) => void;
}
const C = createContext<Ctx | null>(null);
export const useId_ = () => { const c = useContext(C); if (!c) throw new Error('no provider'); return c; };

/** The address after the #, as a store, so the screen changes when it does. */
export function useHash(): string {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); },
    () => location.hash.slice(1),
    () => '',
  );
}

export function IdProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<User | null>(user('Phoenix', 'phoenix@example.com'));
  const [others, setOthers] = useState<User[]>([user('School', 'p.coe@school.example', PIC2)]);
  const [linked, setLinked] = useState<Linked[]>([{ id: 'coe', name: 'Coe', when: 'Linked 12 Nov' }, { id: 'mini', name: 'Coe Mini', when: 'Linked 12 Nov' }, { id: 'tools', name: 'PMC Tools', when: 'Linked 14 Nov' }]);
  const [devices, setDevices] = useState<Device[]>([{ id: 1, name: 'This browser', cur: true, when: 'Active now' }, { id: 2, name: 'Chrome on Windows', when: 'Yesterday' }]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [notice, setNotice] = useState('');
  const say = useCallback((t: string) => setNotice(t), []);
  const go = useCallback((h: string) => { location.hash = h; }, []);
  const resetWallet = useCallback(() => setWallet(EMPTY_WALLET), []);
  const hash = useHash();
  useEffect(() => { setNotice(''); window.scrollTo(0, 0); }, [hash]);
  const v = useMemo(() => ({ me, setMe, others, setOthers, linked, setLinked, devices, setDevices, draft, setDraft, wallet, setWallet, resetWallet, notice, say, go }), [me, others, linked, devices, draft, wallet, notice, say, go, resetWallet]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export { C as IdContext };
