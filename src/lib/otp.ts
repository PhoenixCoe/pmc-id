/** How many numbers are in the emailed code. This must match Supabase: Authentication > Sign In / Providers > Email > Email OTP Length.
 *  It is 6. The emails in /emails show 6 or 8 boxes by themselves. If you ever change the length in Supabase, change this number to match and deploy again. */
export const OTP_LENGTH = 6;
