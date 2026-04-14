# Rol: Superadmin

**Nivel de acceso:** Maximo - Control total del sistema

**Descripcion:** El superadmin tiene acceso completo a todas las funcionalidades del sistema. Es el unico rol que puede gestionar temporadas, fechas y eliminar registros criticos.

---

## Permisos por modulo

### Autenticacion
| Accion | Permitido |
|--------|:---------:|
| Iniciar sesion | Si |

### Temporadas
| Accion | Permitido | Endpoint |
|--------|:---------:|----------|
| Listar temporadas | Si | `GET /api/seasons` |
| Ver detalle | Si | `GET /api/seasons/:id` |
| Crear temporada | Si | `POST /api/seasons` |
| Editar temporada | Si | `PUT /api/seasons/:id` |
| Eliminar temporada | Si | `DELETE /api/seasons/:id` |

### Fechas de sesion
| Accion | Permitido | Endpoint |
|--------|:---------:|----------|
| Listar fechas | Si | `GET /api/seasons/:seasonID/dates` |
| Crear fecha individual | Si | `POST /api/seasons/:seasonID/dates` |
| Crear fechas masivamente | Si | `POST /api/seasons/:seasonID/dates/bulk` |
| Eliminar fecha | Si | `DELETE /api/seasons/:seasonID/dates/:id` |

### Usuarios
| Accion | Permitido | Endpoint | Notas |
|--------|:---------:|----------|-------|
| Listar usuarios | Si | `GET /api/users` | |
| Crear usuario | Si | `POST /api/users` | Puede crear cualquier rol (superadmin, admin, voluntario) |
| Editar usuario | Si | `PUT /api/users/:id` | Puede cambiar el rol de un usuario |
| Eliminar usuario | Si | `DELETE /api/users/:id` | Unico rol que puede eliminar usuarios |

### Apoderados
| Accion | Permitido | Endpoint |
|--------|:---------:|----------|
| Listar apoderados | Si | `GET /api/guardians` |
| Ver detalle | Si | `GET /api/guardians/:id` |
| Ver estudiantes del apoderado | Si | `GET /api/guardians/:id/students` |
| Crear apoderado | Si | `POST /api/guardians` |
| Editar apoderado | Si | `PUT /api/guardians/:id` |
| Eliminar apoderado | Si | `DELETE /api/guardians/:id` |

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
| Gestion de Equipos | Si |
| Temporadas | Si |
| Usuarios | Si |
| Fechas | Si |

---

## Paginas accesibles en el frontend

| Ruta | Pagina | Acceso |
|------|--------|:------:|
| `/panel` | Dashboard | Si |
| `/temporadas` | Gestion de Temporadas | Si |
| `/usuarios` | Gestion de Usuarios | Si |
| `/fechas` | Gestion de Fechas | Si |
| `/estudiantes` | Gestion de Estudiantes | Si |
| `/equipos` | Gestion de Equipos | Si |
| `/asistencia` | Panel de Asistencia | Si |
| `/informe-asistencia` | Informe de Asistencia | Si |

---

## Archivos clave del backend que controlan estos permisos

- Middleware de autenticacion: `backend/src/middleware.js`
- Rutas con `checkRole('superadmin')`: archivos en `backend/src/routes/`
- Logica adicional en controladores: `backend/src/controllers/userController.js`
