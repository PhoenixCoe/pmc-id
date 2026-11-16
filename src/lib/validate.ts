export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const GENDERS = ['Female', 'Male', 'Other', 'Rather not say'];

/** Password strength 0 to 4. The third step is the least we accept. */
export function strength(v: string): number {
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(v)).length;
  if (!v) return 0;
  if (v.length < 8) return 1;
  if ((v.length >= 14 && classes >= 3) || v.length >= 18) return 4;
  if (v.length >= 10 && classes >= 2) return 3;
  return 2;
}
export const STRENGTH_WORDS = ['Type a password', 'Too weak', 'Weak', 'Good enough', 'Strong'];

/** A real calendar date in the past, no more than 120 years ago. */
export function realDate(d: string, m: string, y: string): boolean {
  const dd = +d, mm = +m, yy = +y, dt = new Date(yy, mm - 1, dd), now = new Date();
  return y.length === 4 && dt.getFullYear() === yy && dt.getMonth() === mm - 1 && dt.getDate() === dd && dt < now && yy > now.getFullYear() - 120;
}
export const pad2 = (n: string | number) => ('0' + n).slice(-2);

export function luhn(n: string): boolean {
  let s = 0, alt = false;
  for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; }
  return s % 10 === 0;
}
export const brand = (n: string) => (/^4/.test(n) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'Mastercard' : /^3[47]/.test(n) ? 'Amex' : 'Card');
