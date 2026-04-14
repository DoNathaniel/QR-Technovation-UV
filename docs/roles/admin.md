# Rol: Admin

**Nivel de acceso:** Intermedio - Gestion de estudiantes, equipos y apoderados

**Descripcion:** El admin puede gestionar la mayoria de los recursos del sistema (estudiantes, equipos, apoderados, usuarios limitados) pero no puede administrar temporadas, fechas ni eliminar registros criticos como usuarios o apoderados.

---

## Permisos por modulo

### Autenticacion
| Accion | Permitido |
|--------|:---------:|
| Iniciar sesion | Si |

### Temporadas
| Accion | Permitido | Endpoint | Notas |
|--------|:---------:|----------|-------|
| Listar temporadas | Si | `GET /api/seasons` | Solo lectura |
| Ver detalle | Si | `GET /api/seasons/:id` | Solo lectura |
| Crear temporada | No | `POST /api/seasons` | Requiere superadmin |
| Editar temporada | No | `PUT /api/seasons/:id` | Requiere superadmin |
| Eliminar temporada | No | `DELETE /api/seasons/:id` | Requiere superadmin |

### Fechas de sesion
| Accion | Permitido | Endpoint | Notas |
|--------|:---------:|----------|-------|
| Listar fechas | Si | `GET /api/seasons/:seasonID/dates` | Solo lectura |
| Crear fecha individual | No | `POST /api/seasons/:seasonID/dates` | Requiere superadmin |
| Crear fechas masivamente | No | `POST /api/seasons/:seasonID/dates/bulk` | Requiere superadmin |
| Eliminar fecha | No | `DELETE /api/seasons/:seasonID/dates/:id` | Requiere superadmin |

### Usuarios
| Accion | Permitido | Endpoint | Notas |
|--------|:---------:|----------|-------|
| Listar usuarios | Si | `GET /api/users` | |
| Crear usuario | Parcial | `POST /api/users` | Solo puede crear roles `admin` y `voluntario`, NO `superadmin` |
| Editar usuario | Parcial | `PUT /api/users/:id` | No puede cambiar el rol de un usuario |
| Eliminar usuario | No | `DELETE /api/users/:id` | Requiere superadmin |

### Apoderados
| Accion | Permitido | Endpoint |
|--------|:---------:|----------|
| Listar apoderados | Si | `GET /api/guardians` |
| Ver detalle | Si | `GET /api/guardians/:id` |
| Ver estudiantes del apoderado | Si | `GET /api/guardians/:id/students` |
| Crear apoderado | Si | `POST /api/guardians` |
| Editar apoderado | Si | `PUT /api/guardians/:id` |
| Eliminar apoderado | No | `DELETE /api/guardians/:id` | 

### Estudiantes
| Accion | Permitido | Endpoint |
|--------|:---------:|----------|
| Listar estudiantes | Si | `GET /api/students` |
| Ver detalle | Si | `GET /api/students/:id` |
| Ver codigo QR | Si | `GET /api/students/:id/qr` |
| Crear estudiante | Si | `POST /api/students` |
| Editar estudiante | Si | `PUT /api/students/:id` |
| Eliminar estudiante | Si | `DELETE /api/students/:id` |
| Reenviar QR por email | Si | `POST /api/students/:id/resend-qr` |

### Equipos
| Accion | Permitido | Endpoint |
|--------|:---------:|----------|
| Listar equipos | Si | `GET /api/teams` |
| Ver detalle | Si | `GET /api/teams/:id` |
| Crear equipo | Si | `POST /api/teams` |
| Editar equipo | Si | `PUT /api/teams/:id` |
| Eliminar equipo | Si | `DELETE /api/teams/:id` |
| Listar asignaciones estudiantes | Si | `GET /api/teams/students` |
| Listar asignaciones mentores | Si | `GET /api/teams/mentors` |
| Asignar estudiante a equipo | Si | `POST /api/teams/assign-student` |
| Remover estudiante de equipo | Si | `POST /api/teams/remove-student` |
| Asignar mentor a equipo | Si | `POST /api/teams/assign-mentor` |
| Remover mentor de equipo | Si | `POST /api/teams/remove-mentor` |

### Asistencia
| Accion | Permitido | Endpoint |
|--------|:---------:|----------|
| Registrar asistencia (escanear QR) | Si | `POST /api/attendance` |
| Ver asistencia por fecha | Si | `GET /api/attendance/date/:date` |
| Ver asistencia por estudiante | Si | `GET /api/attendance/student/:studentID` |
| Ver estadisticas | Si | `GET /api/attendance/stats` |
| Ver asistencia por temporada | Si | `GET /api/attendance/season/:seasonID` |

### Dashboard
| Elemento | Visible |
|----------|:-------:|
| Panel de Asistencia | Si |
| Informe de Asistencia | Si |
| Lista de Estudiantes | Si |
| Gestion de Equipos | No (solo visible para superadmin en Dashboard) |
| Temporadas | No |
| Usuarios | No |
| Fechas | No |

> **Nota:** Aunque el Dashboard no muestra las tarjetas de Equipos, Temporadas, etc., el admin puede acceder a `/equipos` directamente por URL y tiene permisos de backend para gestionar equipos. Las rutas frontend no tienen restriccion por rol.

---

## Paginas accesibles en el frontend

| Ruta | Pagina | Acceso | Notas |
|------|--------|:------:|-------|
| `/panel` | Dashboard | Si | Tarjetas limitadas |
| `/temporadas` | Gestion de Temporadas | Parcial | Puede navegar pero no puede crear/editar/eliminar |
| `/usuarios` | Gestion de Usuarios | Si | Con restricciones en backend |
| `/fechas` | Gestion de Fechas | Parcial | Puede navegar pero no puede crear/eliminar |
| `/estudiantes` | Gestion de Estudiantes | Si | CRUD completo |
| `/equipos` | Gestion de Equipos | Si | CRUD completo (aunque no aparece en Dashboard) |
| `/asistencia` | Panel de Asistencia | Si | |
| `/informe-asistencia` | Informe de Asistencia | Si | |

---

## Restricciones importantes

1. **No puede crear superadmins** - Al intentar crear un usuario con rol `superadmin`, el backend retorna error 403
2. **No puede cambiar roles** - Al editar un usuario, si intenta modificar el campo `rol`, el backend lo ignora/rechaza
3. **No puede eliminar usuarios** - Solo superadmin puede eliminar usuarios
4. **No puede eliminar apoderados** - Solo superadmin puede eliminar apoderados
5. **No puede gestionar temporadas ni fechas** - Estas funciones son exclusivas del superadmin

## Archivos clave que controlan estos permisos

- Middleware: `backend/src/middleware.js` - `checkRole('superadmin', 'admin')`
- Logica de restriccion de rol en creacion/edicion: `backend/src/controllers/userController.js` (lineas 28-34, 64-72)
