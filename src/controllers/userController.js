// controllers/userController.js
const { pool } = require('../config/database');

const obtenerPerfil = async (req, res) => {
  const { id_usuario } = req.usuario;

  try {
    const [usuarios] = await pool.query(
      `SELECT 
         u.id_usuario,
         u.nombre,
         u.apellido,
         u.email,
         u.telefono,
         u.avatar_url,
         u.direccion,
         u.ciudad,
         u.estado,
         u.codigo_postal,
         u.es_admin,
         ua.tipo_vivienda,
         ua.tiene_patio,
         ua.hogar,
         ua.otros_animales,
         ua.experiencia_mascotas,
         ua.tiempo_fuera_casa
       FROM usuarios u
       LEFT JOIN usuario_adopcion ua ON ua.id_usuario = u.id_usuario
       WHERE u.id_usuario = ?`,
      [id_usuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuarios[0]);
  } catch (error) {
    console.error('Error en obtenerPerfil:', error);
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
};

const actualizarPerfil = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id_usuario } = req.usuario;
    const {
      nombre,
      apellido,
      telefono,
      direccion,
      ciudad,
      estado,
      codigo_postal,
      avatar_url,
      // datos adopción
      tipo_vivienda,
      tiene_patio,
      hogar,
      otros_animales,
      experiencia_mascotas,
      tiempo_fuera_casa
    } = req.body;

    // 1) Actualizar tabla usuarios
    await connection.query(
      `UPDATE usuarios SET
         nombre = ?,
         apellido = ?,
         telefono = ?,
         direccion = ?,
         ciudad = ?,
         estado = ?,
         codigo_postal = ?,
         avatar_url = ?
       WHERE id_usuario = ?`,
      [
        nombre,
        apellido,
        telefono || null,
        direccion || null,
        ciudad || null,
        estado || null,
        codigo_postal || null,
        avatar_url || null,
        id_usuario
      ]
    );

    // 2) Upsert en usuario_adopcion
    const [rows] = await connection.query(
      'SELECT id_usuario_adopcion FROM usuario_adopcion WHERE id_usuario = ?',
      [id_usuario]
    );

    if (rows.length === 0) {
      await connection.query(
        `INSERT INTO usuario_adopcion
         (id_usuario, tipo_vivienda, tiene_patio, hogar, otros_animales, experiencia_mascotas, tiempo_fuera_casa)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id_usuario,
          tipo_vivienda || null,
          tiene_patio || null,
          hogar || null,
          otros_animales || null,
          experiencia_mascotas || null,
          tiempo_fuera_casa || null
        ]
      );
    } else {
      await connection.query(
        `UPDATE usuario_adopcion SET
           tipo_vivienda = ?,
           tiene_patio = ?,
           hogar = ?,
           otros_animales = ?,
           experiencia_mascotas = ?,
           tiempo_fuera_casa = ?
         WHERE id_usuario = ?`,
        [
          tipo_vivienda || null,
          tiene_patio || null,
          hogar || null,
          otros_animales || null,
          experiencia_mascotas || null,
          tiempo_fuera_casa || null,
          id_usuario
        ]
      );
    }

    await connection.commit();

    res.json({ mensaje: 'Perfil actualizado correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error en actualizarPerfil:', error);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  } finally {
    connection.release();
  }
};

const obtenerAjustes = async (req, res) => {
  const { id_usuario } = req.usuario;

  try {
    const [rows] = await pool.query(
      `SELECT 
         id_usuario_ajustes,
         id_usuario,
         tema,
         notif_solicitudes_propias,
         notif_solicitudes_enviadas,
         notif_marketing
       FROM usuario_ajustes
       WHERE id_usuario = ?`,
      [id_usuario]
    );

    if (rows.length === 0) {
      // Crear ajustes por defecto si no existen
      const [result] = await pool.query(
        `INSERT INTO usuario_ajustes
         (id_usuario, tema, notif_solicitudes_propias, notif_solicitudes_enviadas, notif_marketing)
         VALUES (?, 'claro', 1, 1, 0)`,
        [id_usuario]
      );

      return res.json({
        id_usuario_ajustes: result.insertId,
        id_usuario,
        tema: 'claro',
        notif_solicitudes_propias: 1,
        notif_solicitudes_enviadas: 1,
        notif_marketing: 0
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error en obtenerAjustes:', error);
    res.status(500).json({ error: 'Error al obtener ajustes' });
  }
};

const actualizarAjustes = async (req, res) => {
  const { id_usuario } = req.usuario;
  const {
    tema,
    notif_solicitudes_propias,
    notif_solicitudes_enviadas,
    notif_marketing
  } = req.body;

  try {
    // upsert
    const [rows] = await pool.query(
      'SELECT id_usuario_ajustes FROM usuario_ajustes WHERE id_usuario = ?',
      [id_usuario]
    );

    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO usuario_ajustes
         (id_usuario, tema, notif_solicitudes_propias, notif_solicitudes_enviadas, notif_marketing)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id_usuario,
          tema || 'claro',
          notif_solicitudes_propias ?? 1,
          notif_solicitudes_enviadas ?? 1,
          notif_marketing ?? 0
        ]
      );
    } else {
      await pool.query(
        `UPDATE usuario_ajustes SET
           tema = ?,
           notif_solicitudes_propias = ?,
           notif_solicitudes_enviadas = ?,
           notif_marketing = ?
         WHERE id_usuario = ?`,
        [
          tema || 'claro',
          notif_solicitudes_propias ?? 1,
          notif_solicitudes_enviadas ?? 1,
          notif_marketing ?? 0,
          id_usuario
        ]
      );
    }

    res.json({ mensaje: 'Ajustes actualizados correctamente' });
  } catch (error) {
    console.error('Error en actualizarAjustes:', error);
    res.status(500).json({ error: 'Error al actualizar ajustes' });
  }
};

module.exports = {
  obtenerPerfil,
  actualizarPerfil,
  obtenerAjustes,
  actualizarAjustes
};
