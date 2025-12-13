const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

//
// 1) LISTADO PÚBLICO (solo disponibles) -> usado por /adoptar
//
router.get('/', async (req, res) => {
  const { especie, tamanio, edad_anos, raza, genero } = req.query;
  
  try {
    let query = 'SELECT * FROM animales WHERE estado_adopcion = "Disponible"';
    const values = [];

    if (especie) { 
      query += ' AND especie = ?'; 
      values.push(especie); 
    }
    if (tamanio) { 
      query += ' AND tamanio = ?'; 
      values.push(tamanio); 
    }
    if (edad_anos) { 
      query += ' AND edad_anos = ?'; 
      values.push(edad_anos); 
    }
    if (raza) { 
      query += ' AND raza LIKE ?'; 
      values.push('%' + raza + '%'); 
    }
    if (genero) { 
      query += ' AND genero = ?'; 
      values.push(genero); 
    }

    const [rows] = await pool.query(query, values);
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /animales:', err);
    res.status(500).json({ error: 'Error al obtener animales' });
  }
});

//
// 2) LISTADO ADMIN (todos los animales) -> usado por AdminAnimalesPage
//
router.get('/animales/admin', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM animales ORDER BY fecha_ingreso DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error en GET /animales/admin:', err);
    res.status(500).json({ error: 'Error al obtener animales para admin' });
  }
});

//
// 3) CREAR ANIMAL (admin) - POST /api/animales
//
router.post('/animales', async (req, res) => {
  const {
    nombre,
    especie,
    raza,
    edad_anos,
    edad_meses,
    tamanio,
    genero,
    descripcion,
    estado_salud,
    vacunas,
    esterilizado,
    imagen_url,
    estado_adopcion,
    fecha_ingreso
  } = req.body;

  if (!nombre || !especie || !tamanio || !genero || !fecha_ingreso) {
    return res.status(400).json({
      error: 'Nombre, especie, tamaño, género y fecha_ingreso son obligatorios'
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO animales 
       (nombre, especie, raza, edad_anos, edad_meses, tamanio, genero, descripcion,
        estado_salud, vacunas, esterilizado, imagen_url, estado_adopcion, fecha_ingreso)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        especie,
        raza || null,
        edad_anos || null,
        edad_meses || null,
        tamanio,
        genero,
        descripcion || null,
        estado_salud || null,
        vacunas ? 1 : 0,
        esterilizado ? 1 : 0,
        imagen_url || null,
        estado_adopcion || 'Disponible',
        fecha_ingreso
      ]
    );

    res.status(201).json({
      mensaje: 'Animal creado correctamente',
      id_animal: result.insertId
    });
  } catch (err) {
    console.error('Error en POST /animales:', err);
    res.status(500).json({ error: 'Error al crear animal' });
  }
});

//
// 4) EDITAR ANIMAL (admin) - PUT /api/animales/:id
//
router.put('/animales/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    especie,
    raza,
    edad_anos,
    edad_meses,
    tamanio,
    genero,
    descripcion,
    estado_salud,
    vacunas,
    esterilizado,
    imagen_url,
    estado_adopcion,
    fecha_ingreso
  } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE animales SET
        nombre = ?,
        especie = ?,
        raza = ?,
        edad_anos = ?,
        edad_meses = ?,
        tamanio = ?,
        genero = ?,
        descripcion = ?,
        estado_salud = ?,
        vacunas = ?,
        esterilizado = ?,
        imagen_url = ?,
        estado_adopcion = ?,
        fecha_ingreso = ?
       WHERE id_animal = ?`,
      [
        nombre,
        especie,
        raza || null,
        edad_anos || null,
        edad_meses || null,
        tamanio,
        genero,
        descripcion || null,
        estado_salud || null,
        vacunas ? 1 : 0,
        esterilizado ? 1 : 0,
        imagen_url || null,
        estado_adopcion || 'Disponible',
        fecha_ingreso,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    res.json({ mensaje: 'Animal actualizado correctamente' });
  } catch (err) {
    console.error('Error en PUT /animales/:id:', err);
    res.status(500).json({ error: 'Error al actualizar animal' });
  }
});

//
// 5) ELIMINAR ANIMAL (admin) - ya lo tienes
//
router.delete('/animales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM animales WHERE id_animal = ?', [id]);
    res.json({ mensaje: 'Animal eliminado correctamente' });
  } catch (err) {
    console.error('Error en DELETE /animales/:id', err);
    res.status(500).json({ error: 'Error al eliminar animal' });
  }
});

module.exports = router;
