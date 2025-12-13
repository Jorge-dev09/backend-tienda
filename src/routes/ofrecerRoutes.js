const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/authMiddleware');
const { pool } = require('../config/database');

router.post('/', verificarToken, async (req, res) => {
  // el token debe tener { id_usuario, ... }
  const { id_usuario } = req.usuario;

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
    motivo_adopcion,
    experiencia_mascotas,
    vivienda_tipo,
    tiene_patio,
    otros_animales,
    descripcion_otros_animales
  } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1) Insert en animales (NO disponible todavía)
    const [animalRes] = await conn.query(
      `INSERT INTO animales
       (nombre, especie, raza, edad_anos, edad_meses, tamanio, genero,
        descripcion, estado_salud, vacunas, esterilizado, imagen_url,
        estado_adopcion, fecha_ingreso)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_revision', CURDATE())`,
      [
        nombre,
        especie,
        raza || null,
        edad_anos ? Number(edad_anos) : null,
        edad_meses ? Number(edad_meses) : null,
        tamanio,
        genero,
        descripcion || null,
        estado_salud || null,
        vacunas ? 1 : 0,
        esterilizado ? 1 : 0,
        imagen_url || null
      ]
    );

    const id_animal = animalRes.insertId;

    // 2) Insert en solicitudes_adopcion como "ofrecer"
    const [solRes] = await conn.query(
      `INSERT INTO solicitudes_adopcion
       (id_usuario, id_animal, tipo_solicitud, motivo_adopcion, experiencia_mascotas,
        vivienda_tipo, tiene_patio, otros_animales, descripcion_otros_animales, estado)
       VALUES (?, ?, 'ofrecer', ?, ?, ?, ?, ?, ?, 'enviada')`,
      [
        id_usuario,
        id_animal,
        motivo_adopcion,
        experiencia_mascotas || null,
        vivienda_tipo,
        tiene_patio ? 1 : 0,
        otros_animales ? 1 : 0,
        descripcion_otros_animales || null
      ]
    );

    await conn.commit();

    res.status(201).json({
      mensaje: 'Solicitud para dar en adopción creada',
      id_animal,
      id_solicitud: solRes.insertId
    });
  } catch (error) {
    await conn.rollback();
    console.error('Error en POST /api/ofrecer:', error);
    res.status(500).json({ error: 'Error al crear la solicitud de adopción' });
  } finally {
    conn.release();
  }
});

module.exports = router;
