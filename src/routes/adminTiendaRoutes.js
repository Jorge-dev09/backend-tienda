// backend/routes/adminTiendaRoutes.js
const express = require('express');
const router = express.Router();
const { verificarToken, verificarAdmin } = require('../middleware/authMiddleware');
const adminTiendaController = require('../controllers/adminTiendaController');

// Todas requieren admin
router.use(verificarToken, verificarAdmin);

// Listar productos con filtros
router.get('/productos', adminTiendaController.listarProductosAdmin);

// Crear producto
router.post('/productos', adminTiendaController.crearProducto);

// Actualizar producto
router.put('/productos/:id_producto', adminTiendaController.actualizarProducto);

// Desactivar / activar producto
router.patch('/productos/:id_producto/estado', adminTiendaController.cambiarEstadoProducto);

// Eliminar producto (opcional)
router.delete('/productos/:id_producto', adminTiendaController.eliminarProducto);

// Ver órdenes de tienda
router.get('/ordenes', adminTiendaController.listarOrdenes);
router.get('/ordenes/:id_orden', adminTiendaController.obtenerDetalleOrdenAdmin);

module.exports = router;
