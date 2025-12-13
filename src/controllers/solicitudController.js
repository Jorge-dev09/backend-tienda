const { pool } = require('../config/database');

// CREAR SOLICITUD DE ADOPCIÓN
const crearSolicitud = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id_usuario } = req.usuario;
    const { id_animal, motivo_adopcion, experiencia_mascotas, vivienda_tipo, tiene_patio, otros_animales, descripcion_otros_animales } = req.body;

    if (!id_animal || !motivo_adopcion || !vivienda_tipo) {
      return res.status(400).json({
        error: 'id_animal, motivo_adopcion y vivienda_tipo son obligatorios'
      });
    }

    // Verificar que el animal exista y esté disponible
    const [animales] = await connection.query(
      'SELECT estado_adopcion FROM animales WHERE id_animal = ?',
      [id_animal]
    );

    if (animales.length === 0) {
      return res.status(404).json({ error: 'Mascota no encontrada' });
    }

    if (animales[0].estado_adopcion !== 'Disponible') {
      return res.status(400).json({ error: 'Esta mascota no está disponible para adopción' });
    }

    // Verificar que el usuario no tenga ya una solicitud activa para ese animal
    const [existentes] = await connection.query(
      `SELECT id_solicitud 
       FROM solicitudes_adopcion 
       WHERE id_usuario = ? AND id_animal = ? 
       AND estado NOT IN ('rechazada','cancelada')`,
      [id_usuario, id_animal]
    );

    if (existentes.length > 0) {
      return res.status(400).json({
        error: 'Ya tienes una solicitud activa para esta mascota'
      });
    }

    // Crear solicitud con estado 'pendiente' o 'enviada'
    const [result] = await connection.query(
      `INSERT INTO solicitudes_adopcion 
       (id_usuario, id_animal, motivo_adopcion, experiencia_mascotas, vivienda_tipo, 
        tiene_patio, otros_animales, descripcion_otros_animales, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [
        id_usuario,
        id_animal,
        motivo_adopcion,
        experiencia_mascotas || null,
        vivienda_tipo,
        tiene_patio ? 1 : 0,
        otros_animales ? 1 : 0,
        descripcion_otros_animales || null
      ]
    );

    // Opcional: insertar en historial_estado_solicitudes si ya la tienes
    // await connection.query(...)

    res.status(201).json({
      mensaje: 'Solicitud creada correctamente',
      id_solicitud: result.insertId
    });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ error: 'Error al crear la solicitud' });
  } finally {
    connection.release();
  }
};


// ============================================
// OBTENER SOLICITUDES DEL USUARIO
// ============================================
const obtenerMisSolicitudes = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id_usuario } = req.usuario;
    const { estado } = req.query;

    let query = `
      SELECT 
        s.id_solicitud,
        s.id_usuario,
        s.id_animal,
        s.tipo_solicitud,
        s.motivo_adopcion,
        s.experiencia_mascotas,
        s.vivienda_tipo,
        s.tiene_patio,
        s.otros_animales,
        s.descripcion_otros_animales,
        s.estado,
        s.comentarios_admin,
        s.fecha_solicitud,
        s.fecha_revision,
        s.actualizado_en,
        a.nombre       AS nombre_animal,
        a.especie,
        a.raza         AS raza_animal,
        a.edad_anos,
        a.edad_meses,
        a.imagen_url   AS foto_animal,
        CONCAT(
          COALESCE(a.edad_anos, 0), ' años',
          CASE 
            WHEN a.edad_meses IS NOT NULL AND a.edad_meses > 0 
            THEN CONCAT(' ', a.edad_meses, ' meses') 
            ELSE '' 
          END
        ) AS edad_animal
      FROM solicitudes_adopcion s
      INNER JOIN animales a ON s.id_animal = a.id_animal
      WHERE s.id_usuario = ?
    `;

    const params = [id_usuario];

    if (estado && estado !== 'todas') {
      query += ' AND s.estado = ?';
      params.push(estado);
    }

    query += ' ORDER BY s.fecha_solicitud DESC';

    const [solicitudes] = await connection.query(query, params);

    res.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  } finally {
    connection.release();
  }
};


// ============================================
// OBTENER DETALLE DE SOLICITUD (USUARIO)
// ============================================
const obtenerDetalleSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id_solicitud } = req.params;
    const { id_usuario } = req.usuario;

    // Obtener solicitud con datos del animal
    const [solicitudes] = await connection.query(
      `SELECT 
        s.*,
        a.*,
        ds.*,
        u_aprobada.nombre as nombre_aprobador,
        u_rechazada.nombre as nombre_rechazador,
        u_asignada.nombre as nombre_asignado
      FROM solicitudes_adopcion s
      INNER JOIN animales a ON s.id_animal = a.id_animal
      LEFT JOIN datos_solicitud ds ON s.id_solicitud = ds.id_solicitud
      LEFT JOIN usuarios u_aprobada ON s.aprobada_por = u_aprobada.id_usuario
      LEFT JOIN usuarios u_rechazada ON s.rechazada_por = u_rechazada.id_usuario
      LEFT JOIN usuarios u_asignada ON s.asignada_a = u_asignada.id_usuario
      WHERE s.id_solicitud = ? AND s.id_usuario = ?`,
      [id_solicitud, id_usuario]
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({
        error: 'Solicitud no encontrada'
      });
    }

    // Obtener historial de estados
    const [historial] = await connection.query(
      `SELECT 
        h.*,
        u.nombre as nombre_usuario
      FROM historial_estado_solicitudes h
      LEFT JOIN usuarios u ON h.cambiado_por = u.id_usuario
      WHERE h.id_solicitud = ?
      ORDER BY h.fecha_cambio ASC`,
      [id_solicitud]
    );

    // Obtener mensajes (solo los no internos)
    const [mensajes] = await connection.query(
      `SELECT 
        m.*,
        u_remitente.nombre as nombre_remitente
      FROM mensajes_solicitud m
      INNER JOIN usuarios u_remitente ON m.id_remitente = u_remitente.id_usuario
      WHERE m.id_solicitud = ? AND m.es_interno = 0
      ORDER BY m.fecha_creacion ASC`,
      [id_solicitud]
    );

    res.json({
      solicitud: solicitudes[0],
      historial,
      mensajes
    });

  } catch (error) {
    console.error('Error al obtener detalle:', error);
    res.status(500).json({
      error: 'Error al obtener el detalle de la solicitud'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// CANCELAR SOLICITUD (USUARIO)
// ============================================
const cancelarSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id_solicitud } = req.params;
    const { id_usuario } = req.usuario;

    // Verificar que la solicitud existe y pertenece al usuario
    const [solicitudes] = await connection.query(
      'SELECT estado FROM solicitudes_adopcion WHERE id_solicitud = ? AND id_usuario = ?',
      [id_solicitud, id_usuario]
    );

    if (solicitudes.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Solicitud no encontrada'
      });
    }

    const estadoActual = solicitudes[0].estado;

    // Solo se puede cancelar si está en ciertos estados
    if (!['pendiente', 'en_revision', 'info_solicitada'].includes(estadoActual)) {
      await connection.rollback();
      return res.status(400).json({
        error: 'No se puede cancelar una solicitud en este estado'
      });
    }

    // Actualizar estado
    await connection.query(
      'UPDATE solicitudes_adopcion SET estado = ? WHERE id_solicitud = ?',
      ['cancelada', id_solicitud]
    );

    // Registrar en historial
    await connection.query(
      `INSERT INTO historial_estado_solicitudes 
       (id_solicitud, estado_anterior, estado_nuevo, cambiado_por, notas)
       VALUES (?, ?, ?, ?, ?)`,
      [id_solicitud, estadoActual, 'cancelada', id_usuario, 'Cancelada por el usuario']
    );

    await connection.commit();

    res.json({
      mensaje: 'Solicitud cancelada exitosamente'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({
      error: 'Error al cancelar la solicitud'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// OBTENER TODAS LAS SOLICITUDES (ADMIN)
// ============================================
const obtenerTodasSolicitudes = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { estado, id_animal, busqueda, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT 
        s.*,
        a.nombre as nombre_animal,
        a.especie,
        a.raza as raza_animal,
        a.imagen_url as foto_animal,
        u.nombre as nombre_usuario,
        u.apellido as apellido_usuario,
        u.email as email_usuario,
        CONCAT(u.nombre, ' ', u.apellido) as nombre_completo_usuario
      FROM solicitudes_adopcion s
      INNER JOIN animales a ON s.id_animal = a.id_animal
      INNER JOIN usuarios u ON s.id_usuario = u.id_usuario
      WHERE 1=1
    `;

    const params = [];

    if (estado && estado !== 'todas') {
      query += ' AND s.estado = ?';
      params.push(estado);
    }

    if (id_animal) {
      query += ' AND s.id_animal = ?';
      params.push(id_animal);
    }

    if (busqueda) {
      query += ` AND (
        u.nombre LIKE ? OR 
        u.apellido LIKE ? OR 
        u.email LIKE ? OR 
        a.nombre LIKE ?
      )`;
      const searchTerm = `%${busqueda}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (fecha_desde) {
      query += ' AND s.fecha_solicitud >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ' AND s.fecha_solicitud <= ?';
      params.push(fecha_hasta);
    }

    query += ' ORDER BY s.fecha_solicitud DESC';

    const [solicitudes] = await connection.query(query, params);

    res.json(solicitudes);

  } catch (error) {
    console.error('Error al obtener solicitudes (admin):', error);
    res.status(500).json({
      error: 'Error al obtener las solicitudes'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// OBTENER DETALLE DE SOLICITUD (ADMIN)
// ============================================
const obtenerDetalleSolicitudAdmin = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id_solicitud } = req.params;

    // Obtener solicitud completa
    const [solicitudes] = await connection.query(
      `SELECT 
        s.*,
        a.*,
        ds.*,
        u.nombre as nombre_usuario,
        u.apellido as apellido_usuario,
        u.email as email_usuario,
        u.telefono as telefono_usuario,
        u.direccion as direccion_usuario,
        u_aprobada.nombre as nombre_aprobador,
        u_rechazada.nombre as nombre_rechazador,
        u_asignada.nombre as nombre_asignado
      FROM solicitudes_adopcion s
      INNER JOIN usuarios u ON s.id_usuario = u.id_usuario
      INNER JOIN animales a ON s.id_animal = a.id_animal
      LEFT JOIN datos_solicitud ds ON s.id_solicitud = ds.id_solicitud
      LEFT JOIN usuarios u_aprobada ON s.aprobada_por = u_aprobada.id_usuario
      LEFT JOIN usuarios u_rechazada ON s.rechazada_por = u_rechazada.id_usuario
      LEFT JOIN usuarios u_asignada ON s.asignada_a = u_asignada.id_usuario
      WHERE s.id_solicitud = ?`,
      [id_solicitud]
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({
        error: 'Solicitud no encontrada'
      });
    }

    // Obtener historial
    const [historial] = await connection.query(
      `SELECT 
        h.*,
        u.nombre as nombre_usuario
      FROM historial_estado_solicitudes h
      LEFT JOIN usuarios u ON h.cambiado_por = u.id_usuario
      WHERE h.id_solicitud = ?
      ORDER BY h.fecha_cambio ASC`,
      [id_solicitud]
    );

    // Obtener todos los mensajes (incluyendo internos)
    const [mensajes] = await connection.query(
      `SELECT 
        m.*,
        u_remitente.nombre as nombre_remitente,
        u_destinatario.nombre as nombre_destinatario
      FROM mensajes_solicitud m
      INNER JOIN usuarios u_remitente ON m.id_remitente = u_remitente.id_usuario
      INNER JOIN usuarios u_destinatario ON m.id_destinatario = u_destinatario.id_usuario
      WHERE m.id_solicitud = ?
      ORDER BY m.fecha_creacion ASC`,
      [id_solicitud]
    );

    // Obtener visita domiciliaria si existe
    const [visitas] = await connection.query(
      `SELECT 
        v.*,
        u_voluntario.nombre as nombre_voluntario,
        u_programada.nombre as nombre_programador
      FROM visitas_domiciliarias v
      LEFT JOIN usuarios u_voluntario ON v.id_voluntario = u_voluntario.id_usuario
      LEFT JOIN usuarios u_programada ON v.programada_por = u_programada.id_usuario
      WHERE v.id_solicitud = ?`,
      [id_solicitud]
    );

    res.json({
      solicitud: solicitudes[0],
      historial,
      mensajes,
      visita: visitas.length > 0 ? visitas[0] : null
    });

  } catch (error) {
    console.error('Error al obtener detalle (admin):', error);
    res.status(500).json({
      error: 'Error al obtener el detalle de la solicitud'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// CAMBIAR ESTADO DE SOLICITUD (ADMIN)
// ============================================
const cambiarEstadoSolicitud = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id_solicitud } = req.params;
    const { estado, notas, razon_rechazo } = req.body;
    const { id_usuario } = req.usuario;

    // Validar estado
    const estadosValidos = ['pendiente', 'en_revision', 'info_solicitada', 'visita_agendada', 'aprobada', 'rechazada'];
    if (!estadosValidos.includes(estado)) {
      await connection.rollback();
      return res.status(400).json({
        error: 'Estado no válido'
      });
    }

    // Obtener datos actuales de la solicitud (incluyendo id_animal)
    const [solicitudes] = await connection.query(
      'SELECT estado, id_usuario AS id_adoptante, id_animal FROM solicitudes_adopcion WHERE id_solicitud = ?',
      [id_solicitud]
    );

    if (solicitudes.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Solicitud no encontrada'
      });
    }

    const estadoAnterior = solicitudes[0].estado;
    const idAdoptante = solicitudes[0].id_adoptante;
    const idAnimal = solicitudes[0].id_animal;

    // Actualizar solicitud
    let updateQuery = 'UPDATE solicitudes_adopcion SET estado = ?';
    const updateParams = [estado];

    if (estado === 'aprobada') {
      updateQuery += ', aprobada_por = ?, fecha_aprobacion = NOW()';
      updateParams.push(id_usuario);
    } else if (estado === 'rechazada') {
      updateQuery += ', rechazada_por = ?, fecha_rechazo = NOW(), razon_rechazo = ?';
      updateParams.push(id_usuario, razon_rechazo || '');
    }

    updateQuery += ' WHERE id_solicitud = ?';
    updateParams.push(id_solicitud);

    await connection.query(updateQuery, updateParams);

    // Si se aprueba, marcar al animal como Adoptado
    if (estado === 'aprobada') {
      await connection.query(
        'UPDATE animales SET estado_adopcion = "Adoptado" WHERE id_animal = ?',
        [idAnimal]
      );
    }

    // Registrar en historial
    await connection.query(
      `INSERT INTO historial_estado_solicitudes 
       (id_solicitud, estado_anterior, estado_nuevo, cambiado_por, notas)
       VALUES (?, ?, ?, ?, ?)`,
      [id_solicitud, estadoAnterior, estado, id_usuario, notas || '']
    );

    // Crear notificación para el usuario
    const mensajesEstado = {
      pendiente: 'Tu solicitud está pendiente de revisión',
      en_revision: 'Tu solicitud está siendo revisada por nuestro equipo',
      info_solicitada: 'Necesitamos más información sobre tu solicitud',
      visita_agendada: 'Se ha agendado una visita domiciliaria',
      aprobada: '¡Felicitaciones! Tu solicitud ha sido aprobada',
      rechazada: 'Tu solicitud ha sido rechazada'
    };

    await connection.query(
      `INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo)
       VALUES (?, ?, ?, ?)`,
      [
        idAdoptante,
        'Actualización de solicitud',
        mensajesEstado[estado],
        'Solicitud'
      ]
    );

    await connection.commit();

    res.json({
      mensaje: 'Estado actualizado exitosamente',
      estado_nuevo: estado
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al cambiar estado:', error);
    res.status(500).json({
      error: 'Error al cambiar el estado de la solicitud'
    });
  } finally {
    connection.release();
  }
};


// ============================================
// OBTENER ESTADÍSTICAS (ADMIN)
// ============================================
const obtenerEstadisticas = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // Total por estado
    const [porEstado] = await connection.query(
      `SELECT estado, COUNT(*) as total
       FROM solicitudes_adopcion
       GROUP BY estado`
    );

    // Solicitudes de esta semana
    const [estaSemana] = await connection.query(
      `SELECT COUNT(*) as total
       FROM solicitudes_adopcion
       WHERE fecha_solicitud >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    // Tasa de aprobación
    const [tasas] = await connection.query(
      `SELECT 
        COUNT(CASE WHEN estado = 'aprobada' THEN 1 END) as aprobadas,
        COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas,
        COUNT(*) as total
       FROM solicitudes_adopcion`
    );

    const tasaAprobacion = tasas[0].total > 0 
      ? ((tasas[0].aprobadas / (tasas[0].aprobadas + tasas[0].rechazadas)) * 100).toFixed(1)
      : 0;

    // Tiempo promedio de respuesta (en días)
    const [tiempoPromedio] = await connection.query(
      `SELECT AVG(DATEDIFF(fecha_revision, fecha_solicitud)) as promedio_dias
       FROM solicitudes_adopcion
       WHERE fecha_revision IS NOT NULL`
    );

    // Aprobadas este mes
    const [esteMes] = await connection.query(
      `SELECT COUNT(*) as total
       FROM solicitudes_adopcion
       WHERE estado = 'aprobada' 
       AND MONTH(fecha_aprobacion) = MONTH(NOW())
       AND YEAR(fecha_aprobacion) = YEAR(NOW())`
    );

    res.json({
      por_estado: porEstado,
      solicitudes_semana: estaSemana[0].total,
      tasa_aprobacion: tasaAprobacion,
      tiempo_promedio_dias: Math.round(tiempoPromedio[0].promedio_dias || 0),
      aprobadas_mes: esteMes[0].total
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      error: 'Error al obtener las estadísticas'
    });
  } finally {
    connection.release();
  }
};

// ============================================
// AGREGAR MENSAJE (ADMIN O USUARIO)
// ============================================
const agregarMensaje = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id_solicitud } = req.params;
    const { mensaje, es_interno = false } = req.body;
    const { id_usuario, es_admin } = req.usuario;

    if (!mensaje || mensaje.trim() === '') {
      return res.status(400).json({
        error: 'El mensaje no puede estar vacío'
      });
    }

    // Obtener datos de la solicitud
    const [solicitudes] = await connection.query(
      'SELECT id_usuario FROM solicitudes_adopcion WHERE id_solicitud = ?',
      [id_solicitud]
    );

    if (solicitudes.length === 0) {
      return res.status(404).json({
        error: 'Solicitud no encontrada'
      });
    }

    const idAdoptante = solicitudes[0].id_usuario;

    // Determinar remitente y destinatario
    let idRemitente, idDestinatario;
    if (es_admin) {
      idRemitente = id_usuario;
      idDestinatario = idAdoptante;
    } else {
      idRemitente = id_usuario;
      // Buscar un admin (el que aprobó, rechazó o el primero disponible)
      const [admins] = await connection.query(
        'SELECT id_usuario FROM usuarios WHERE es_admin = 1 LIMIT 1'
      );
      idDestinatario = admins.length > 0 ? admins[0].id_usuario : id_usuario;
    }

    // Insertar mensaje
    await connection.query(
      `INSERT INTO mensajes_solicitud 
       (id_solicitud, id_remitente, id_destinatario, mensaje, es_interno)
       VALUES (?, ?, ?, ?, ?)`,
      [id_solicitud, idRemitente, idDestinatario, mensaje, es_interno ? 1 : 0]
    );

    res.json({
      mensaje: 'Mensaje enviado exitosamente'
    });

  } catch (error) {
    console.error('Error al agregar mensaje:', error);
    res.status(500).json({
      error: 'Error al enviar el mensaje'
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  obtenerMisSolicitudes,
  obtenerDetalleSolicitud,
  crearSolicitud,
  cancelarSolicitud,
  obtenerTodasSolicitudes,
  obtenerDetalleSolicitudAdmin,
  cambiarEstadoSolicitud,
  obtenerEstadisticas,
  agregarMensaje
};
