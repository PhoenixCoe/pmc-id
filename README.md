# PMC ID

The PMC ID site: sign in, create an account, and manage your info, security, linked apps, wallet and data.
Next.js 15 (App Router), React 19, TypeScript. Built as a static export, like Coe and PMC Apps.

This version is the finished design with demo data. Sign in, account creation and the wallet password are not connected to a real back end yet. The wallet already encrypts cards in the browser with AES-GCM (key from a stand-in password until sign in is real).

## What you need
- **Node.js 22 or newer** (free, from https://nodejs.org). Check with `node -v`.

## 1. Look at it on your computer
```bash
npm install
npm run dev
```
Open http://localhost:3000. To see it the way visitors will:
```bash
npm run build:static
npx serve out
```

## 2. Put it on the internet
Numbered steps are in **DEPLOY.md** (GitHub Pages, accounts.pmcstudios.uk).

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | Edit the site with live reload |
| `npm run typecheck` | Checks the code for mistakes |
| `npm run build:static` | Builds the finished site into `out/` |
| `npm run check` | Checks the live site is set up safely (`node check-setup.mjs`) |

## Where things are
- `src/app/`: the page, layout (security policy, scripts) and `globals.css` (the shared PMC styles and fonts)
- `src/components/`: sign in and create screens (`auth.tsx`), the dashboard and its pages, the wallet
- `src/lib/`: validation, the encrypted wallet, icons, logos
- `public/js/`: the account menu, apps menu and logos shared with other PMC apps
- `public/fonts`, `public/img`: PMC Header, PMC Font and the app logos

## Never put on this site
A Supabase **secret** or **service_role** key. Only the project URL and the public (publishable or anon) key are ever safe here.

## Known limits
- The security policy needs `'unsafe-inline'` for scripts because Next.js writes small inline scripts. Real security headers would need a host that can set them.
- Sharing cards to other PMC sites (hidden frame) and autofill are not built yet.
