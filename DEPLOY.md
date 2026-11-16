# Putting PMC ID online (accounts.pmcstudios.uk)

GitHub Pages hosts plain files, so the site is built as a static export (`npm run build:static`, written to `out/`).
This version is the finished design with demo data: sign in and account creation are not connected to a real back end yet.

## First time
1. github.com > **+** (top right) > **New repository**. Name it `pmc-id`. Choose **Private**. Leave every "Add a ..." box empty. **Create repository**.
2. On the empty repository page press **uploading an existing file**. Unzip `pmc-id.zip`, select everything inside the folder (Ctrl+A), including the `.github` folder, drag it onto the page and wait for the bar to finish. If GitHub stops at 100 files, upload the rest with **Add file > Upload files**. Press **Commit changes**.
3. Repository > **Settings** > **Pages** (left menu) > Build and deployment > Source: **GitHub Actions**.
4. **Actions** tab. Wait for the green tick on "Deploy PMC ID" (about 3 minutes).
5. Settings > Pages > **Custom domain**: type `accounts.pmcstudios.uk` > **Save**.
6. Where pmcstudios.uk's DNS is managed (Cloudflare dashboard > pmcstudios.uk > **DNS** > **Records** > **Add record**): Type `CNAME`, Name `accounts`, Target `<your-github-name>.github.io`, Proxy status **DNS only** (grey cloud). **Save**.
7. Back in Settings > Pages, wait for "DNS check successful" (minutes, sometimes a few hours). Tick **Enforce HTTPS**.
8. Open https://accounts.pmcstudios.uk and press Ctrl+Shift+R. To check everything at once, run `node check-setup.mjs` (Node 18 or newer). Every line should say `ok`.

## Turn on real sign in (later, needs a Supabase project)
1. Repository > **Settings** > **Secrets and variables** > **Actions** > **Variables** tab > **New repository variable**. Name `SUPABASE_URL`, value: your Supabase Project URL.
2. Again **New repository variable**. Name `SUPABASE_ANON_KEY`, value: the **publishable** key (starts `sb_publishable_`). Never the secret key: the deploy stops if it sees one.
3. **Actions** tab > **Deploy PMC ID** > **Run workflow**.

## Updating later
Upload the changed files the same way (**Add file > Upload files**, same folder paths), then **Commit changes**. The Actions tab rebuilds the site.

## On your own computer
Needs Node.js 22 or newer. `npm install`, then `npm run dev` (editing) or `npm run build:static` then `npx serve out` (the real thing).

## Changing the domain
Edit `public/CNAME`, the DNS record and the Custom domain box, and use `node check-setup.mjs --site https://your-new-domain`.
