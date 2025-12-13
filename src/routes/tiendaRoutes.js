// backend/routes/tiendaRoutes.js
const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/authMiddleware');
const tiendaController = require('../controllers/tiendaController');

// Productos (público)
router.get('/productos', tiendaController.listarProductos);

// Carrito del usuario (requiere login)
router.get('/carrito', verificarToken, tiendaController.obtenerCarrito);
router.post('/carrito/items', verificarToken, tiendaController.agregarAlCarrito);
router.put('/carrito/items/:id_carrito', verificarToken, tiendaController.actualizarCantidadCarrito);
router.delete('/carrito/items/:id_carrito', verificarToken, tiendaController.eliminarDelCarrito);

// Checkout (crear orden)
router.post('/checkout', verificarToken, tiendaController.realizarCheckout);

// Órdenes del usuario
router.get('/ordenes', verificarToken, tiendaController.listarOrdenesUsuario);
router.get('/ordenes/:id_orden', verificarToken, tiendaController.obtenerDetalleOrden);

module.exports = router;
