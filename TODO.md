# TODO - Sistema de Toma de Asistencia Estudiantil

## 1. FRONTEND

### T1 - Configuración inicial
- [ ] T1-1 Crear proyecto Vite + React con TypeScript
- [ ] T1-2 Instalar dependencias (axios, react-router-dom, socket.io-client, etc.)
- [ ] T1-3 Configurar rutas y navegación
- [ ] T1-4 Configurar variables de entorno (.env)

### T2 - Autenticación y Login
- [ ] T2-1 Implementar página de login (email + contraseña)
- [ ] T2-2 Crear AuthContext para manejo de sesión
- [ ] T2-3 Implementar protección de rutas (solo usuarios autenticados)
- [ ] T2-4 Manejar JWT y almacenamiento en localStorage
- [ ] T2-5 Implementar selector de temporada post-login (si tiene más de una)
- [ ] T2-6 Crear página de logout

### T3 - Dashboard Principal
- [ ] T3-1 Crear Dashboard según rol (superadmin/admin/voluntario)
- [ ] T3-2 Mostrar resumen de estadísticas de asistencia
- [ ] T3-3 Mostrar sesiones activas de la temporada actual
- [ ] T3-4 Diseño responsivo (mobile-first para escaneo QR)

### T4 - Gestión de Temporadas (Superadmin)
- [ ] T4-1 Crear formulario para nueva temporada (nombre, fechas predefinidas)
- [ ] T4-2 Listar temporadas existentes
- [ ] T4-3 Editar temporada
- [ ] T4-4 Eliminar temporada (solo si no tiene datos asociados)

### T5 - Gestión de Usuarios (Superadmin/Admin)
- [ ] T5-1 Crear lista de usuarios con filtros por rol
- [ ] T5-2 Formulario crear usuario (nombre, apellido, email, contraseña, rol, temporadas)
- [ ] T5-3 Editar usuario
- [ ] T5-4 Eliminar usuario (solo superadmin puede eliminar admins)
- [ ] T5-5 Asignar temporadas a usuarios

### T6 - Gestión de Fechas de Asistencia (Superadmin)
- [ ] T6-1 Crear lista de fechas predefinidas por temporada
- [ ] T6-2 Agregar fechas manualmente
- [ ] T6-3 Importar rango de fechas
- [ ] T6-4 Ver fechas por temporada
- [ ] T6-5 Previsualizar fechas (disponible para admin)

### T7 - Gestión de Estudiantes (Admin)
- [ ] T7-1 Crear lista de estudiantes (solo admin)
- [ ] T7-2 Formulario crear estudiante (nombres, apellidos, email, fecha_nac, rut, categoría, temporada, retirado_con_apoderado, datos_apoderado)
- [ ] T7-3 En formulario: buscar/seleccionar apoderado existente o crear nuevo
- [ ] T7-4 Editar estudiante
- [ ] T7-5 Eliminar estudiante
- [ ] T7-6 Botón re-enviar QR por email
- [ ] T7-7 Validar RUT único por temporada
- [ ] T7-8 Mostrar mensaje si estudiante tiene hermanos en la misma temporada

### T8 - Lista de Estudiantes (Todos los roles)
- [ ] T8-1 Mostrar lista de estudiantes (nombre, apellido, categoría)
- [ ] T8-2 Filtrar por categoría (Beginner/Junior/Senior)
- [ ] T8-3 Mostrar fecha de hoy por defecto
- [ ] T8-4 Navegar a fechas anteriores
- [ ] T8-5 Vista de solo lectura para voluntarios (solo nombres, apellidos, categoría)
- [ ] T8-6 Diseño optimizado para móvil

### T9 - Panel de Asistencia (Todos los roles)
- [ ] T9-1 Mostrar lista de estudiantes presentes/hoy
- [ ] T9-2 Indicador visual de entrada/salida
- [ ] T9-3 Ver historial por fecha
- [ ] T9-4 Actualización en tiempo real (socket)
- [ ] T9-5 Diseño optimizado para móvil

### T10 - Escaneo de QR (Voluntario/Admin)
- [ ] T10-1 Componente de escaneo con cámara
- [ ] T10-2 Optimizar para dispositivos móviles
- [ ] T10-3 Si estudiante ya marcó entrada → mostrar "Marcar salida"
- [ ] T10-4 Si estudiante tiene retiro con apoderado → pedir confirmación visual de ver al apoderado
- [ ] T10-5 Al confirmar retiro con apoderado, mostrar alerta si hay otras estudiantes asociadas al mismo apoderado
- [ ] T10-6 Feedback visual (éxito/error/ya registrado)
- [ ] T10-7 Sonido de feedback
- [ ] T10-8 Manejar errores de cámara

### T11 - Diseño Responsivo y UX
- [ ] T11-1 Mobile-first styling
- [ ] T11-2 Adaptar componentes para desktop
- [ ] T11-3 Testing en móvil y desktop
- [ ] T11-4 Optimizar rendimiento mobile

---

## 2. BACKEND

### T12 - Configuración inicial
- [ ] T12-1 Crear proyecto Express con TypeScript
- [ ] T12-2 Configurar conexión a MySQL
- [ ] T12-3 Configurar TypeORM/Sequelize
- [ ] T12-4 Estructura de carpetas (controllers, routes, services, models, middleware)
- [ ] T12-5 Configurar variables de entorno

### T13 - Modelos de Base de Datos
- [ ] T13-1 Modelo User (superadmin/admin/voluntario) → nombre, apellido, email, password, rol
- [ ] T13-2 Modelo Season (temporada) → nombre, fecha_inicio, fecha_fin
- [ ] T13-3 Modelo SeasonDate (fechas predefinidas de asistencia) → fecha, season_id
- [ ] T13-4 Modelo Guardian (apoderado) → nombres, apellidos, email, teléfono, RUT, season_id
- [ ] T13-5 Modelo Student → nombres, apellidos, email, rut, fecha_nac, categoria, season_id, retirado_apoderado, guardian_id (nullable)
- [ ] T13-6 Modelo Attendance → student_id, season_date_id, tipo (entrada/salida), user_id (quien registró), hora
- [ ] T13-7 Relaciones entre modelos

### T14 - Autenticación y Autorización
- [ ] T14-1 Endpoint POST /auth/login
- [ ] T14-2 Generar JWT con payload (user_id, rol, temporadas)
- [ ] T14-3 Middleware authenticateToken
- [ ] T14-4 Middleware checkRole (superadmin/admin/voluntario)
- [ ] T14-5 Encriptar contraseñas (bcrypt)

### T15 - API de Temporadas
- [ ] T15-1 GET /seasons - Listar temporadas
- [ ] T15-2 POST /seasons - Crear temporada (superadmin)
- [ ] T15-3 PUT /seasons/:id - Editar temporada
- [ ] T15-4 DELETE /seasons/:id - Eliminar temporada

### T16 - API de Fechas de Asistencia
- [ ] T16-1 GET /seasons/:id/dates - Ver fechas de una temporada
- [ ] T16-2 POST /seasons/:id/dates - Agregar fecha (superadmin)
- [ ] T16-3 POST /seasons/:id/dates/bulk - Importar rango de fechas

### T17 - API de Usuarios
- [ ] T17-1 GET /users - Listar usuarios (superadmin/admin)
- [ ] T17-2 POST /users - Crear usuario (superadmin puede crear hasta superadmin, admin hasta admin)
- [ ] T17-3 PUT /users/:id - Editar usuario
- [ ] T17-4 DELETE /users/:id - Eliminar usuario (superadmin)

### T18 - API de Apoderados
- [ ] T18-1 GET /guardians - Listar apoderados por temporada
- [ ] T18-2 POST /guardians - Crear/editar apoderado
- [ ] T18-3 GET /guardians/:id/students - Ver estudiantes asociadas al mismo apoderado (hermanas)
- [ ] T18-4 DELETE /guardians/:id - Eliminar apoderado

### T19 - API de Estudiantes
- [ ] T19-1 GET /students - Listar estudiantes (filtro por temporada)
- [ ] T19-2 GET /students?categoria= - Filtrar por categoría
- [ ] T19-3 POST /students - Crear estudiante (admin)
- [ ] T19-4 PUT /students/:id - Editar estudiante
- [ ] T19-5 DELETE /students/:id - Eliminar estudiante
- [ ] T19-6 GET /students/:id - Obtener estudiante específico
- [ ] T19-7 Validar rut único por temporada

### T20 - API de Asistencia
- [ ] T20-1 POST /attendance - Registrar asistencia (escaneo QR)
- [ ] T20-2 GET /attendance/date/:date - Ver asistencia por fecha
- [ ] T20-3 GET /attendance/student/:studentId - Historial de estudiante
- [ ] T20-4 GET /attendance/stats - Estadísticas de asistencia
- [ ] T20-5 Lógica: Si ya tiene entrada → registrar salida
- [ ] T20-6 Lógica: Si estudiante tiene retiro con apoderado → incluir flag en respuesta
- [ ] T20-7 Lógica: Verificar si hay otras estudiantes asociadas al mismo apoderado en la temporada
- [ ] T20-8 Lógica: Si fecha no existe → crear nueva fecha de asistencia automáticamente

### T21 - Generación de QR
- [ ] T21-1 Generar QR único por estudiante (contiene student_id encriptado)
- [ ] T21-2 Endpoint GET /students/:id/qr - Devolver imagen QR
- [ ] T21-3 Integrar con CDN para almacenar imágenes QR (PENDIENTE - detalles por definir)
- [ ] T21-4 Endpoint POST /students/:id/resend-qr - Re-enviar QR por email

### T22 - Validaciones de Negocio
- [ ] T22-1 Verificar estudiante pertenece a la temporada actual del usuario
- [ ] T22-2 Validar que fecha de asistencia exista o crear nueva si no existe
- [ ] T22-3 Validar permisos según rol del usuario autenticado
- [ ] T22-4 Validar que RUT no se repita en la misma temporada

---

## 3. INTEGRACIÓN FRONTEND-BACKEND

### T23 - Conexión API
- [ ] T23-1 Configurar Axios con base URL
- [ ] T23-2 Interceptors para JWT
- [ ] T23-3 Manejo centralizado de errores
- [ ] T23-4 Servicios API organizados por recurso

### T24 - Testing de Flujos
- [ ] T24-1 Login → seleccionar temporada → dashboard
- [ ] T24-2 Crear temporada → crear fechas → crear usuario → crear estudiante
- [ ] T24-3 Escanear QR → marcar entrada → escanear again → marcar salida
- [ ] T24-4 Flujo de errores (QR inválido, fecha no autorizada, etc.)
- [ ] T24-5 Probar flujo de retiro con apoderado (verificar hermanas)

### T25 - Seguridad
- [ ] T25-1 Proteger todas las rutas de API
- [ ] T25-2 Validar roles en backend (no solo frontend)
- [ ] T25-3 Rate limiting en endpoints sensibles
- [ ] T25-4 CORS configurado correctamente

### T26 - Documentación
- [ ] T26-1 Documentar endpoints de API
- [ ] T26-2 README con setup e instrucciones

---

## 4. SOCKET BACKEND

### T27 - Configuración Socket.io
- [ ] T27-1 Instalar socket.io
- [ ] T27-2 Configurar servidor socket con Express
- [ ] T27-3 Autenticación de conexiones socket (JWT)
- [ ] T27-4 Namespace /attendance

### T28 - Eventos de Tiempo Real
- [ ] T28-1 Evento: attendance.registered → emitir cuando se registra asistencia
- [ ] T28-2 Evento: attendance.updated → actualizar registro existente
- [ ] T28-3 Room por temporada (season:id)
- [ ] T28-4 Evento: students.online → usuarios conectados por sesión

---

## 5. SOCKET FRONTEND

### T29 - Cliente Socket.io
- [ ] T29-1 Instalar socket.io-client
- [ ] T29-2 Conectar al servidor socket con JWT
- [ ] T29-3 Reconexión automática
- [ ] T29-4 Hook useSocket personalizado

### T30 - UI en Tiempo Real
- [ ] T30-1 Panel de asistencia actualiza automáticamente
- [ ] T30-2 Notificación visual al registrar asistencia
- [ ] T30-3 Actualizar contadores en tiempo real
- [ ] T30-4 Feedback inmediato post-escanear

---

## Notas de Dependencias

- T1 → T2 → T3
- T12 → T13 → T14 → T15, T16, T17, T18, T19, T20, T21
- T23 depende de T2 y T12
- T27 depende de T12
- T29 depende de T27
- T21-3 (CDN) está pendiente de detalles por definir