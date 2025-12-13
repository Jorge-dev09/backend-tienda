const { verificarToken } = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Perfil
router.get('/user/me', verificarToken, userController.obtenerPerfil);
router.put('/user/me', verificarToken, userController.actualizarPerfil);

// Ajustes
router.get('/user/settings', verificarToken, userController.obtenerAjustes);
router.put('/user/settings', verificarToken, userController.actualizarAjustes);

module.exports = router;
