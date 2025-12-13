// backend/src/routes/adminSolicitudRoutes.js
const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');
const { pool } = require('../config/database');

// aprobar oferta (ofrecer mascota)
router.put('/:id/aprobar-oferta',
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { id } = req.params; // id_solicitud
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        'SELECT id_animal FROM solicitudes_adopcion WHERE id_solicitud = ?',
        [id]
      );

      if (!rows.length) {
        await conn.rollback();
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }

      const { id_animal } = rows[0];

      await conn.query(
        `UPDATE solicitudes_adopcion
         SET estado = 'aprobada', fecha_aprobacion = NOW()
         WHERE id_solicitud = ?`,
        [id]
      );

      await conn.query(
        `UPDATE animales
         SET estado_adopcion = 'Disponible'
         WHERE id_animal = ?`,
        [id_animal]
      );

      await conn.commit();
      res.json({ mensaje: 'Oferta aprobada y animal publicado' });
    } catch (error) {
      await conn.rollback();
      console.error('Error en aprobar-oferta:', error);
      res.status(500).json({ error: 'Error al aprobar la oferta' });
    } finally {
      conn.release();
    }
  }
);

module.exports = router;
