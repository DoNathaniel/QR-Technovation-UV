# Modulo: Asistencia

## Descripcion

Modulo central del sistema. Permite registrar la asistencia de estudiantes mediante el escaneo de codigos QR. Usa Socket.io para actualizar en tiempo real todos los clientes conectados. Gestiona automaticamente el toggle entre entrada y salida, e incluye un flujo especial de confirmacion con apoderado para la salida de ciertos estudiantes.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/attendance.js` |
| Controlador | `backend/src/controllers/attendanceController.js` |
| Entidad | `backend/src/entities/Attendance.js` |
| Socket.io (servidor) | `backend/src/main.js` (lineas 60-71) |
| Pagina frontend | `frontend/src/pages/AttendancePage.tsx` |
| Componente QR Scanner | `frontend/src/components/QrScanner.tsx` |
| Hook Socket | `frontend/src/hooks/useSocket.ts` |

## Endpoints

| Metodo | Ruta | Middleware | Descripcion |
|--------|------|-----------|-------------|
| POST | `/api/attendance` | **Ninguno** | Registrar asistencia |
| GET | `/api/attendance/date/:date` | **Ninguno** | Obtener asistencia por fecha |
| GET | `/api/attendance/student/:studentID` | **Ninguno** | Obtener asistencia por estudiante |
| GET | `/api/attendance/stats` | **Ninguno** | Obtener estadisticas |
| GET | `/api/attendance/season/:seasonID` | **Ninguno** | Obtener asistencia por temporada |

> **Advertencia de seguridad:** Ninguna ruta de asistencia tiene middleware de autenticacion o autorizacion. Cualquier peticion HTTP puede acceder a estos endpoints sin token.

## Permisos por rol

| Accion | Superadmin | Admin | Voluntario | Sin autenticar* |
|--------|:----------:|:-----:|:----------:|:---------------:|
| Registrar asistencia | Si | Si | Si | Si* |
| Consultar por fecha | Si | Si | Si | Si* |
| Consultar por estudiante | Si | Si | Si | Si* |
| Ver estadisticas | Si | Si | Si | Si* |
| Consultar por temporada | Si | Si | Si | Si* |

*Las rutas no tienen proteccion - esto es un bug de seguridad.

## Modelo de datos

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| studentID | INT (FK) | Referencia al estudiante |
| seasonID | INT (FK) | Referencia a la temporada |
| fecha | DATE | Fecha del registro |
| tipo | ENUM | `entrada` o `salida` |
| hora | TIME | Hora del registro |
| createdAt | DATETIME | Fecha de creacion |

## Relaciones

- Pertenece a un **estudiante** (`Student`)
- Pertenece a una **temporada** (`Season`)

## Flujo de registro de asistencia

1. Usuario abre el Panel de Asistencia (`/asistencia`)
2. Activa la camara para escanear QR
3. El QR se decodifica y se obtiene el ID del estudiante
4. Se envia `POST /api/attendance` con `{ studentID, seasonID, fecha }`
5. El backend determina automaticamente si es `entrada` o `salida`:
   - Si no hay registro previo para ese estudiante en esa fecha: es `entrada`
   - Si el ultimo registro fue `entrada`: es `salida`
   - Si el ultimo registro fue `salida`: es `entrada`
6. Se crea el registro en la base de datos
7. Se emite evento Socket.io `attendance-registered` a todos los clientes en la sala de la temporada
8. Todos los clientes actualizan su interfaz en tiempo real

## Flujo especial: Confirmacion de apoderado

Si el estudiante tiene `retiradoApoderado = true` y el registro es de tipo `salida`:

1. El escaner muestra un dialogo de confirmacion
2. Se indica que el estudiante requiere ser retirado por su apoderado
3. El operador debe confirmar antes de registrar la salida

## Flujo especial: Alerta de hermanos

Al registrar la salida de un estudiante:

1. El sistema busca otros estudiantes con el mismo `guardianID` en la misma temporada
2. Si encuentra hermanos, retorna sus nombres en la respuesta
3. El frontend muestra una alerta informando que hay hermanos registrados

## Eventos Socket.io

| Evento | Direccion | Descripcion |
|--------|-----------|-------------|
| `join-season` | Cliente -> Servidor | El cliente se une a la sala `season:{seasonId}` |
| `attendance-registered` | Servidor -> Cliente | Se emite a todos los clientes de la sala cuando se registra asistencia |

## Notas

- La asistencia se registra desde cualquier dispositivo con camara (movil o desktop)
- Los registros en tiempo real permiten que multiples voluntarios escaneen simultaneamente
- Las estadisticas del dashboard se obtienen de este modulo
