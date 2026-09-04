const { createClient } = require('@supabase/supabase-js');
const { loadEnv } = require('./loadEnv');

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const keepAliveTable = process.env.SUPABASE_KEEPALIVE_TABLE || 'usuarios';
const keepAliveDisabled = process.env.SUPABASE_KEEPALIVE_DISABLED === 'true';

const minDays = Number(process.env.SUPABASE_KEEPALIVE_MIN_DAYS) || 3;
const maxDays = Number(process.env.SUPABASE_KEEPALIVE_MAX_DAYS) || 5;
const millisInDay = 24 * 60 * 60 * 1000;

const randomDelay = () => {
  const min = Math.max(minDays, 1) * millisInDay;
  const max = Math.max(maxDays, minDays) * millisInDay;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Supabase keep-alive] Variables SUPABASE_URL o SUPABASE_ANON_KEY no están configuradas.');
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
};

const scheduleSupabaseKeepAlive = () => {
  if (keepAliveDisabled) {
    console.log('[Supabase keep-alive] Deshabilitado por SUPABASE_KEEPALIVE_DISABLED=true');
    return;
  }

  const client = createSupabaseClient();
  if (!client) return;

  const ping = async () => {
    try {
      const start = Date.now();
      const { error } = await client
        .from(keepAliveTable)
        .select('id', { count: 'exact', head: true })
        .limit(1);

      if (error) throw error;
      const duration = Date.now() - start;
      console.log(`[Supabase keep-alive] Ping exitoso en ${duration}ms. Tabla usada: ${keepAliveTable}`);
    } catch (err) {
      console.error('[Supabase keep-alive] Error al hacer ping:', err.message);
    } finally {
      const delay = randomDelay();
      const days = (delay / millisInDay).toFixed(2);
      console.log(`[Supabase keep-alive] Próximo ping en ${days} días.`);
      setTimeout(ping, delay);
    }
  };

  ping();
};

module.exports = { scheduleSupabaseKeepAlive };
