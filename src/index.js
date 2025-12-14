const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const { testConnection } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const animalesRoutes = require('./routes/mascotaRoutes');
const solicitudRoutes = require('./routes/solicitudRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const ofrecerRoutes = require('./routes/ofrecerRoutes');
const adminSolicitudRoutes = require('./routes/adminSolicitudRoutes');
const tiendaRoutes = require('./routes/tiendaRoutes');
const adminTiendaRoutes = require('./routes/adminTiendaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors(
  { origin: 'https://frontend-tienda-production.up.railway.app', 
    credentials: true }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging (para ver qué ruta entra)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// RUTAS API
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);               // /api/user/...
app.use('/api/animales', animalesRoutes);  // /api/animales/...
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/ofrecer', ofrecerRoutes);    // 👈 AQUÍ queda montado /api/ofrecer
app.use('/api/admin/solicitudes', adminSolicitudRoutes);
app.use('/api/tienda', tiendaRoutes);  
app.use('/api/admin/tienda', adminTiendaRoutes);
    // 👈 AQUÍ queda montado /api/tienda

// Ruta base
app.get('/', (req, res) => {
  res.json({
    message: '🐾 Bienvenido a NewLife - Sistema de Adopción de Mascotas',
    version: '1.0.0'
  });
});

// Health check
app.get('/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'OK',
    database: dbStatus ? 'Conectada' : 'Desconectada',
    timestamp: new Date().toISOString()
  });
});

// 404 (después de TODAS las rutas)
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('⚠️  No se pudo conectar a la base de datos');
      console.log('El servidor continuará, pero las operaciones de BD fallarán');
    }

    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Base de datos: ${dbConnected ? '✅ Conectada' : '❌ Desconectada'}`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM recibida, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT recibida, cerrando servidor...');
  process.exit(0);
});

startServer();
