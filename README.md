# PMC ID

The PMC ID site: sign in, create an account, and manage your info, security, linked apps, wallet and data.
Next.js 15 (App Router), React 19, TypeScript. Built as a static export, like Coe and PMC Apps.

Sign in, account creation, password reset, profile, security, linked apps, data download and delete all use the real PMC account system (Supabase), the same one Coe uses. Cards in the wallet are encrypted in the browser (AES-GCM) with a key made from your PMC ID password, plus an optional PIN.

Without the two Supabase settings (see **DEPLOY.md**, step 3) the site shows "Not available right now" instead of a sign-in form.

## What you need
- **Node.js 22 or newer** (free, from https://nodejs.org). Check with `node -v`.

## 1. Look at it on your computer
```bash
cp .env.example .env.local   # then fill in the two values
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
- `src/app/`: one catch-all page that serves every address (`/signin/`, `/security/`, `/create/name/` ... listed in `src/lib/paths.ts`), layout (security policy, scripts) and `globals.css` (the shared PMC styles and fonts)
- `src/components/`: sign in and create screens (`auth.tsx`), the dashboard and its pages, the wallet
- `src/lib/`: validation, the encrypted wallet, icons, logos
- `public/js/`: the account menu, apps menu and logos shared with other PMC apps
- `public/fonts`, `public/img`: PMC Header, PMC Font and the app logos

## What the Supabase project needs
- Coe's `setup.sql` already run (tables `profiles` and `app_access`, and the function `pmc_delete_me`).
- Authentication > Email templates: **Confirm signup**, **Reset password** and **Reauthentication** each show the 6 digit code `{{ .Token }}`, not a link.

## Never put on this site
A Supabase **secret** or **service_role** key. Only the project URL and the public (publishable or anon) key are ever safe here.

## Known limits
- The security policy needs `'unsafe-inline'` for scripts because Next.js writes small inline scripts. Real security headers would need a host that can set them.
- Each browser tab keeps its own sign in, so closing the tab signs you out. Saved accounts (name, email, small picture) stay on the device so you can pick one quickly.
- Linked apps is a read-only list: Supabase cannot cut off one app on its own, so use Security > sign out other devices.
- If you reset a forgotten password, cards saved under the old one cannot be opened. The wallet offers to remove them.
- Sharing cards to other PMC sites (hidden frame) and autofill are not built yet.
