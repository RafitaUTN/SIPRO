// db/db.js - Adaptador para Supabase
const { createClient } = require('@supabase/supabase-js');
const { loadEnv } = require('../helpers/loadEnv');

loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class SupabaseQueryHandler {
  async query(text, params = []) {
    try {
      // Detectar tabla
      let table = null;
      if (text.includes('FROM app.')) {
        table = text.match(/FROM app\.(\w+)/i)?.[1];
      } else if (text.includes('INTO app.')) {
        table = text.match(/INTO app\.(\w+)/i)?.[1];
      } else if (text.includes('UPDATE app.')) {
        table = text.match(/UPDATE app\.(\w+)/i)?.[1];
      } else if (text.includes('DELETE FROM app.')) {
        table = text.match(/DELETE FROM app\.(\w+)/i)?.[1];
      }

      if (!table) {
        throw new Error(`No se pudo detectar tabla en: ${text}`);
      }

      // SELECT
      if (text.toUpperCase().includes('SELECT')) {
        return await this._handleSelect(text, params, table);
      }

      // INSERT
      if (text.toUpperCase().includes('INSERT')) {
        return await this._handleInsert(text, params, table);
      }

      // UPDATE
      if (text.toUpperCase().includes('UPDATE')) {
        return await this._handleUpdate(text, params, table);
      }

      // DELETE
      if (text.toUpperCase().includes('DELETE')) {
        return await this._handleDelete(text, params, table);
      }

      throw new Error(`Operación SQL no soportada`);
    } catch (err) {
      console.error('Error Supabase:', err.message);
      throw err;
    }
  }

  async _handleSelect(text, params, table) {
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) throw error;
    return { rows: data || [] };
  }

  async _handleInsert(text, params, table) {
    const columnMatch = text.match(/\((.*?)\)\s*VALUES/i);
    if (!columnMatch) throw new Error('Formato INSERT inválido');

    const columns = columnMatch[1].split(',').map(c => c.trim());
    const insertData = {};
    columns.forEach((col, i) => {
      insertData[col] = params[i];
    });

    const { data, error } = await supabase
      .from(table)
      .insert([insertData])
      .select();

    if (error) throw error;
    return { rows: data || [] };
  }

  async _handleUpdate(text, params, table) {
    const whereMatch = text.match(/WHERE\s+(\w+)\s*=\s*\$(\d+)/i);
    if (!whereMatch) throw new Error('UPDATE sin WHERE detectado');

    const whereColumn = whereMatch[1];
    const whereParamIndex = parseInt(whereMatch[2]) - 1;

    const setMatch = text.match(/SET\s+(.*?)\s+WHERE/i);
    if (!setMatch) throw new Error('Formato UPDATE inválido');

    const updateData = {};
    const setPairs = setMatch[1].split(',');
    let paramIndex = 0;

    setPairs.forEach(pair => {
      const [col] = pair.split('=').map(s => s.trim());
      updateData[col] = params[paramIndex++];
    });

    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq(whereColumn, params[whereParamIndex])
      .select();

    if (error) throw error;
    return { rows: data || [] };
  }

  async _handleDelete(text, params, table) {
    const whereMatch = text.match(/WHERE\s+(\w+)\s*=\s*\$(\d+)/i);
    if (!whereMatch) throw new Error('DELETE sin WHERE detectado');

    const whereColumn = whereMatch[1];

    const { error } = await supabase
      .from(table)
      .delete()
      .eq(whereColumn, params[0]);

    if (error) throw error;
    return { rows: [] };
  }
}

module.exports = new SupabaseQueryHandler();
