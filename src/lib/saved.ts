/** The accounts used on this device: an email, a name and a small picture. Never a password or a sign in. */
export interface Saved { email: string; name: string; img: string }
const K = 'pmc.accounts';
const okImg = (v: unknown): v is string => typeof v === 'string' && v.length < 120000 && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(v);

export function savedList(): Saved[] {
  try {
    const v = JSON.parse(localStorage.getItem(K) || '[]');
    return Array.isArray(v) ? v.filter((a) => a && typeof a.email === 'string').slice(0, 6).map((a) => ({ email: String(a.email).slice(0, 254), name: String(a.name || '').slice(0, 30), img: okImg(a.img) ? a.img : '' })) : [];
  } catch { return []; }
}
function put(l: Saved[]) { try { localStorage.setItem(K, JSON.stringify(l.slice(0, 6))); } catch { /* storage blocked */ } }
export function remember(a: Saved): Saved[] {
  const l = savedList().filter((x) => x.email.toLowerCase() !== a.email.toLowerCase());
  l.unshift({ email: a.email, name: a.name || a.email.split('@')[0], img: okImg(a.img) ? a.img : '' }); put(l); return l;
}
export function forget(email: string): Saved[] {
  const l = savedList().filter((x) => x.email.toLowerCase() !== email.toLowerCase()); put(l); return l;
}
