// The Supabase project behind accounts and leaderboards (see supabase/schema.sql): the original game's project, kept
// (the recreation brief: Supabase preserved). A development or staging project can be used instead without touching
// the code: VITE_SUPABASE_REF and VITE_SUPABASE_KEY in a .env.local file (never commit a service-role key: the browser
// only ever gets a publishable key).
export const SUPABASE_REF: string = import.meta.env.VITE_SUPABASE_REF || 'lgzkfgpopofabmjlxxli';
export const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
/** publishable key: safe in the browser, the database rules decide what it can do */
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_60xgi51nmCnfK6-kCJSXgQ_Bq3rzVb7';

/** accounts (sign in, sign up, cloud saves): off in this build (the owner, 2026-10-18: "remove any sign in for the game
 *  for now"); everyone rides as a guest and progress stays on the device. VITE_ACCOUNTS=on in .env.local turns them on. */
export const ACCOUNTS = import.meta.env.VITE_ACCOUNTS === 'on';

/** midnight at the start of this Monday, local time: when Hall Week resets */
export function weekStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
}

/**
 * Paystack PUBLIC key (pk_test_... or pk_live_...), safe in the browser. Leave it empty until the
 * money features are set up (supabase/functions/README.md): while it is empty, Buy coins, the
 * Weekly prize race and the Wallet show "Coming soon". The SECRET key never goes here.
 */
export const PAYSTACK_PUBLIC_KEY = '';
/** where the money Edge Functions live */
export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
