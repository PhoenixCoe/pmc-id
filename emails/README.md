# Emails

Four emails, one for each of Supabase's **Confirm sign up**, **Reset password**, **Reauthentication** and **Password changed** templates.
Each one is the PMC ID sign in card: the PMC ID logo above a card with a green halftone panel (red for the password changed alert), the big title bottom left, and the 6 digit code in six boxes. See DEPLOY.md > "Make the emails send" for the numbered steps.

| Supabase template | Subject | Message body | Button goes to |
|---|---|---|---|
| Confirm sign up | Your PMC ID code | `confirm-signup.html` | /create/code/ |
| Reset password | Reset your PMC ID password | `reset-password.html` | /reset/ |
| Reauthentication | Confirm it is you | `reauthentication.html` | /security/ |
| Password changed (optional) | Your PMC ID password was changed | `password-changed.html` | /reset/ |

The code is `{{ .Token }}`. The six boxes use `{{ if eq (len .Token) 6 }}` and `{{ slice .Token 0 1 }}`; if your code length is not 6 the email shows one box instead.

The logo, titles, halftone and fonts load from https://id.pmcstudios.uk (`public/img/email/` and `public/fonts/`), so the site must be live first. The big titles are pictures (with alt text) because Gmail and Outlook ignore custom fonts; Apple Mail and iOS Mail also load PMC Header and PMC Font for the rest.
