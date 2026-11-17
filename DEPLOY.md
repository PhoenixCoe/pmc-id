# Putting PMC ID online (accounts.pmcstudios.uk)

GitHub Pages hosts plain files, so the site is built as a static export (`npm run build:static`, written to `out/`).
Sign in uses the real PMC account system (Supabase). Step 3 connects it.

## First time
1. github.com > **+** (top right) > **New repository**. Name it `pmc-id`. Choose **Private**. Leave every "Add a ..." box empty. **Create repository**.
2. On the empty repository page press **uploading an existing file**. Unzip `pmc-id.zip`, select everything inside the folder (Ctrl+A), including the `.github` folder, drag it onto the page and wait for the bar to finish. If GitHub stops at 100 files, upload the rest with **Add file > Upload files**. Press **Commit changes**.
3. Repository > **Settings** > **Secrets and variables** > **Actions** > **Variables** tab > **New repository variable**. Name `SUPABASE_URL`, value: your Supabase Project URL (the one Coe uses). Add a second variable named `SUPABASE_ANON_KEY` with the **publishable** key (starts `sb_publishable_`). Never the secret key: the deploy stops if it sees one.
4. Repository > **Settings** > **Pages** (left menu) > Build and deployment > Source: **GitHub Actions**.
5. **Code** tab > **Add file** > **Create new file**. In the name box type `.github/workflows/pages.yml` (typing each `/` starts a folder). Paste everything from `1-create-this-file-on-GitHub/pages.yml`. Press **Commit changes**. (Browser uploads often skip folders that start with a dot, which is why this file comes separately too.)
6. **Actions** tab. Wait for the green tick on "Deploy PMC ID" (about 3 minutes).
7. Settings > Pages > **Custom domain**: type `accounts.pmcstudios.uk` > **Save**.
8. Where pmcstudios.uk's DNS is managed (Cloudflare dashboard > pmcstudios.uk > **DNS** > **Records** > **Add record**): Type `CNAME`, Name `accounts`, Target `<your-github-name>.github.io`, Proxy status **DNS only** (grey cloud). **Save**.
9. Back in Settings > Pages, wait for "DNS check successful" (minutes, sometimes a few hours). Tick **Enforce HTTPS**.
10. Open https://accounts.pmcstudios.uk and press Ctrl+Shift+R. To check everything at once, run `node check-setup.mjs` (Node 18 or newer). Every line should say `ok`.

## Supabase checklist
1. SQL editor: Coe's `setup.sql` has been run (it makes `profiles`, `app_access` and `pmc_delete_me`).
2. Authentication > Email templates: **Confirm signup**, **Reset password** and **Reauthentication** show the 6 digit code `{{ .Token }}`.
3. Authentication > URL configuration: add `https://accounts.pmcstudios.uk` to the allowed URLs.
4. Changed a variable later? **Actions** tab > **Deploy PMC ID** > **Run workflow**.

## Updating later
Upload the changed files the same way (**Add file > Upload files**, same folder paths), then **Commit changes**. The Actions tab rebuilds the site.

## On your own computer
Needs Node.js 22 or newer. `npm install`, then `npm run dev` (editing) or `npm run build:static` then `npx serve out` (the real thing).

## Changing the domain
Edit `public/CNAME`, the DNS record and the Custom domain box, and use `node check-setup.mjs --site https://your-new-domain`.
