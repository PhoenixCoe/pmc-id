# Putting PMC ID online (id.pmcstudios.uk)

GitHub Pages hosts plain files, so the site is built as a static export (`npm run build:static`, written to `out/`).
Sign in uses the real PMC account system (Supabase). Step 3 connects it.

## First time
1. github.com > **+** (top right) > **New repository**. Name it `pmc-id`. Choose **Private**. Leave every "Add a ..." box empty. **Create repository**.
2. On the empty repository page press **uploading an existing file**. Unzip `pmc-id.zip`, select everything inside the folder (Ctrl+A), including the `.github` folder, drag it onto the page and wait for the bar to finish. If GitHub stops at 100 files, upload the rest with **Add file > Upload files**. Press **Commit changes**.
3. Repository > **Settings** > **Secrets and variables** > **Actions** > **Variables** tab > **New repository variable**. Name `SUPABASE_URL`, value: your Supabase Project URL (the one Coe uses). Add a second variable named `SUPABASE_ANON_KEY` with the **publishable** key (starts `sb_publishable_`). Never the secret key: the deploy stops if it sees one.
4. Repository > **Settings** > **Pages** (left menu) > Build and deployment > Source: **GitHub Actions**.
5. **Code** tab > **Add file** > **Create new file**. In the name box type `.github/workflows/pages.yml` (typing each `/` starts a folder). Paste everything from `1-create-this-file-on-GitHub/pages.yml`. Press **Commit changes**. (Browser uploads often skip folders that start with a dot, which is why this file comes separately too.)
6. **Actions** tab. Wait for the green tick on "Deploy PMC ID" (about 3 minutes).
7. Settings > Pages > **Custom domain**: type `id.pmcstudios.uk` > **Save**.
8. Where pmcstudios.uk's DNS is managed (Cloudflare dashboard > pmcstudios.uk > **DNS** > **Records** > **Add record**): Type `CNAME`, Name `id`, Target `<your-github-name>.github.io`, Proxy status **DNS only** (grey cloud). **Save**.
9. Back in Settings > Pages, wait for "DNS check successful" (minutes, sometimes a few hours). Tick **Enforce HTTPS**.
10. Open https://id.pmcstudios.uk and press Ctrl+Shift+R. To check everything at once, run `node check-setup.mjs` (Node 18 or newer). Every line should say `ok`.

## Make the emails send (codes, password reset)
Supabase's built-in email only sends to people on your Supabase team, and only 2 an hour. That is why codes did not arrive. Fix it once with Resend (free: 100 emails a day, 3,000 a month).
1. resend.com > sign up > **Domains** > **Add Domain**. Type `updates.pmcstudios.uk` (Resend recommends a subdomain). Pick the region nearest your users. **Add**.
2. On the domain page, **Records** tab: add every record shown to Cloudflare (Cloudflare > pmcstudios.uk > **DNS** > **Records** > **Add record**, one at a time, copied exactly). Set **Proxy status** to **DNS only** (grey cloud). If Resend shows a button to sign in to Cloudflare, use that and the records add themselves.
3. Press **Verify DNS Records**. It says **Verified** in a few minutes (can take longer; up to 72 hours at worst).
4. Resend > **API Keys** > **Create API Key**. Name `supabase`, permission **Sending access**, domain `updates.pmcstudios.uk`. **Add**. Copy the key now (starts `re_`). You only see it once.
5. Supabase > your project > **Authentication** > **Notifications** > **Email** > **SMTP Settings**. Turn on **Enable custom SMTP**. Fill in: Sender email `no-reply@updates.pmcstudios.uk`, Sender name `PMC ID`, Host `smtp.resend.com`, Port `465`, Username `resend`, Password the `re_` key. **Save**.
6. Supabase > **Authentication** > **Rate Limits**. Raise **Emails sent per hour** (after custom SMTP it starts low at 30) to 100. Save. Then open **Authentication** > **Sign In / Providers** > **Email** and set **Email OTP Length** to **6**. Save.
7. Supabase > **Authentication** > **Notifications** > **Email** > **Templates**. For each one, paste the subject and the whole file from the `emails` folder into **Message body** (the box that takes HTML), then **Save**:
   - **Confirm sign up**: subject `Your PMC ID code`, body `emails/confirm-signup.html`.
   - **Reset password**: subject `Reset your PMC ID password`, body `emails/reset-password.html`.
   - **Reauthentication**: subject `Confirm it is you`, body `emails/reauthentication.html`.
   - **Password changed** (optional security email, sent after a password change): subject `Your PMC ID password was changed`, body `emails/password-changed.html`. If you do not see it, click your profile picture (bottom left) > **Feature previews** > switch on **Security notification templates**, then switch its notification on.
8. Test: open PMC ID in a private window, make an account with an email that is not on your Supabase team. The code arrives in under a minute (check junk once) and its digits sit in separate boxes. The code is 6 numbers. If the email shows more than 6, set **Email OTP Length** in Supabase (Authentication > Sign In / Providers > Email) to **6** and save. It must match `OTP_LENGTH` in `src/lib/otp.ts`. The email shows 6 or 8 boxes by itself (any other length shows one box).

## Supabase checklist
1. SQL editor: Coe's `setup.sql` has been run (it makes `profiles`, `app_access` and `pmc_delete_me`).
2. Emails: done in the section above.
3. **Authentication** > **URL Configuration**: Site URL `https://id.pmcstudios.uk`. Redirect URLs: add `https://id.pmcstudios.uk/**`, `https://coe.pmcstudios.uk/**`, `https://tools.pmcstudios.uk/**` and `https://pmcstudios.uk/**`.
4. Changed a variable later? **Actions** tab > **Deploy PMC ID** > **Run workflow**.

## Updating later
Upload the changed files the same way (**Add file > Upload files**, same folder paths), then **Commit changes**. The Actions tab rebuilds the site.

## On your own computer
Needs Node.js 22 or newer. `npm install`, then `npm run dev` (editing) or `npm run build:static` then `npx serve out` (the real thing).

## Changing the domain
Edit `public/CNAME`, the DNS record and the Custom domain box, and use `node check-setup.mjs --site https://your-new-domain`.
