# TODO - Sistema de Toma de Asistencia Estudiantil

## Pendiente para mañana

- Verificar que el modelo de Student y los endpoints de creación/edición reciban y guarden correctamente el campo de URL del QR subido por el frontend (campo sugerido: `qrUrl`).
- Comprobar/ajustar la validación del campo (debe ser una URL válida).
- En la documentación de endpoints, especificar que la URL del QR debe venir en el body al crear/modificar estudiantes.
- Actualizar el flujo/documentación si hace falta para aclarar que la subida al CDN ahora la realiza el frontend y solo pasa la URL.
- Testear el flujo end-to-end subiendo un QR, obteniendo la URL desde el frontend y verificando que llegue y se guarde en el backend correctamente junto al estudiante. 
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
- [ ] T21-4 Integrar sistema de correos para re-enviar QR (IP: http://51.222.141.196:1011/)

### T22 - Validaciones de Negocio
- [ ] T22-1 Verificar estudiante pertenece a la temporada actual del usuario
- [ ] T22-2 Validar que fecha de asistencia exista o crear nueva si no existe
- [ ] T22-3 Validar permisos según rol del usuario autenticado
- [ ] T22-4 Validar que RUT no se repita en la misma temporada

---

## FASE 3: Frontend remaining (Depende de Backend)

### T3 - Dashboard Principal
- [ ] T3-1 Crear Dashboard según rol (superadmin/admin/voluntario)
- [ ] T3-2 Mostrar resumen de estadísticas de asistencia
- [ ] T3-3 Mostrar sesiones activas de la temporada actual
- [ ] T3-4 Diseño responsivo (mobile-first para escaneo QR)

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

### T6 - Gestión de Fechas de Asistencia (Superadmin)
- [x] T6-1 Crear lista de fechas predefinidas por temporada
- [x] T6-2 Agregar fechas manualmente
- [x] T6-3 Importar rango de fechas
- [x] T6-4 Ver fechas por temporada
- [x] T6-5 Previsualizar fechas (disponible para admin)

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
- [ ] T9-6 Integrar escaneo de QR en el mismo panel (debido a socket)

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

## FASE 4: Integración Frontend-Backend

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
- [ ] T24-5 Probar flujo de retiro con apoderado (verificar sisters)

### T25 - Seguridad
- [ ] T25-1 Proteger todas las rutas de API
- [ ] T25-2 Validar roles en backend (no solo frontend)
- [ ] T25-3 Rate limiting en endpoints sensibles
- [ ] T25-4 CORS configurado correctamente

### T26 - Documentación
- [ ] T26-1 Documentar endpoints de API
- [ ] T26-2 README con setup e instrucciones

---

## FASE 5: Socket Backend

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

## FASE 6: Socket Frontend

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

- T1 → T2 (Completados)
- T12 → T13 → T14 → T15, T16, T17, T18, T19, T20, T21 (Backend)
- T3-T11 requieren T14 completado (auth funcionando)
- T23 depende de T2 y T12
- T27 depende de T12
- T29 depende de T27
- T21-3 (CDN) está pendiente de detalles por definir