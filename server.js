require('dotenv').config();
const express = require('express');
const db = require('./SRC/db/db'); // conexión a PostgreSQL
const { scheduleSupabaseKeepAlive } = require('./SRC/helpers/supabaseKeepAlive');

const app = express();
// API histórica no forma parte del runtime de escritorio. Si se necesita para
// una integración controlada, debe habilitarse explícitamente en localhost.
if (process.env.START_API !== 'true') {
  module.exports = app;
} else {
app.use(express.json({ limit: '100kb' }));

// -------------------- PRODUCTOS --------------------

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM app.productos ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Crear producto
app.post('/api/productos', async (req, res) => {
  try {
    const { codigodebarra, nombre, precio } = req.body;
    const result = await db.query(
      'INSERT INTO app.productos (codigodebarra, nombre, precio) VALUES ($1, $2, $3) RETURNING *',
      [codigodebarra, nombre, precio]
    );
    res.json({ success: true, producto: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { codigodebarra, nombre, precio } = req.body;
    await db.query(
      'UPDATE app.productos SET codigodebarra=$1, nombre=$2, precio=$3 WHERE id=$4',
      [codigodebarra, nombre, precio, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Eliminar producto
app.delete('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM app.productos WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// -------------------- USUARIOS --------------------

// Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM usuarios ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Crear usuario
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, email, password, rol]
    );
    res.json({ success: true, usuario: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Actualizar usuario
app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, rol } = req.body;
    await db.query(
      'UPDATE usuarios SET nombre=$1, email=$2, password=$3, rol=$4 WHERE id=$5',
      [nombre, email, password, rol, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM usuarios WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// -------------------- PUERTO --------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, '127.0.0.1', () => console.log(`API REST local corriendo en puerto ${PORT}`));

// Lanzar tarea de keep-alive para evitar que Supabase entre en pausa
scheduleSupabaseKeepAlive();

module.exports = app;
}
