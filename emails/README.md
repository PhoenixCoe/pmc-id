# Emails

Four emails, one for each of Supabase's **Confirm sign up**, **Reset password**, **Reauthentication** and **Password changed** templates.
Each one is the PMC ID sign in card: the PMC ID logo above a card with a green halftone panel (red for the password changed alert), the big title bottom left, and the 6 digit code in separate boxes. See DEPLOY.md > "Make the emails send" for the numbered steps.

| Supabase template | Subject | Message body | Button goes to |
|---|---|---|---|
| Confirm sign up | Your PMC ID code | `confirm-signup.html` | /create/code/ |
| Reset password | Reset your PMC ID password | `reset-password.html` | /reset/ |
| Reauthentication | Confirm it is you | `reauthentication.html` | /security/ |
| Password changed (optional) | Your PMC ID password was changed | `password-changed.html` | /reset/ |

The code is `{{ .Token }}`. The boxes use `{{ if eq (len .Token) 6 }}`, `{{ else if eq (len .Token) 8 }}` and `{{ slice .Token 0 1 }}`; any other code length shows one box. The code on the PMC ID site is `OTP_LENGTH` in `src/lib/otp.ts`, and it is 6 and must equal Supabase's **Email OTP Length**.

The logo, titles, halftone and fonts load from https://id.pmcstudios.uk (`public/img/email/` and `public/fonts/`), so the site must be live first. The big titles are pictures (with alt text) because Gmail and Outlook ignore custom fonts; Apple Mail and iOS Mail also load PMC Header and PMC Font for the rest.
