# Rol: Voluntario

**Nivel de acceso:** Minimo - Escaneo de QR y consulta basica

**Descripcion:** El voluntario (mentor) tiene un rol operativo enfocado en el registro de asistencia mediante escaneo de codigos QR. Puede consultar informacion basica de estudiantes y equipos pero no puede crear, editar ni eliminar ningun recurso (excepto registrar asistencia).

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
| Crear temporada | No | | |
| Editar temporada | No | | |
| Eliminar temporada | No | | |

### Fechas de sesion
| Accion | Permitido | Endpoint | Notas |
|--------|:---------:|----------|-------|
| Listar fechas | Si | `GET /api/seasons/:seasonID/dates` | Solo lectura |
| Crear/Editar/Eliminar | No | | |

### Usuarios
| Accion | Permitido | Notas |
|--------|:---------:|-------|
| Cualquier accion | No | Retorna 403 - Sin acceso al modulo |

### Apoderados
| Accion | Permitido | Notas |
|--------|:---------:|-------|
| Cualquier accion | No | Retorna 403 - Sin acceso al modulo |

### Estudiantes
| Accion | Permitido | Endpoint | Notas |
|--------|:---------:|----------|-------|
| Listar estudiantes | Si | `GET /api/students` | Solo lectura |
| Ver detalle | Si | `GET /api/students/:id` | Solo lectura |
| Ver codigo QR | Si | `GET /api/students/:id/qr` | Solo lectura |
| Crear estudiante | No | | Requiere admin o superadmin |
| Editar estudiante | No | | Requiere admin o superadmin |
| Eliminar estudiante | No | | Requiere admin o superadmin |
| Reenviar QR | No | | Requiere admin o superadmin |

### Equipos
| Accion | Permitido | Endpoint | Notas |
|--------|:---------:|----------|-------|
| Listar equipos | Si | `GET /api/teams` | Solo lectura |
| Ver detalle | Si | `GET /api/teams/:id` | Solo lectura |
| Listar asignaciones estudiantes | Si | `GET /api/teams/students` | Solo lectura |
| Listar asignaciones mentores | No | `GET /api/teams/mentors` | Requiere admin o superadmin |
| Crear/Editar/Eliminar equipo | No | | Requiere admin o superadmin |
| Asignar/Remover miembros | No | | Requiere admin o superadmin |

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
| Lista de Estudiantes | No |
| Gestion de Equipos | No |
| Temporadas | No |
| Usuarios | No |
| Fechas | No |

---

## Paginas accesibles en el frontend

| Ruta | Pagina | Acceso | Notas |
|------|--------|:------:|-------|
| `/panel` | Dashboard | Si | Solo 2 tarjetas visibles |
| `/asistencia` | Panel de Asistencia | Si | Funcion principal del rol |
| `/informe-asistencia` | Informe de Asistencia | Si | |
| `/estudiantes` | Gestion de Estudiantes | Parcial | Puede navegar pero solo ve datos (sin botones de accion) |
| `/equipos` | Gestion de Equipos | Parcial | Puede navegar pero solo lectura |
| `/temporadas` | Gestion de Temporadas | Parcial | Puede navegar pero sin acciones |
| `/usuarios` | Gestion de Usuarios | No | Backend retorna 403 en todas las peticiones |
| `/fechas` | Gestion de Fechas | Parcial | Puede navegar pero sin acciones |

> **Nota:** Las rutas del frontend no tienen restriccion por rol (solo verifican autenticacion). El voluntario puede navegar a cualquier URL pero las acciones estan bloqueadas por el backend.

---

## Flujo de trabajo tipico del voluntario

1. Inicia sesion en `/iniciar-sesion`
2. Ve el Dashboard con las tarjetas de Asistencia e Informe
3. Accede al Panel de Asistencia (`/asistencia`)
4. Escanea codigos QR de estudiantes con la camara del dispositivo
5. El sistema registra automaticamente entrada/salida
6. Puede consultar el Informe de Asistencia para ver el estado general

---

## Archivos clave que controlan estos permisos

- Middleware: `backend/src/middleware.js` - `checkRole(...)` excluye `voluntario` de la mayoria de rutas
- Dashboard: `frontend/src/pages/Dashboard.tsx` - `canAccess()` filtra tarjetas visibles
