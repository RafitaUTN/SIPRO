const { createClient } = require('@supabase/supabase-js');
const { loadEnv } = require('../helpers/loadEnv');

loadEnv();
let client;

function getSupabase() {
  if (client) return client;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_ANON_KEY son obligatorios');
  }
  client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false }
  });
  return client;
}

module.exports = { getSupabase };
