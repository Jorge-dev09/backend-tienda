const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
// src/config/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // o el proveedor que uses
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // app password si usas 2FA
  },
});

module.exports = transporter;


// ============================================
// REGISTRO DE USUARIO
// ============================================
const registrarUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      telefono,
      direccion,
      ciudad,
      estado,
      codigo_postal
    } = req.body;

    // Validaciones
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        error: 'Los campos nombre, apellido, email y contraseña son obligatorios'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'El formato del email no es válido'
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el email ya existe
    const [usuarioExistente] = await connection.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        error: 'Este email ya está registrado'
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertar usuario
    const [resultado] = await connection.query(
      `INSERT INTO usuarios 
       (nombre, apellido, email, password, telefono, direccion, ciudad, estado, codigo_postal, es_admin) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [nombre, apellido, email, passwordHash, telefono, direccion, ciudad, estado, codigo_postal]
    );

    // Generar token JWT
    const token = jwt.sign(
      {
        id_usuario: resultado.insertId,
        email: email,
        es_admin: false
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      token,
      usuario: {
        id_usuario: resultado.insertId,
        nombre,
        apellido,
        email,
        es_admin: false
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error al registrar usuario'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// LOGIN DE USUARIO
// ============================================
const loginUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son obligatorios'
      });
    }

    // Buscar usuario
    const [usuarios] = await connection.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        error: 'Email o contraseña incorrectos'
      });
    }

    const usuario = usuarios[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({
        error: 'Email o contraseña incorrectos'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        es_admin: usuario.es_admin
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono,
        es_admin: usuario.es_admin
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error al iniciar sesión'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// LOGIN DE ADMINISTRADOR
// ============================================
const loginAdmin = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son obligatorios'
      });
    }

    // Buscar usuario administrador
    const [usuarios] = await connection.query(
      'SELECT * FROM usuarios WHERE email = ? AND es_admin = 1',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        error: 'Credenciales de administrador incorrectas'
      });
    }

    const usuario = usuarios[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({
        error: 'Credenciales de administrador incorrectas'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        es_admin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      mensaje: 'Inicio de sesión de administrador exitoso',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        es_admin: true
      }
    });

  } catch (error) {
    console.error('Error en login admin:', error);
    res.status(500).json({
      error: 'Error al iniciar sesión como administrador'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// OBTENER USUARIO ACTUAL
// ============================================
const obtenerUsuarioActual = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [usuarios] = await connection.query(
      'SELECT id_usuario, nombre, apellido, email, telefono, direccion, ciudad, estado, codigo_postal, es_admin FROM usuarios WHERE id_usuario = ?',
      [req.usuario.id_usuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      usuario: usuarios[0]
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      error: 'Error al obtener información del usuario'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// RECUPERAR CONTRASEÑA
// ============================================
const recuperarPassword = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'El email es obligatorio'
      });
    }

    // Verificar si existe el usuario
    const [usuarios] = await connection.query(
      'SELECT id_usuario, nombre, email FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      // Por seguridad, respuesta genérica
      return res.json({
        mensaje: 'Si el email existe, recibirás un código para recuperar tu contraseña'
      });
    }

    const usuario = usuarios[0];

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();

    // Calcular expiración (15 minutos)
    const ahora = new Date();
    const expiraEn = new Date(ahora.getTime() + 15 * 60 * 1000);

    // Marcar códigos anteriores como usados
    await connection.query(
      'UPDATE recuperacion_password SET usado = 1 WHERE id_usuario = ?',
      [usuario.id_usuario]
    );

    // Guardar nuevo código
    await connection.query(
      `INSERT INTO recuperacion_password (id_usuario, codigo, expira_en, usado)
       VALUES (?, ?, ?, 0)`,
      [usuario.id_usuario, codigo, expiraEn]
    );

    // Enviar correo con Nodemailer
    await transporter.sendMail({
      from: `"NewLife" <${process.env.EMAIL_USER}>`,
      to: usuario.email,
      subject: 'Recuperación de contraseña - NewLife',
      html: `
        <p>Hola ${usuario.nombre},</p>
        <p>Has solicitado recuperar tu contraseña en <strong>NewLife</strong>.</p>
        <p>Tu código de verificación es:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${codigo}</p>
        <p>Este código es válido por 15 minutos.</p>
        <p>Si no fuiste tú, puedes ignorar este correo.</p>
      `,
    });

    res.json({
      mensaje: 'Si el email existe, recibirás un código para recuperar tu contraseña'
    });

  } catch (error) {
    console.error('Error en recuperar password:', error);
    res.status(500).json({
      error: 'Error al procesar la solicitud'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// VERIFICAR CÓDIGO
// ============================================

const verificarCodigoRecuperacion = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({
        error: 'Email y código son obligatorios'
      });
    }

    // Obtener usuario
    const [usuarios] = await connection.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(400).json({
        error: 'Código inválido'
      });
    }

    const usuario = usuarios[0];

    // Buscar código
    const [registros] = await connection.query(
      `SELECT * FROM recuperacion_password
       WHERE id_usuario = ? AND codigo = ? AND usado = 0
       ORDER BY id DESC LIMIT 1`,
      [usuario.id_usuario, codigo]
    );

    if (registros.length === 0) {
      return res.status(400).json({
        error: 'Código inválido o expirado'
      });
    }

    const registro = registros[0];
    const ahora = new Date();

    if (ahora > registro.expira_en) {
      return res.status(400).json({
        error: 'El código ha expirado'
      });
    }

    // Opcional: marcar como usado aquí o al cambiar password
    await connection.query(
      'UPDATE recuperacion_password SET usado = 1 WHERE id = ?',
      [registro.id]
    );

    res.json({
      mensaje: 'Código verificado correctamente',
      id_usuario: usuario.id_usuario
    });

  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({
      error: 'Error al verificar el código'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// CAMBIAR PASSWORD
// ============================================

const cambiarPasswordConCodigo = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { email, nuevaPassword } = req.body;

    if (!email || !nuevaPassword) {
      return res.status(400).json({
        error: 'Email y nueva contraseña son obligatorios'
      });
    }

    if (nuevaPassword.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario
    const [usuarios] = await connection.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(400).json({
        error: 'Usuario no encontrado'
      });
    }

    const usuario = usuarios[0];

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(nuevaPassword, salt);

    // Actualizar contraseña
    await connection.query(
      'UPDATE usuarios SET password = ? WHERE id_usuario = ?',
      [passwordHash, usuario.id_usuario]
    );

    res.json({
      mensaje: 'Contraseña cambiada correctamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      error: 'Error al cambiar la contraseña'
    });
  } finally {
    connection.release();
  }
};


module.exports = {
  registrarUsuario,
  loginUsuario,
  loginAdmin,
  obtenerUsuarioActual,
  recuperarPassword,
  verificarCodigoRecuperacion,
  cambiarPasswordConCodigo
};
