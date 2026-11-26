/**
 * The PMC account system (Supabase). The same project Coe, Coe Mini and PMC Tools use.
 * Only the project address and the public (publishable or anon) key are ever put here. Never a secret key.
 * Both come in when the site is built (GitHub variables SUPABASE_URL and SUPABASE_ANON_KEY).
 */
export const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
export const LIVE = (/^https:\/\/[a-z0-9.-]+$/i.test(SB_URL) || /^http:\/\/localhost(:\d+)?$/.test(SB_URL)) && !!KEY && !/^__/.test(KEY) && !/^sb_secre[t]_/.test(KEY);

/** The only places a sign in can be sent back to. The address comes from this list, never from the link. */
export const APPS: Record<string, { name: string; url?: string; extension?: boolean }> = {
  coe: { name: 'Coe', url: 'https://coe.pmcstudios.uk/' },
  mini: { name: 'Coe Mini', extension: true },
  tools: { name: 'PMC Tools', url: 'https://tools.pmcstudios.uk/' },
  apps: { name: 'PMC Tools', url: 'https://tools.pmcstudios.uk/' },
  studios: { name: 'PMC Studios', url: 'https://pmcstudios.uk/' },
  donow: { name: 'Do Now', url: 'https://donow.pmcstudios.uk/' },
};

export class ApiError extends Error {
  status = 0; code = ''; msg = ''; net = false;
  constructor(m = 'api') { super(m); }
}
type Json = Record<string, unknown>;
interface Opt { method?: string; token?: string; body?: unknown; prefer?: string }

export async function api<T = any>(path: string, o: Opt = {}): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
  const h: Record<string, string> = { apikey: KEY, 'Content-Type': 'application/json' };
  if (o.token) h.Authorization = 'Bearer ' + o.token;
  if (o.prefer) h.Prefer = o.prefer;
  try {
    let r: Response;
    try { r = await fetch(SB_URL + path, { method: o.method ?? 'POST', headers: h, body: o.body === undefined ? undefined : JSON.stringify(o.body), signal: ctl.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors' }); }
    catch { const n = new ApiError('net'); n.net = true; throw n; }
    const t = await r.text(); let j: Json | null = null;
    try { j = t ? JSON.parse(t) : null; } catch { /* not json */ }
    if (r.ok) return j as T;
    const e = new ApiError();
    e.status = r.status;
    e.code = String((j && (j.error_code || (typeof j.code === 'string' ? j.code : '') || j.error)) || '');
    e.msg = String((j && (j.msg || j.message || j.error_description)) || '');
    throw e;
  } finally { clearTimeout(to); }
}

/** Plain words for what went wrong. */
export function sayErr(e: unknown, ctx?: 'code'): string {
  const x = e as ApiError;
  if (x?.net) return 'Could not reach PMC ID. Check your connection and try again.';
  const c = x?.code ?? '';
  if (c === 'invalid_credentials') return 'Wrong email or password.';
  if (c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit' || c === 'over_sms_send_rate_limit' || x?.status === 429) return 'Too many tries just now. Wait a minute, then try again.';
  if (c === 'weak_password') return 'That password is too easy to guess. Use at least 10 characters, and try a few random words.';
  if (c === 'same_password') return 'Choose a password this account is not already using.';
  if (c === 'signup_disabled' || c === 'email_provider_disabled') return 'New accounts cannot be made right now.';
  if (c === 'reauthentication_needed' || x?.status === 401 || c === 'bad_jwt' || c === 'session_expired') return 'Your sign in timed out. Sign in again.';
  if (ctx === 'code' && (x?.status === 400 || x?.status === 403 || x?.status === 422)) return 'That code is wrong or has expired. Use the newest email, or send a new code.';
  if (c === 'validation_failed') return 'Check the email address and try again.';
  if (x?.status >= 500) return 'PMC ID had a problem. Try again in a minute.';
  return 'That did not work. Check what you typed and try again.';
}

/* ---------- the sign in ---------- */
export interface Session { access_token: string; refresh_token: string; expires_at: number; email: string; uid: string }
const SK = 'pmc.id.session';
export const SESSION_EVENT = 'pmc:session';

/** The sign in lives in this tab only (sessionStorage). Close the tab and it is gone. */
export function getSession(): Session | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SK) || 'null');
    return v && typeof v.access_token === 'string' && typeof v.refresh_token === 'string' && typeof v.email === 'string' ? (v as Session) : null;
  } catch { return null; }
}
/** quiet: the sign in was handed to an app on purpose, so this is not an "it timed out" for the page to react to. */
export function saveSession(s: Session | null, quiet = false): void {
  try { if (s) sessionStorage.setItem(SK, JSON.stringify(s)); else sessionStorage.removeItem(SK); } catch { /* storage blocked */ }
  if (quiet) return;
  try { window.dispatchEvent(new Event(SESSION_EVENT)); } catch { /* no window */ }
}
export function toSession(r: any, fallbackEmail = ''): Session { // eslint-disable-line @typescript-eslint/no-explicit-any
  const now = Math.floor(Date.now() / 1000);
  return { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Number(r.expires_at) || now + (Number(r.expires_in) || 3600), email: r.user?.email || fallbackEmail, uid: r.user?.id || '' };
}

let refreshing: Promise<Session> | null = null;
async function fresh(force = false): Promise<Session> {
  const s = getSession();
  if (!s) { const e = new ApiError(); e.status = 401; throw e; }
  if (!force && s.expires_at - 60 > Math.floor(Date.now() / 1000)) return s;
  refreshing ??= api('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } })
    .then((r) => { const n = toSession(r, s.email); n.uid ||= s.uid; saveSession(n); return n; })
    .catch((e) => { if ((e as ApiError).status && (e as ApiError).status < 500) saveSession(null); throw e; })
    .finally(() => { refreshing = null; });
  return refreshing;
}
/** A call as the signed in person. A timed out token is renewed first, and a 401 is tried once more with a new one. */
export async function authed<T = any>(path: string, o: Omit<Opt, 'token'> = {}): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const s = await fresh();
  try { return await api<T>(path, { ...o, token: s.access_token }); }
  catch (e) { if ((e as ApiError).status === 401) { const n = await fresh(true); return api<T>(path, { ...o, token: n.access_token }); } throw e; }
}

export const signIn = (email: string, password: string) => api('/auth/v1/token?grant_type=password', { body: { email, password } });
export const signUp = (email: string, password: string) => api('/auth/v1/signup', { body: { email, password } });
export const verifyCode = (type: 'signup' | 'recovery', email: string, token: string) => api('/auth/v1/verify', { body: { type, email, token } });
export const resendSignup = (email: string) => api('/auth/v1/resend', { body: { type: 'signup', email } });
export const recover = (email: string) => api('/auth/v1/recover', { body: { email } });
export const setPasswordWith = (token: string, password: string) => api('/auth/v1/user', { method: 'PUT', token, body: { password } });
export const reauthenticate = () => authed('/auth/v1/reauthenticate', { method: 'GET' });
export const getUser = () => authed('/auth/v1/user', { method: 'GET' });
export async function signOutOf(scope: 'local' | 'others'): Promise<void> {
  try { await authed('/auth/v1/logout?scope=' + scope); } catch { /* the sign in only lived in this tab anyway */ }
}

/* ---------- the profile: one row Coe shares. Name and picture are where Coe keeps them; the rest is under its own key. ---------- */
export interface Profile { name: string; last: string; dob: string; gender: string; img: string }
export const okPic = (v: unknown): v is string => typeof v === 'string' && v.length < 120000 && /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
const obj = (v: unknown): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {}); // eslint-disable-line @typescript-eslint/no-explicit-any

async function rawProfile(): Promise<Record<string, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows = await authed<{ data: unknown }[]>('/rest/v1/profiles?select=data', { method: 'GET' });
  return Array.isArray(rows) && rows[0] ? obj(rows[0].data) : {};
}
export async function readProfile(): Promise<Profile> {
  const d = await rawProfile(), a = obj(d.about), id = obj(d.pmcid);
  return {
    name: typeof a.name === 'string' ? a.name.trim().slice(0, 30) : '',
    last: typeof id.last === 'string' ? id.last.slice(0, 30) : '',
    dob: typeof id.dob === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(id.dob) ? id.dob : '',
    gender: typeof id.gender === 'string' ? id.gender.slice(0, 20) : '',
    img: okPic(obj(d.avatar).img) ? obj(d.avatar).img : '',
  };
}
/** Reads what is saved, changes only what was asked, writes it back. Coe's own notes and settings in the same row stay as they are. */
export async function writeProfile(uid: string, patch: Partial<Profile>): Promise<void> {
  const d = await rawProfile(), now = Date.now();
  if (patch.name !== undefined) d.about = { ...obj(d.about), name: patch.name.slice(0, 30), at: now };
  if (patch.img !== undefined) d.avatar = { at: now, img: patch.img };
  const extra: Record<string, string> = {};
  (['last', 'dob', 'gender'] as const).forEach((k) => { if (patch[k] !== undefined) extra[k] = patch[k] as string; });
  if (Object.keys(extra).length) d.pmcid = { ...obj(d.pmcid), ...extra };
  await authed('/rest/v1/profiles?on_conflict=user_id', { body: { user_id: uid, data: d, updated: new Date(now).toISOString() }, prefer: 'resolution=merge-duplicates,return=minimal' });
}

export interface AppRow { app: string; label: string; pmc: boolean; first_at?: string | null; last_at: string | null }
export async function listApps(): Promise<AppRow[]> {
  const rows = await authed<AppRow[]>('/rest/v1/app_access?select=app,label,pmc,first_at,last_at&order=last_at.desc&limit=50', { method: 'GET' });
  return Array.isArray(rows) ? rows.filter((r) => r && typeof r.app === 'string').map((r) => ({ app: r.app, label: String(r.label || r.app).slice(0, 60), pmc: r.pmc !== false, first_at: r.first_at ?? null, last_at: r.last_at ?? null })) : [];
}
/** When your name and picture were last changed (kept in the profile row), for the Activity page. */
export async function readStamps(): Promise<{ name: number; img: number }> {
  const d = await rawProfile();
  const n = (v: unknown) => (typeof v === 'number' && v > 0 ? v : 0);
  return { name: n(obj(d.about).at), img: n(obj(d.avatar).at) };
}
export interface Plan { plan: string; status: string; period_end: string | null }
/** Coe's Pro plan, if there is one. Only the owner can read it. */
export async function readPlan(): Promise<Plan | null> {
  const rows = await authed<Plan[]>('/rest/v1/subs?select=plan,status,period_end&limit=1', { method: 'GET' });
  return Array.isArray(rows) && rows[0] ? { plan: String(rows[0].plan || 'pro'), status: String(rows[0].status || ''), period_end: rows[0].period_end ?? null } : null;
}
export const deleteMe = () => authed('/rest/v1/rpc/pmc_delete_me', { body: {} });

export async function exportData() {
  const [u, p, c, a] = await Promise.all([
    getUser(),
    authed('/rest/v1/profiles?select=data,updated', { method: 'GET' }).catch(() => []),
    authed('/rest/v1/chats?select=id,title,updated,pinned,data&order=updated.desc&limit=1000', { method: 'GET' }).catch(() => []),
    authed('/rest/v1/app_access?select=app,label,pmc,first_at,last_at', { method: 'GET' }).catch(() => []),
  ]);
  return { made: new Date().toISOString(), about: 'Your PMC ID data.', email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, profile: Array.isArray(p) && p[0] ? p[0].data : null, sites_and_apps: a, chats: c };
}

/** A picture of any kind becomes a 192 pixel square cropped from the middle, small enough to keep (the same as Coe does). */
export function fileToPic(file: File): Promise<string> {
  return new Promise((res, rej) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) return rej(new Error('Pick a PNG, JPG or WebP picture.'));
    if (file.size > 12e6) return rej(new Error('That picture is too big. Pick one under 12 MB.'));
    const rd = new FileReader();
    rd.onerror = () => rej(new Error('That picture could not be opened.'));
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        try {
          const N = 192, c = document.createElement('canvas'); c.width = c.height = N;
          const g = c.getContext('2d')!, side = Math.min(im.naturalWidth, im.naturalHeight);
          g.fillStyle = '#fff'; g.fillRect(0, 0, N, N); g.drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, N, N);
          let o = c.toDataURL('image/webp', 0.85); if (!o.startsWith('data:image/webp')) o = c.toDataURL('image/jpeg', 0.85);
          okPic(o) ? res(o) : rej(new Error('That picture could not be used. Try another.'));
        } catch { rej(new Error('That picture could not be used. Try another.')); }
      };
      im.onerror = () => rej(new Error('That picture could not be opened.'));
      im.src = String(rd.result);
    };
    rd.readAsDataURL(file);
  });
}

/* ---------- an app asking for a sign in: ?app=coe&state=... ---------- */
export interface Handoff { id: string; name: string; url?: string; extension?: boolean; state: string; hint: string }
export function readHandoff(): Handoff | null {
  try {
    const q = new URLSearchParams(location.search), id = q.get('app') || '', state = q.get('state') || '';
    if (!id || !Object.prototype.hasOwnProperty.call(APPS, id) || !/^[A-Za-z0-9_-]{16,128}$/.test(state)) return null;
    const h = q.get('hint') || '';
    return { id, ...APPS[id], state, hint: h.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(h) ? h : '' };
  } catch { return null; }
}
/** Sends the sign in back to the app that asked. It checks the one time value it was given. */
export function handBack(h: Handoff, s: Session): void {
  if (h.url) {
    const p = new URLSearchParams({ pmc_state: h.state, access_token: s.access_token, refresh_token: s.refresh_token, expires_at: String(s.expires_at) });
    location.replace(h.url + '#' + p.toString());
  } else window.postMessage({ pmc: 'session', app: h.id, state: h.state, session: s }, location.origin);
}

/* ---------- an app that sent the person here: a way back ---------- */
export interface From { id: string; name: string; url: string }
const FROM_KEY = 'pmc.id.from';
/** Which PMC app the person came from: ?from=coe, or the page they clicked from. It is remembered for this tab, so it is still there after they sign in. */
export function readFrom(): From | null {
  try {
    const hit = (id: string): From | null => { const a = APPS[id]; return a && a.url && Object.prototype.hasOwnProperty.call(APPS, id) ? { id, name: a.name, url: a.url } : null; };
    let f: From | null = null;
    const q = new URLSearchParams(location.search).get('from') || '';
    if (q) f = hit(q);
    if (!f && document.referrer) {
      const o = new URL(document.referrer).origin;
      if (o !== location.origin) f = (Object.keys(APPS).map(hit).find((x) => x && new URL(x.url).origin === o) as From | undefined) ?? null;
    }
    if (f) { sessionStorage.setItem(FROM_KEY, f.id); } else { const id = sessionStorage.getItem(FROM_KEY) || ''; f = id ? hit(id) : null; }
    if (q) { const u = new URLSearchParams(location.search); u.delete('from'); history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u.toString() : '')); }
    return f;
  } catch { return null; }
}
/** Sent here to sign in or make an account, not to manage one: after that the person goes straight back. Only the front page and the sign in, create and reset screens count. The account tabs (Manage PMC ID) never do. */
export function readBack(f: From | null): From | null {
  try {
    if (!f) return null;
    const p = location.pathname.replace(/^\/+|\/+$/g, '');
    if (!(p === '' || p === 'signin' || p === 'reset' || p.startsWith('create'))) return null;
    /* ?path=/the-page/ : the page the person was on, so they land on it again. Only a plain path on the app's own address is taken. */
    const q = new URLSearchParams(location.search).get('path') || '';
    const safe = /^\/(?![/\\])[A-Za-z0-9\-._~/]{0,200}$/.test(q) ? q : '';
    return safe ? { ...f, url: new URL(safe, f.url).href } : f;
  } catch { return null; }
}
export function clearFrom(): void { try { sessionStorage.removeItem(FROM_KEY); } catch { /* ignore */ } }
