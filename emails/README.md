# Emails

Four emails: one for each of Supabase's **Confirm sign up**, **Reset password**, **Reauthentication** and **Password changed** templates.
Each one shows the 6 digit code `{{ .Token }}`. See DEPLOY.md > "Make the emails send" for the numbered steps.

| Supabase template | Subject | Message body |
|---|---|---|
| Confirm sign up | Your PMC ID code | `confirm-signup.html` |
| Reset password | Reset your PMC ID password | `reset-password.html` |
| Reauthentication | Confirm it is you | `reauthentication.html` |
| Password changed (optional) | Your PMC ID password was changed | `password-changed.html` |

The logo and fonts load from https://id.pmcstudios.uk, so the site must be live first. Apple Mail and iOS Mail show PMC Header and PMC Font. Gmail and Outlook ignore custom fonts and show a plain fallback, but the logo and layout are the same.
