/**
 * Wallet: cards are kept in this browser only, sealed with AES-GCM. The key is made from a secret with PBKDF2 (200,000 rounds).
 * Today the secret is a stand-in. When real sign-in is connected, pass the PMC ID password (plus the PIN when one is set) instead.
 */
export interface Card { id: string; name: string; num: string; mm: string; yy: string; brand: string; img: string }

const WK = 'pmc.wallet.v1', PK = 'pmc.wallet.pin', DEMO_PW = 'prototype-password';
const te = new TextEncoder(), td = new TextDecoder();

export function ls(k: string, v?: string | null): string | null {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
  } catch { /* storage blocked */ }
  return null;
}
export const hasPinSaved = () => ls(PK) === '1';
export const setPinSaved = (on: boolean) => ls(PK, on ? '1' : null);
export const hasWallet = () => !!ls(WK);
export const wipeWallet = () => { ls(WK, null); ls(PK, null); };

const b64 = (a: ArrayBuffer | Uint8Array) => { let s = ''; new Uint8Array(a).forEach((x) => { s += String.fromCharCode(x); }); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(secret: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function seal(cards: Card[], pin: string | null): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await key(DEMO_PW + (pin || ''), salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, te.encode(JSON.stringify(cards)));
  ls(WK, JSON.stringify({ s: b64(salt), i: b64(iv), c: b64(ct) }));
}
export async function open(pin: string | null): Promise<Card[]> {
  const raw = ls(WK); if (!raw) return [];
  const o = JSON.parse(raw);
  const k = await key(DEMO_PW + (pin || ''), unb64(o.s));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.i) as BufferSource }, k, unb64(o.c) as BufferSource);
  return JSON.parse(td.decode(pt));
}
