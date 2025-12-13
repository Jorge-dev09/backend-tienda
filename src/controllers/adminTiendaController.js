// backend/controllers/adminTiendaController.js
const { pool } = require('../config/database');

// GET /api/admin/tienda/productos
const listarProductosAdmin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { categoria, activo, q, stock_bajo } = req.query;

    let query = `
      SELECT *
      FROM productos
      WHERE 1=1
    `;
    const params = [];

    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }

    if (activo === '1' || activo === '0') {
      query += ' AND activo = ?';
      params.push(activo);
    }

    if (stock_bajo === '1') {
      query += ' AND stock <= 5';
    }

    if (q) {
      query += ' AND nombre LIKE ?';
      params.push(`%${q}%`);
    }

    query += ' ORDER BY fecha_registro DESC';

    const [rows] = await connection.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al listar productos admin:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  } finally {
    connection.release();
  }
};

// POST /api/admin/tienda/productos
const crearProducto = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      nombre,
      descripcion,
      categoria,
      especie_destino,
      precio,
      stock,
      imagen_url
    } = req.body;

    if (!nombre || !categoria || !precio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const [result] = await connection.query(
      `INSERT INTO productos
       (nombre, descripcion, categoria, especie_destino, precio, stock, imagen_url, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nombre,
        descripcion || null,
        categoria,
        especie_destino || 'Todas',
        precio,
        stock || 0,
        imagen_url || null
      ]
    );

    res.status(201).json({
      mensaje: 'Producto creado correctamente',
      id_producto: result.insertId
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  } finally {
    connection.release();
  }
};

// PUT /api/admin/tienda/productos/:id_producto
const actualizarProducto = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_producto } = req.params;
    const {
      nombre,
      descripcion,
      categoria,
      especie_destino,
      precio,
      stock,
      imagen_url,
      activo
    } = req.body;

    const [result] = await connection.query(
      `UPDATE productos
       SET nombre = ?,
           descripcion = ?,
           categoria = ?,
           especie_destino = ?,
           precio = ?,
           stock = ?,
           imagen_url = ?,
           activo = ?
       WHERE id_producto = ?`,
      [
        nombre,
        descripcion || null,
        categoria,
        especie_destino || 'Todas',
        precio,
        stock,
        imagen_url || null,
        activo ? 1 : 0,
        id_producto
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  } finally {
    connection.release();
  }
};

// PATCH /api/admin/tienda/productos/:id_producto/estado
const cambiarEstadoProducto = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_producto } = req.params;
    const { activo } = req.body;

    const [result] = await connection.query(
      `UPDATE productos SET activo = ? WHERE id_producto = ?`,
      [activo ? 1 : 0, id_producto]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al cambiar estado producto:', error);
    res.status(500).json({ error: 'Error al cambiar estado del producto' });
  } finally {
    connection.release();
  }
};

// DELETE /api/admin/tienda/productos/:id_producto
const eliminarProducto = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_producto } = req.params;

    const [result] = await connection.query(
      'DELETE FROM productos WHERE id_producto = ?',
      [id_producto]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  } finally {
    connection.release();
  }
};

// Órdenes de tienda para admin
const listarOrdenes = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [ordenes] = await connection.query(
      `SELECT o.*, u.nombre, u.apellido, u.email
       FROM ordenes o
       INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
       ORDER BY o.fecha_creacion DESC`
    );
    res.json(ordenes);
  } catch (error) {
    console.error('Error al listar órdenes admin:', error);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  } finally {
    connection.release();
  }
};

const obtenerDetalleOrdenAdmin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_orden } = req.params;

    const [ordenes] = await connection.query(
      `SELECT o.*, u.nombre, u.apellido, u.email
       FROM ordenes o
       INNER JOIN usuarios u ON o.id_usuario = u.id_usuario
       WHERE o.id_orden = ?`,
      [id_orden]
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
    console.error('Error al obtener detalle de orden admin:', error);
    res.status(500).json({ error: 'Error al obtener detalle de orden' });
  } finally {
    connection.release();
  }
};

module.exports = {
  listarProductosAdmin,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
  eliminarProducto,
  listarOrdenes,
  obtenerDetalleOrdenAdmin
};
