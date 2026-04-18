# TODO - Sistema de Toma de Asistencia Estudiantil

## Pendiente para mañana

- ~~Verificar que el modelo de Student y los endpoints de creación/edición reciban y guarden correctamente el campo de URL del QR subido por el frontend (campo sugerido: `qrUrl`).~~ → Resuelto: QR se genera en backend automáticamente al crear estudiante, se guarda en `qrs/season_{id}/student_{id}.png`.
- ~~Comprobar/ajustar la validación del campo (debe ser una URL válida).~~ → Ya no aplica, el QR se genera server-side.
- ~~En la documentación de endpoints, especificar que la URL del QR debe venir en el body al crear/modificar estudiantes.~~ → Ya no aplica.
- ~~Actualizar el flujo/documentación si hace falta para aclarar que la subida al CDN ahora la realiza el frontend y solo pasa la URL.~~ → Cambiado: almacenamiento local, no CDN.
- ~~Testear el flujo end-to-end subiendo un QR, obteniendo la URL desde el frontend y verificando que llegue y se guarde en el backend correctamente junto al estudiante.~~ → Testear: crear estudiante y verificar que se genera QR en disco y se envia por email.
- Marcar estos pasos como completados en esta sección cuando se validen.

## FASE 1: Frontend Básico (Completado ✅)

### T1 - Configuración inicial
- [x] T1-1 Crear proyecto Vite + React con TypeScript
- [x] T1-2 Instalar dependencias (axios, react-router-dom, socket.io-client, Tailwind CSS)
- [x] T1-3 Configurar rutas y navegación (rutas en español)
- [x] T1-4 Configurar variables de entorno (.env)

### T2 - Autenticación y Login
- [x] T2-1 Implementar página de login (email + contraseña)
- [x] T2-2 Crear AuthContext para manejo de sesión
- [x] T2-3 Implementar protección de rutas (solo usuarios autenticados)
- [x] T2-4 Manejar JWT y almacenamiento en localStorage
- [x] T2-5 Implementar selector de temporada post-login (si tiene más de una)
- [x] T2-6 Crear página de logout

---

## FASE 2: Backend

### T12 - Configuración inicial del Backend
- [x] T12-1 Crear proyecto Express con TypeScript
- [x] T12-2 Configurar conexión a MySQL
- [x] T12-3 Configurar TypeORM
- [x] T12-4 Estructura de carpetas (controllers, routes, services, models, middleware)
- [x] T12-5 Configurar variables de entorno

### T13 - Modelos de Base de Datos (Actualizado: ID, camelCase)
- [x] T13-1 Modelo User (ID, nombre, apellido, email, password, rol)
- [x] T13-2 Modelo Season (ID, nombre, fechaInicio, fechaFin)
- [x] T13-3 Modelo SeasonDate (ID, fecha, seasonID)
- [x] T13-4 Modelo Guardian (ID, nombres, apellidos, email, telefono, rut, seasonID)
- [x] T13-5 Modelo Student (ID, nombres, apellidos, email, fechaNac, rut, categoria, seasonID, retiradoApoderado, datosApoderado, guardianID)
- [x] T13-6 Modelo Attendance (ID, tipo, hora, studentID, seasonDateID, userID)
- [x] T13-7 Relaciones entre modelos

### T14 - Autenticación y Autorización (Backend)
- [x] T14-1 Endpoint POST /auth/login
- [x] T14-2 Generar JWT con payload (user_id, rol, temporadas)
- [x] T14-3 Middleware authenticateToken
- [x] T14-4 Middleware checkRole (superadmin/admin/voluntario)
- [x] T14-5 Encriptar contraseñas (bcrypt)

### T15 - API de Temporadas
- [x] T15-1 GET /seasons - Listar temporadas
- [x] T15-2 POST /seasons - Crear temporada (superadmin)
- [x] T15-3 PUT /seasons/:id - Editar temporada
- [x] T15-4 DELETE /seasons/:id - Eliminar temporada

### T16 - API de Fechas de Asistencia
- [x] T16-1 GET /seasons/:id/dates - Ver fechas de una temporada
- [x] T16-2 POST /seasons/:id/dates - Agregar fecha (superadmin)
- [x] T16-3 POST /seasons/:id/dates/bulk - Importar rango de fechas

### T17 - API de Usuarios
- [x] T17-1 GET /users - Listar usuarios (superadmin/admin)
- [x] T17-2 POST /users - Crear usuario (superadmin puede crear hasta superadmin, admin hasta admin)
- [x] T17-3 PUT /users/:id - Editar usuario
- [x] T17-4 DELETE /users/:id - Eliminar usuario (superadmin)

### T18 - API de Apoderados
- [x] T18-1 GET /guardians - Listar apoderados por temporada
- [x] T18-2 POST /guardians - Crear/editar apoderado
- [x] T18-3 GET /guardians/:id/students - Ver estudiantes asociadas al mismo apoderado (hermanas)
- [x] T18-4 DELETE /guardians/:id - Eliminar apoderado

### T19 - API de Estudiantes
- [x] T19-1 GET /students - Listar estudiantes (filtro por temporada)
- [x] T19-2 GET /students?categoria= - Filtrar por categoría
- [x] T19-3 POST /students - Crear estudiante (admin)
- [x] T19-4 PUT /students/:id - Editar estudiante
- [x] T19-5 DELETE /students/:id - Eliminar estudiante
- [x] T19-6 GET /students/:id - Obtener estudiante específico
- [x] T19-7 Validar rut único por temporada

### T20 - API de Asistencia
- [x] T20-1 POST /attendance - Registrar asistencia (escaneo QR)
- [x] T20-2 GET /attendance/date/:date - Ver asistencia por fecha
- [x] T20-3 GET /attendance/student/:studentId - Historial de estudiante
- [x] T20-4 GET /attendance/stats - Estadísticas de asistencia
- [x] T20-5 Lógica: Si ya tiene entrada → registrar salida
- [x] T20-6 Lógica: Si estudiante tiene retiro con apoderado → incluir flag en respuesta
- [x] T20-7 Lógica: Verificar si hay otras estudiantes asociadas al mismo apoderado en la temporada
- [x] T20-8 Lógica: Si fecha no existe → crear nueva fecha de asistencia automáticamente

### T21 - Generación de QR
- [x] T21-1 Generar QR único por estudiante (contenido: season_{id}/student_{id}.png)
- [x] T21-2 Endpoint GET /students/:id/qr - Devolver imagen QR (redirect al CDN)
- [x] T21-3 Integrar con CDN cdn.donath.us (path: /_UV_QR-TECHNOVATION_/season_{id}/) + campo qrUrl en Student
- [x] T21-4 Integrar sistema de correos para re-enviar QR (IP: http://51.222.141.196:1011/)
- [x] T21-5 Envío dual: email al estudiante + apoderado (deduplicado si son iguales)

### T22 - Validaciones de Negocio
- [x] T22-1 Verificar estudiante pertenece a la temporada actual del usuario
- [x] T22-2 Validar que fecha de asistencia exista o crear nueva si no existe
- [x] T22-3 Validar permisos según rol del usuario autenticado
- [x] T22-4 Validar que RUT no se repita en la misma temporada

---

## FASE 3: Frontend remaining (Depende de Backend)

### T3 - Dashboard Principal
- [x] T3-1 Crear Dashboard según rol (superadmin/admin/voluntario)
- [x] T3-2 Mostrar resumen de estadísticas de asistencia
- [x] T3-3 Mostrar sesiones activas de la temporada actual
- [x] T3-4 Diseño responsivo (mobile-first para escaneo QR)

### T4 - Gestión de Temporadas (Superadmin)
- [x] T4-1 Crear formulario para nueva temporada (nombre, fechas predefinidas)
- [x] T4-2 Listar temporadas existentes
- [x] T4-3 Editar temporada
- [x] T4-4 Eliminar temporada (solo si no tiene datos asociados)

### T5 - Gestión de Usuarios (Superadmin/Admin)
- [x] T5-1 Crear lista de usuarios con filtros por rol
- [x] T5-2 Formulario crear usuario (nombre, apellido, email, contraseña, rol, temporadas)
- [x] T5-3 Editar usuario
- [x] T5-4 Eliminar usuario (solo superadmin puede eliminar admins)
- [x] T5-5 Asignar temporadas a usuarios

### T31 - Gestión de Equipos (Superadmin/Admin)
- [x] T31-1 Listar equipos existentes por temporada y categoría
- [x] T31-2 Crear, editar y eliminar equipo
- [x] T31-3 Asignar y remover estudiantes en equipos (máx. 5 por equipo)
- [x] T31-4 Asignar y remover mentores a equipos
- [x] T31-5 Mostrar estudiantes sin equipo y filtrar por categoría (parcial: lista mostrada, falta filtro por categoría en sidebar)
- [ ] T31-6 Alertar si faltan equipos necesarios por categoría
- [x] T31-7 Drag & Drop para reordenar estudiantes dentro de equipos, entre equipos y para reordenar cards de equipos (parcial: mover entre equipos funciona, falta reordenar dentro de un equipo y reordenar cards de equipos)
- [x] T31-8 Validar cantidad máxima/minima estudiantes por equipo (backend/front) (parcial: máximo 5 validado en backend y frontend, falta mínimo)
- [x] T31-9 Ver detalles de equipo (listado, mentores, categoría, ODS) (parcial: info visible en cards, falta vista/página dedicada de detalle)

### T6 - Gestión de Fechas de Asistencia (Superadmin)
- [x] T6-1 Crear lista de fechas predefinidas por temporada
- [x] T6-2 Agregar fechas manualmente
- [x] T6-3 Importar rango de fechas
- [x] T6-4 Ver fechas por temporada
- [x] T6-5 Previsualizar fechas (disponible para admin)

### T7 - Gestión de Estudiantes (Admin)
- [x] T7-1 Crear lista de estudiantes (solo admin)
- [x] T7-2 Formulario crear estudiante (nombres, apellidos, email, fecha_nac, rut, categoría, temporada, retirado_con_apoderado, datos_apoderado)
- [x] T7-3 En formulario: buscar/seleccionar apoderado existente o crear nuevo
- [x] T7-4 Editar estudiante
- [x] T7-5 Eliminar estudiante
- [x] T7-6 Botón re-enviar QR por email (con opción alumna/apoderado/ambos)
- [x] T7-7 Validar RUT único por temporada
- [x] T7-8 Mostrar mensaje si estudiante tiene hermanos en la misma temporada

### T8 - Lista de Estudiantes (Todos los roles)
- [x] T8-1 Mostrar lista de estudiantes (nombre, apellido, categoría)
- [x] T8-2 Filtrar por categoría (Beginner/Junior/Senior)
- [x] T8-3 Mostrar fecha de hoy por defecto
- [x] T8-4 Navegar a fechas anteriores
- [x] T8-5 Vista de solo lectura para voluntarios (solo nombres, apellidos, categoría)
- [x] T8-6 Diseño optimizado para móvil

### T9 - Panel de Asistencia (Todos los roles)
- [x] T9-1 Mostrar lista de estudiantes presentes/hoy
- [x] T9-2 Indicador visual de entrada/salida
- [x] T9-3 Ver historial por fecha
- [x] T9-4 Actualización en tiempo real (socket)
- [x] T9-5 Diseño optimizado para móvil
- [x] T9-6 Integrar escaneo de QR en el mismo panel (debido a socket)

### T10 - Escaneo de QR (Voluntario/Admin)
- [x] T10-1 Componente de escaneo con cámara
- [x] T10-2 Optimizar para dispositivos móviles
- [x] T10-3 Si estudiante ya marcó entrada → mostrar "Marcar salida"
- [x] T10-4 Si estudiante tiene retiro con apoderado → pedir confirmación visual de ver al apoderado
- [x] T10-5 Al confirmar retiro con apoderado, mostrar alerta si hay otras estudiantes asociadas al mismo apoderado
- [x] T10-6 Feedback visual (éxito/error/ya registrado)
- [x] T10-7 Sonido de feedback
- [x] T10-8 Manejar errores de cámara
- [x] T10-9 Restringir fecha a solo "hoy" en pasar asistencia
- [x] T10-10 Mostrar aviso si el día no está registrado en la planificación de la temporada

### T32 - Informe de Asistencia (Todos los roles)
- [x] T32-1 Crear nueva página/ruta para informe de asistencia
- [x] T32-2 Obtener lista de todas las estudiantes con su equipo y categoría
- [x] T32-3 Obtener todos los días registrados en la temporada con asistencia
- [x] T32-4 Mostrar tabla con columnas: estudiante, equipo, categoría, y días de asistencia
- [x] T32-5 Colores de estado: gris = ausente, naranja = solo entrada, verde = entrada y salida
- [x] T32-6 Accesible para cualquier usuario autenticado
- T32-7 - Justificar inasistencias
  - [x] T32-7a Agregar campo 'justificacion' (VARCHAR, nullable) a entidad Attendance
  - [x] T32-7b Crear endpoint PATCH /attendance/justificar (solo admin/superadmin)
  - [x] T32-7c Incluir justificacion en GET /attendance/season/:id
  - [x] T32-7d Click en círculo gris (ausente) → modal justificación
  - [x] T32-7e Mostrar icono warning en círculo justificado (solo admin/superadmin)
  - [x] T32-7f Tooltip-hover muestra texto de justificación
  - [x] T32-7g Mostrar estadísticas generales en informe

### T11 - Diseño Responsivo y UX
- [x] T11-1 Mobile-first styling
- [x] T11-2 Adaptar componentes para desktop
- [x] T11-3 Testing en móvil y desktop
- [x] T11-4 Optimizar rendimiento mobile

---

## FASE 4: Integración Frontend-Backend

### T23 - Conexión API
- [x] T23-1 Configurar Axios con base URL
- [x] T23-2 Interceptors para JWT
- [x] T23-3 Manejo centralizado de errores (401 auto-logout; otros errores por componente)
- [ ] T23-4 Servicios API organizados por recurso

### T24 - Testing de Flujos
- [ ] T24-1 Login → seleccionar temporada → dashboard
- [x] T24-2 Crear temporada → crear fechas → crear usuario → crear estudiante
- [ ] T24-3 Escanear QR → marcar entrada → escanear again → marcar salida
- [ ] T24-4 Flujo de errores (QR inválido, fecha no autorizada, etc.)
- [ ] T24-5 Probar flujo de retiro con apoderado (verificar sisters)

### T25 - Seguridad
- [x] T25-1 Proteger todas las rutas de API
- [x] T25-2 Validar roles en backend (no solo frontend)
- [ ] T25-3 Rate limiting en endpoints sensibles
- [x] T25-4 CORS configurado correctamente

### T26 - Documentación
- [ ] T26-1 Documentar endpoints de API
- [ ] T26-2 README con setup e instrucciones

---

## FASE 5: Socket Backend

### T27 - Configuración Socket.io
- [x] T27-1 Instalar socket.io
- [x] T27-2 Configurar servidor socket con Express
- [x] T27-3 Autenticación de conexiones socket (JWT)
- [x] T27-4 Namespace /attendance

### T28 - Eventos de Tiempo Real
- [x] T28-1 Evento: attendance.registered → emitir cuando se registra asistencia
- [x] T28-2 Evento: attendance.updated → actualizar registro existente
- [x] T28-3 Room por temporada (season:id)
- [x] T28-4 Evento: students.online → usuarios conectados por sesión

---

## FASE 6: Socket Frontend

### T29 - Cliente Socket.io
- [x] T29-1 Instalar socket.io-client
- [x] T29-2 Conectar al servidor socket con JWT
- [x] T29-3 Reconexión automática (default de socket.io + botón manual de reconexión)
- [x] T29-4 Hook useSocket personalizado

### T30 - UI en Tiempo Real
- [x] T30-1 Panel de asistencia actualiza automáticamente
- [x] T30-2 Notificación visual al registrar asistencia (remota, desde otro dispositivo)
- [x] T30-3 Actualizar contadores en tiempo real
- [x] T30-4 Feedback inmediato post-escanear

---

## Notas de Dependencias

- T1 → T2 (Completados)
- T12 → T13 → T14 → T15, T16, T17, T18, T19, T20, T21 (Backend)
- T3-T11 requieren T14 completado (auth funcionando)
- T23 depende de T2 y T12
- T27 depende de T12
- T29 depende de T27
- T21-3 (CDN) → Integrado con cdn.donath.us (completado)

---

## Fixes

- [x] Verificar RUT duplicado de estudiantes por temporada
- [x] Añadir loadings a botones para evitar doubles clicks