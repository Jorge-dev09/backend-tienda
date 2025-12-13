// authRoutes.js
const express = require('express');
const router = express.Router();

const {
  registrarUsuario,
  loginUsuario,
  loginAdmin,
  obtenerUsuarioActual,
  recuperarPassword,
  verificarCodigoRecuperacion,
  cambiarPasswordConCodigo
} = require('../controllers/authController');

const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');

router.post('/registro', registrarUsuario);
router.post('/login', loginUsuario);
router.post('/login-admin', loginAdmin);

// Ruta protegida con token
router.get('/me', verificarToken, obtenerUsuarioActual);

// Recuperación
router.post('/recuperar-password', recuperarPassword);
router.post('/verificar-codigo', verificarCodigoRecuperacion);
router.post('/cambiar-password', cambiarPasswordConCodigo);

module.exports = router;
