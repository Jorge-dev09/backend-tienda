// backend/routes/solicitudRoutes.js
const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');
const solicitudController = require('../controllers/solicitudController');

// ============================================
// RUTAS PARA USUARIOS
// ============================================

// POST /api/solicitudes - Crear nueva solicitud (ADOPTAR)
// El controlador debe hacer INSERT con tipo_solicitud = 'adoptar'
router.post(
  '/',
  verificarToken,
  solicitudController.crearSolicitud
);

// GET /api/solicitudes/mis-solicitudes - Obtener solicitudes del usuario
router.get(
  '/mis-solicitudes',
  verificarToken,
  solicitudController.obtenerMisSolicitudes
);

// GET /api/solicitudes/mis-solicitudes/:id_solicitud - Detalle de solicitud
router.get(
  '/mis-solicitudes/:id_solicitud',
  verificarToken,
  solicitudController.obtenerDetalleSolicitud
);

// PUT /api/solicitudes/:id_solicitud/cancelar - Cancelar solicitud (usuario)
router.put(
  '/:id_solicitud/cancelar',
  verificarToken,
  solicitudController.cancelarSolicitud
);

// POST /api/solicitudes/:id_solicitud/mensajes - Agregar mensaje
router.post(
  '/:id_solicitud/mensajes',
  verificarToken,
  solicitudController.agregarMensaje
);

// ============================================
// RUTAS PARA ADMINISTRADORES
// ============================================

// GET /api/solicitudes/admin/estadisticas
router.get(
  '/admin/estadisticas',
  verificarToken,
  verificarAdmin,
  solicitudController.obtenerEstadisticas
);

// GET /api/solicitudes/admin/todas - Obtener todas las solicitudes
// Debe soportar filtros por estado, búsqueda y tipo_solicitud (adoptar/ofrecer)
router.get(
  '/admin/todas',
  verificarToken,
  verificarAdmin,
  solicitudController.obtenerTodasSolicitudes
);

// GET /api/solicitudes/admin/:id_solicitud - Detalle completo
router.get(
  '/admin/:id_solicitud',
  verificarToken,
  verificarAdmin,
  solicitudController.obtenerDetalleSolicitudAdmin
);

// PUT /api/solicitudes/admin/:id_solicitud/estado - Cambiar estado
router.put(
  '/admin/:id_solicitud/estado',
  verificarToken,
  verificarAdmin,
  solicitudController.cambiarEstadoSolicitud
);

module.exports = router;
