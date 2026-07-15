// Shared Supabase client for the internal leads dashboard (qr-generator.html, hub.html).
// This key is meant to be public — it's an anon/publishable key, safe to ship
// in client-side code. Access control on the `leads` table is handled by
// Postgres row-level security policies, not by keeping this key secret.
const SUPABASE_URL = 'https://vjrdvihahhnnyicnbdwr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_DinQjq_StcGzKtt3YM2O8w_4BM_VSFD';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
