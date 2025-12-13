# NewLife - Sistema de Adopción de Mascotas 🐾

Sistema web para adopción de mascotas con tienda de productos y sistema de donaciones.

## 📋 Características

- ✅ Registro e inicio de sesión de usuarios
- ✅ Catálogo de animales en adopción con filtros
- ✅ Sistema de solicitudes de adopción
- ✅ Panel administrativo completo
- ✅ Tienda de productos para mascotas
- ✅ Carrito de compras
- ✅ Sistema de donaciones
- ✅ Notificaciones en tiempo real
- ✅ Generación de reportes PDF

## 🛠️ Tecnologías

- **Backend:** Node.js + Express
- **Base de Datos:** MySQL / MariaDB
- **Autenticación:** JWT (JSON Web Tokens)
- **Encriptación:** bcryptjs

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd newlife-backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=newlife
DB_PORT=3306

JWT_SECRET=tu_clave_secreta_super_segura_aqui_2024

APP_NAME=NewLife - Adopción de Mascotas
APP_URL=http://localhost:3000
```

### 4. Crear la base de datos

Importar el archivo `newlife.sql` en MySQL:

```bash
mysql -u root -p < newlife.sql
```

O desde phpMyAdmin:
1. Crear una base de datos llamada `newlife`
2. Importar el archivo `newlife.sql`

### 5. Iniciar el servidor

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

El servidor estará corriendo en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
newlife-backend/
├── src/
│   ├── config/
│   │   └── database.js       # Configuración de BD
│   ├── controllers/           # Lógica de negocio
│   ├── models/                # Modelos de datos
│   ├── routes/                # Rutas de la API
│   ├── middleware/            # Middlewares (auth, etc)
│   ├── utils/                 # Utilidades
│   └── index.js              # Punto de entrada
├── .env                       # Variables de entorno
├── .gitignore
├── package.json
└── README.md
```

## 🔑 Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/admin/login` - Login administrador

### Animales
- `GET /api/animales` - Listar animales disponibles
- `GET /api/animales/:id` - Detalle de un animal
- `POST /api/animales` - Crear animal (Admin)
- `PUT /api/animales/:id` - Actualizar animal (Admin)
- `DELETE /api/animales/:id` - Eliminar animal (Admin)

### Solicitudes de Adopción
- `POST /api/solicitudes` - Enviar solicitud
- `GET /api/solicitudes/usuario` - Ver mis solicitudes
- `GET /api/solicitudes` - Ver todas (Admin)
- `PUT /api/solicitudes/:id` - Aprobar/Rechazar (Admin)

### Productos
- `GET /api/productos` - Listar productos
- `GET /api/productos/:id` - Detalle de producto
- `POST /api/productos` - Crear producto (Admin)
- `PUT /api/productos/:id` - Actualizar producto (Admin)

### Carrito
- `GET /api/carrito` - Ver mi carrito
- `POST /api/carrito` - Agregar producto
- `DELETE /api/carrito/:id` - Eliminar producto

### Donaciones
- `POST /api/donaciones` - Realizar donación
- `GET /api/donaciones` - Listar donaciones (Admin)

## 👤 Usuario Administrador

El sistema viene con un usuario administrador predeterminado:

- **Email:** admin@newlife.com
- **Password:** admin123

**⚠️ IMPORTANTE:** Cambiar esta contraseña en producción.

## 🚀 Próximos Pasos

1. Implementar las rutas de autenticación
2. Crear los controladores para cada módulo
3. Implementar middleware de autenticación JWT
4. Crear modelos de datos
5. Implementar generación de reportes PDF
6. Agregar validaciones de datos

## 📝 Licencia

ISC

## 👨‍💻 Autor

Tu Nombre