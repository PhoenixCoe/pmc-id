# Emails

Three emails: one for each of Supabase's **Confirm sign up**, **Reset password** and **Reauthentication** templates.
Each one shows the 6 digit code `{{ .Token }}`. See DEPLOY.md > "Make the emails send" for the numbered steps.

| Supabase template | Subject | Message body |
|---|---|---|
| Confirm sign up | Your PMC ID code | `confirm-signup.html` |
| Reset password | Reset your PMC ID password | `reset-password.html` |
| Reauthentication | Confirm it is you | `reauthentication.html` |
