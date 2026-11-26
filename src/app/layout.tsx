import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'PMC ID',
  description: 'Your PMC ID: one sign in for every PMC app.',
  referrer: 'no-referrer',
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { themeColor: '#171717', viewportFit: 'cover' };

/* A content security policy for the page: it can only load its own files, and talk to its own address and Supabase. Next.js needs inline scripts. */
const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const CSP = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${/^https?:\/\/[a-z0-9.:-]+$/i.test(SB) ? SB : ''}; base-uri 'none'; form-action 'self'; object-src 'none'`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-lead="cream">
      <head><meta httpEquiv="Content-Security-Policy" content={CSP} /></head>
      <body>
        <div id="app">{children}</div>
        <Script src="/js/pmc-logo.js" strategy="afterInteractive" />
        <Script src="/js/pmc-account.js" strategy="afterInteractive" />
        <Script src="/js/pmc-by.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
