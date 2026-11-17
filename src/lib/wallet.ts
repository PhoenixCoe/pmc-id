/**
 * Wallet: cards are kept in this browser only, never on a server, and sealed with AES-GCM.
 * Two locks, from the outside in:
 *   1. The PMC ID password. When you sign in, a key is made from the password (PBKDF2, 200,000 rounds) and kept in this browser as a
 *      key that cannot be read back out. Sign out and it is deleted.
 *   2. An optional PIN. A second key from the PIN seals the cards inside the first lock, so even a signed in tab needs the PIN.
 * Changing the password only re-seals the outer lock, so the PIN keeps working.
 */
export interface Card { id: string; name: string; num: string; mm: string; yy: string; brand: string; img: string }

const te = new TextEncoder(), td = new TextDecoder();
const B = 'pmc.wallet.';
let owner = '';
let mem: CryptoKey | null = null;

export function ls(k: string, v?: string | null): string | null {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
  } catch { /* storage blocked */ }
  return null;
}
const WK = () => B + 'v2.' + owner, PK = () => B + 'pin.' + owner;
export const setOwner = (uid: string) => { owner = uid.replace(/[^a-z0-9-]/gi, '').slice(0, 40); };
export const hasPinSaved = () => ls(PK()) === '1';
export const setPinSaved = (on: boolean) => ls(PK(), on ? '1' : null);
export const hasWallet = () => !!ls(WK());
export const wipeWallet = () => { ls(WK(), null); ls(PK(), null); void dropKey(); };

const b64 = (a: ArrayBuffer | Uint8Array) => { let s = ''; new Uint8Array(a).forEach((x) => { s += String.fromCharCode(x); }); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/* The key made from the password is kept in IndexedDB as a CryptoKey, which the page can use but never read. */
const DB = 'pmc-wallet';
const idb = (): Promise<IDBDatabase> => new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function keep(k: CryptoKey) { try { const d = await idb(); await new Promise<void>((res, rej) => { const t = d.transaction('k', 'readwrite'); t.objectStore('k').put(k, owner); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); d.close(); } catch { /* kept in memory only */ } }
async function fetchKey(): Promise<CryptoKey | null> { try { const d = await idb(); const k = await new Promise<CryptoKey | null>((res) => { const r = d.transaction('k').objectStore('k').get(owner); r.onsuccess = () => res((r.result as CryptoKey) ?? null); r.onerror = () => res(null); }); d.close(); return k; } catch { return null; } }
async function dropKey() { mem = null; try { const d = await idb(); await new Promise<void>((res) => { const t = d.transaction('k', 'readwrite'); t.objectStore('k').delete(owner); t.oncomplete = () => res(); t.onerror = () => res(); }); d.close(); } catch { /* nothing to drop */ } }

function salt(): Uint8Array {
  let s = ls(B + 'salt'); if (!s) { s = b64(crypto.getRandomValues(new Uint8Array(16))); ls(B + 'salt', s); }
  return unb64(s);
}
async function derive(secret: string, s: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: s as BufferSource, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function enc(k: CryptoKey, text: string) { const iv = crypto.getRandomValues(new Uint8Array(12)); return { i: b64(iv), c: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, te.encode(text))) }; }
async function dec(k: CryptoKey, o: { i: string; c: string }) { return td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.i) as BufferSource }, k, unb64(o.c) as BufferSource)); }

/** At sign in: makes the outer key from the password. */
export async function unlockWithPassword(password: string) { mem = await derive(password, salt()); await keep(mem); }
/** After a page reload: takes the kept key back, if there is one. */
export async function restoreKey(): Promise<boolean> { mem = mem ?? (await fetchKey()); return !!mem; }
export const lockWallet = () => dropKey();
export const isUnlocked = () => !!mem;

export async function seal(cards: Card[], pin: string | null): Promise<void> {
  if (!mem) throw new Error('locked');
  let inner = JSON.stringify(cards), pinned = false;
  if (pin) { const ps = crypto.getRandomValues(new Uint8Array(16)); inner = JSON.stringify({ s: b64(ps), ...(await enc(await derive(pin, ps), inner)) }); pinned = true; }
  ls(WK(), JSON.stringify({ v: 2, p: pinned, ...(await enc(mem, inner)) }));
}
/** Opens the wallet. Throws 'locked' when the password key is missing, and a plain error for a wrong PIN. */
export async function open(pin: string | null): Promise<Card[]> {
  const raw = ls(WK()); if (!raw) return [];
  if (!mem) throw new Error('locked');
  const o = JSON.parse(raw);
  let inner = await dec(mem, o);
  if (o.p) { if (!pin) throw new Error('pin'); const p = JSON.parse(inner); inner = await dec(await derive(pin, unb64(p.s)), p); }
  return JSON.parse(inner);
}
/** Whether the saved wallet needs a PIN before it opens. */
export const needsPin = () => { try { return !!JSON.parse(ls(WK()) || 'null')?.p; } catch { return false; } };

/** After a password change: the outer lock is made again from the new password. The PIN lock inside is untouched. */
export async function changePassword(newPassword: string): Promise<void> {
  const raw = ls(WK()), old = mem;
  const nk = await derive(newPassword, salt());
  if (raw && old) { const o = JSON.parse(raw); const inner = await dec(old, o); ls(WK(), JSON.stringify({ v: 2, p: !!o.p, ...(await enc(nk, inner)) })); }
  mem = nk; await keep(nk);
}
