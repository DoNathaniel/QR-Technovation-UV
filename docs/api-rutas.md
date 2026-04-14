# Referencia completa de rutas API

Base URL: `/api`

## Indice

- [Autenticacion](#autenticacion)
- [Temporadas](#temporadas)
- [Fechas de sesion](#fechas-de-sesion)
- [Usuarios](#usuarios)
- [Apoderados](#apoderados)
- [Estudiantes](#estudiantes)
- [Equipos](#equipos)
- [Asistencia](#asistencia)
- [Health Check](#health-check)

---

## Autenticacion

| # | Metodo | Ruta | Middleware | Controlador | Descripcion |
|---|--------|------|-----------|-------------|-------------|
| 1 | POST | `/api/auth/login` | Ninguno | `authController.login` | Iniciar sesion |

## Temporadas

| # | Metodo | Ruta | Middleware | Controlador | Descripcion |
|---|--------|------|-----------|-------------|-------------|
| 2 | GET | `/api/seasons` | `authenticateToken` | `seasonController.getAll` | Listar temporadas activas |
| 3 | GET | `/api/seasons/:id` | `authenticateToken` | `seasonController.getById` | Obtener temporada por ID |
| 4 | POST | `/api/seasons` | `authenticateToken`, `checkRole('superadmin')` | `seasonController.create` | Crear temporada |
| 5 | PUT | `/api/seasons/:id` | `authenticateToken`, `checkRole('superadmin')` | `seasonController.update` | Actualizar temporada |
| 6 | DELETE | `/api/seasons/:id` | `authenticateToken`, `checkRole('superadmin')` | `seasonController.remove` | Eliminar temporada |

## Fechas de sesion

| # | Metodo | Ruta | Middleware | Handler | Descripcion |
|---|--------|------|-----------|---------|-------------|
| 7 | GET | `/api/seasons/:seasonID/dates` | `authenticateToken` | Inline (seasonDates.js) | Listar fechas |
| 8 | POST | `/api/seasons/:seasonID/dates` | `authenticateToken`, `checkRole('superadmin')` | Inline (seasonDates.js) | Crear fecha |
| 9 | POST | `/api/seasons/:seasonID/dates/bulk` | `authenticateToken`, `checkRole('superadmin')` | Inline (seasonDates.js) | Crear fechas en bloque |
| 10 | DELETE | `/api/seasons/:seasonID/dates/:id` | **SIN MIDDLEWARE** | Inline (seasonDates.js) | Eliminar fecha |

## Usuarios

| # | Metodo | Ruta | Middleware | Controlador | Descripcion |
|---|--------|------|-----------|-------------|-------------|
| 11 | GET | `/api/users` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `userController.getAll` | Listar usuarios |
| 12 | POST | `/api/users` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `userController.create` | Crear usuario |
| 13 | PUT | `/api/users/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `userController.update` | Actualizar usuario |
| 14 | DELETE | `/api/users/:id` | `authenticateToken`, `checkRole('superadmin')` | `userController.remove` | Eliminar usuario |

## Apoderados

| # | Metodo | Ruta | Middleware | Controlador | Descripcion |
|---|--------|------|-----------|-------------|-------------|
| 15 | GET | `/api/guardians` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `guardianController.getAll` | Listar apoderados |
| 16 | GET | `/api/guardians/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `guardianController.getById` | Obtener por ID |
| 17 | GET | `/api/guardians/:id/students` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `guardianController.getStudentsByGuardianId` | Estudiantes del apoderado |
| 18 | POST | `/api/guardians` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `guardianController.create` | Crear apoderado |
| 19 | PUT | `/api/guardians/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `guardianController.update` | Actualizar apoderado |
| 20 | DELETE | `/api/guardians/:id` | `authenticateToken`, `checkRole('superadmin')` | `guardianController.remove` | Eliminar apoderado |

## Estudiantes

| # | Metodo | Ruta | Middleware | Controlador | Descripcion |
|---|--------|------|-----------|-------------|-------------|
| 21 | GET | `/api/students` | `authenticateToken`, `checkRole('superadmin', 'admin', 'voluntario')` | `studentController.getAll` | Listar estudiantes |
| 22 | GET | `/api/students/:id/qr` | `authenticateToken`, `checkRole('superadmin', 'admin', 'voluntario')` | `studentController.getQR` | Obtener imagen QR |
| 23 | GET | `/api/students/:id` | `authenticateToken`, `checkRole('superadmin', 'admin', 'voluntario')` | `studentController.getById` | Obtener por ID |
| 24 | POST | `/api/students` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `studentController.create` | Crear estudiante |
| 25 | PUT | `/api/students/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `studentController.update` | Actualizar estudiante |
| 26 | DELETE | `/api/students/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `studentController.remove` | Eliminar estudiante |
| 27 | POST | `/api/students/:id/resend-qr` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `studentController.resendQR` | Reenviar QR por email |

## Equipos

| # | Metodo | Ruta | Middleware | Controlador | Descripcion |
|---|--------|------|-----------|-------------|-------------|
| 28 | POST | `/api/teams/assign-student` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `teamController.assignStudent` | Asignar estudiante |
| 29 | POST | `/api/teams/remove-student` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `teamController.removeStudent` | Remover estudiante |
| 30 | POST | `/api/teams/assign-mentor` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `teamController.assignMentor` | Asignar mentor |
| 31 | POST | `/api/teams/remove-mentor` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `teamController.removeMentor` | Remover mentor |
| 32 | GET | `/api/teams/students` | `authenticateToken` | `teamController.listTeamStudents` | Listar asignaciones estudiantes |
| 33 | GET | `/api/teams/mentors` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `teamController.listTeamMentors` | Listar asignaciones mentores |
| 34 | GET | `/api/teams` | `authenticateToken` | `teamController.list` | Listar equipos |
| 35 | GET | `/api/teams/:id` | `authenticateToken` | `teamController.get` | Obtener equipo por ID |
| 36 | POST | `/api/teams` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `teamController.create` | Crear equipo |
| 37 | PUT | `/api/teams/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `teamController.update` | Actualizar equipo |
| 38 | DELETE | `/api/teams/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | `teamController.remove` | Eliminar equipo |

## Asistencia

| # | Metodo | Ruta | Middleware | Controlador | Descripcion |
|---|--------|------|-----------|-------------|-------------|
| 39 | POST | `/api/attendance` | **SIN MIDDLEWARE** | `attendanceController.register` | Registrar asistencia |
| 40 | GET | `/api/attendance/date/:date` | **SIN MIDDLEWARE** | `attendanceController.getByDate` | Por fecha |
| 41 | GET | `/api/attendance/student/:studentID` | **SIN MIDDLEWARE** | `attendanceController.getByStudent` | Por estudiante |
| 42 | GET | `/api/attendance/stats` | **SIN MIDDLEWARE** | `attendanceController.getStats` | Estadisticas |
| 43 | GET | `/api/attendance/season/:seasonID` | **SIN MIDDLEWARE** | `attendanceController.getBySeason` | Por temporada |

## Health Check

| # | Metodo | Ruta | Middleware | Handler | Descripcion |
|---|--------|------|-----------|---------|-------------|
| 44 | GET | `/health` | Ninguno | Inline (main.js) | Verificar estado del servidor |

---

## Leyenda de middleware

| Middleware | Descripcion | Archivo |
|-----------|-------------|---------|
| `authenticateToken` | Verifica el token JWT en el header `Authorization` | `backend/src/middleware.js` |
| `checkRole(...roles)` | Verifica que `req.user.rol` este en la lista de roles permitidos | `backend/src/middleware.js` |
| **SIN MIDDLEWARE** | La ruta no tiene ninguna proteccion (problema de seguridad) | - |

## Problemas de seguridad conocidos

1. Todas las rutas de **Asistencia** (#39-43) no tienen middleware de autenticacion
2. La ruta **DELETE fecha de sesion** (#10) no tiene middleware de autenticacion
3. Las conexiones **Socket.io** no validan tokens JWT
