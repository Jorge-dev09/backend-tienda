// backend/controllers/tiendaController.js
const { pool } = require('../config/database');

// GET /api/tienda/productos
const listarProductos = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { categoria, especie, q, precio_min, precio_max } = req.query;

    let query = `
      SELECT *
      FROM productos
      WHERE activo = 1
    `;
    const params = [];

    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }

    if (especie && especie !== 'Todas') {
      query += ' AND (especie_destino = ? OR especie_destino = "Todas")';
      params.push(especie);
    }

    if (q) {
      query += ' AND nombre LIKE ?';
      params.push(`%${q}%`);
    }

    if (precio_min) {
      query += ' AND precio >= ?';
      params.push(precio_min);
    }

    if (precio_max) {
      query += ' AND precio <= ?';
      params.push(precio_max);
    }

    query += ' ORDER BY fecha_registro DESC';

    const [rows] = await connection.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  } finally {
    connection.release();
  }
};

// Helpers para carrito: obtener o crear carrito activo
const getOrCreateCarrito = async (connection, id_usuario) => {
  // En tu esquema actual, carrito es por producto (sin tabla de cabecera),
  // así que el "carrito activo" es simplemente las filas en carrito con ese id_usuario.
  // No necesitamos otra tabla de cabecera por ahora.
  return;
};

// GET /api/tienda/carrito
const obtenerCarrito = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_usuario } = req.usuario;

    const [items] = await connection.query(
      `SELECT 
         c.id_carrito,
         c.id_producto,
         c.cantidad,
         c.fecha_agregado,
         p.nombre,
         p.precio,
         p.imagen_url,
         p.categoria
       FROM carrito c
       INNER JOIN productos p ON c.id_producto = p.id_producto
       WHERE c.id_usuario = ?
       ORDER BY c.fecha_agregado DESC`,
      [id_usuario]
    );

    // Calcular subtotal
    const subtotal = items.reduce(
      (acc, item) => acc + item.precio * item.cantidad,
      0
    );

    res.json({ items, subtotal });
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({ error: 'Error al obtener el carrito' });
  } finally {
    connection.release();
  }
};

// POST /api/tienda/carrito/items
const agregarAlCarrito = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_usuario } = req.usuario;
    const { id_producto, cantidad = 1 } = req.body;

    if (!id_producto || cantidad <= 0) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Verificar stock
    const [productos] = await connection.query(
      'SELECT stock FROM productos WHERE id_producto = ? AND activo = 1',
      [id_producto]
    );
    if (!productos.length) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Insertar o actualizar cantidad (tienes UNIQUE (id_usuario,id_producto))
    await connection.query(
      `INSERT INTO carrito (id_usuario, id_producto, cantidad)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE cantidad = GREATEST(1, carrito.cantidad + VALUES(cantidad))`,
      [id_usuario, id_producto, cantidad]
    );

    res.status(201).json({ mensaje: 'Producto agregado al carrito' });
  } catch (error) {
    console.error('Error al agregar al carrito:', error);
    res.status(500).json({ error: 'Error al agregar producto al carrito' });
  } finally {
    connection.release();
  }
};

// PUT /api/tienda/carrito/items/:id_carrito
const actualizarCantidadCarrito = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_usuario } = req.usuario;
    const { id_carrito } = req.params;
    const { cantidad } = req.body;

    if (cantidad <= 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    const [result] = await connection.query(
      `UPDATE carrito
       SET cantidad = ?
       WHERE id_carrito = ? AND id_usuario = ?`,
      [cantidad, id_carrito, id_usuario]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    res.json({ mensaje: 'Cantidad actualizada' });
  } catch (error) {
    console.error('Error al actualizar carrito:', error);
    res.status(500).json({ error: 'Error al actualizar el carrito' });
  } finally {
    connection.release();
  }
};

// DELETE /api/tienda/carrito/items/:id_carrito
const eliminarDelCarrito = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_usuario } = req.usuario;
    const { id_carrito } = req.params;

    const [result] = await connection.query(
      `DELETE FROM carrito WHERE id_carrito = ? AND id_usuario = ?`,
      [id_carrito, id_usuario]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    res.json({ mensaje: 'Item eliminado del carrito' });
  } catch (error) {
    console.error('Error al eliminar del carrito:', error);
    res.status(500).json({ error: 'Error al eliminar del carrito' });
  } finally {
    connection.release();
  }
};

// POST /api/tienda/checkout
const realizarCheckout = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id_usuario } = req.usuario;
    const { direccion_envio, metodo_pago } = req.body;

    // Obtener items del carrito
    const [items] = await connection.query(
      `SELECT c.*, p.precio, p.stock
       FROM carrito c
       INNER JOIN productos p ON c.id_producto = p.id_producto
       WHERE c.id_usuario = ?`,
      [id_usuario]
    );

    if (!items.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Verificar stock
    for (const item of items) {
      if (item.cantidad > item.stock) {
        await connection.rollback();
        return res.status(400).json({
          error: `Stock insuficiente para el producto ${item.id_producto}`
        });
      }
    }

    // Calcular total
    const total = items.reduce(
      (acc, item) => acc + item.precio * item.cantidad,
      0
    );

    // Crear orden
    const [ordenRes] = await connection.query(
      `INSERT INTO ordenes
       (id_usuario, total, estado, metodo_pago, direccion_envio)
       VALUES (?, ?, 'pendiente', ?, ?)`,
      [id_usuario, total, metodo_pago || null, direccion_envio || null]
    );
    const id_orden = ordenRes.insertId;

    // Crear orden_items y actualizar stock
    for (const item of items) {
      await connection.query(
        `INSERT INTO orden_items
         (id_orden, id_producto, cantidad, precio_unitario)
         VALUES (?, ?, ?, ?)`,
        [id_orden, item.id_producto, item.cantidad, item.precio]
      );

      await connection.query(
        `UPDATE productos
         SET stock = stock - ?
         WHERE id_producto = ?`,
        [item.cantidad, item.id_producto]
      );
    }

    // Vaciar carrito
    await connection.query(
      'DELETE FROM carrito WHERE id_usuario = ?',
      [id_usuario]
    );

    await connection.commit();

    res.status(201).json({
      mensaje: 'Orden creada exitosamente',
      id_orden,
      total
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error en checkout:', error);
    res.status(500).json({ error: 'Error al procesar el checkout' });
  } finally {
    connection.release();
  }
};

// GET /api/tienda/ordenes
const listarOrdenesUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_usuario } = req.usuario;

    const [ordenes] = await connection.query(
      `SELECT *
       FROM ordenes
       WHERE id_usuario = ?
       ORDER BY fecha_creacion DESC`,
      [id_usuario]
    );

    res.json(ordenes);
  } catch (error) {
    console.error('Error al listar órdenes:', error);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  } finally {
    connection.release();
  }
};

// GET /api/tienda/ordenes/:id_orden
const obtenerDetalleOrden = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_usuario } = req.usuario;
    const { id_orden } = req.params;

    const [ordenes] = await connection.query(
      `SELECT *
       FROM ordenes
       WHERE id_orden = ? AND id_usuario = ?`,
      [id_orden, id_usuario]
    );

    if (!ordenes.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const [items] = await connection.query(
      `SELECT oi.*, p.nombre, p.imagen_url
       FROM orden_items oi
       INNER JOIN productos p ON oi.id_producto = p.id_producto
       WHERE oi.id_orden = ?`,
      [id_orden]
    );

    res.json({ orden: ordenes[0], items });
  } catch (error) {
    console.error('Error al obtener detalle de orden:', error);
    res.status(500).json({ error: 'Error al obtener detalle de orden' });
  } finally {
    connection.release();
  }
};

module.exports = {
  listarProductos,
  obtenerCarrito,
  agregarAlCarrito,
  actualizarCantidadCarrito,
  eliminarDelCarrito,
  realizarCheckout,
  listarOrdenesUsuario,
  obtenerDetalleOrden
};
