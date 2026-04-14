# Modulo: Estudiantes

## Descripcion

Gestiona los estudiantes del programa. Al crear un estudiante, el sistema genera automaticamente un codigo QR personalizado (compuesto sobre una imagen de plantilla de marca), lo sube a un CDN y envia el QR por email al apoderado. Este QR se utiliza para registrar la asistencia.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/students.js` |
| Controlador | `backend/src/controllers/studentController.js` |
| Entidad | `backend/src/entities/Student.js` |
| Servicio QR | `backend/src/services/qrService.js` |
| Servicio Email | `backend/src/services/emailService.js` |
| Pagina frontend | `frontend/src/pages/StudentsPage.tsx` |

## Endpoints

| Metodo | Ruta | Middleware | Descripcion |
|--------|------|-----------|-------------|
| GET | `/api/students` | `authenticateToken`, `checkRole('superadmin', 'admin', 'voluntario')` | Listar estudiantes |
| GET | `/api/students/:id` | `authenticateToken`, `checkRole('superadmin', 'admin', 'voluntario')` | Obtener estudiante por ID |
| GET | `/api/students/:id/qr` | `authenticateToken`, `checkRole('superadmin', 'admin', 'voluntario')` | Obtener/redirigir a imagen QR |
| POST | `/api/students` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Crear estudiante (+ QR + email) |
| PUT | `/api/students/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Actualizar estudiante |
| DELETE | `/api/students/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Eliminar estudiante |
| POST | `/api/students/:id/resend-qr` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Reenviar QR por email |

### Parametros de filtrado (GET `/api/students`)

| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| seasonID | INT | Filtrar por temporada |
| categoria | STRING | Filtrar por categoria |

## Permisos por rol

| Accion | Superadmin | Admin | Voluntario |
|--------|:----------:|:-----:|:----------:|
| Listar estudiantes | Si | Si | Si |
| Ver detalle | Si | Si | Si |
| Ver codigo QR | Si | Si | Si |
| Crear estudiante | Si | Si | No |
| Editar estudiante | Si | Si | No |
| Eliminar estudiante | Si | Si | No |
| Reenviar QR por email | Si | Si | No |

## Modelo de datos

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| nombre | VARCHAR | Nombre del estudiante |
| apellido | VARCHAR | Apellido del estudiante |
| rut | VARCHAR | RUT del estudiante |
| fechaNacimiento | DATE | Fecha de nacimiento |
| categoria | VARCHAR | Categoria (ej: junior, senior) |
| email | VARCHAR | Email del estudiante (opcional) |
| qrCode | VARCHAR | URL de la imagen QR en CDN |
| retiradoApoderado | BOOLEAN | Si requiere confirmacion de apoderado para salida |
| seasonID | INT (FK) | Temporada a la que pertenece |
| guardianID | INT (FK) | Apoderado asociado |
| createdAt | DATETIME | Fecha de creacion |
| updatedAt | DATETIME | Fecha de ultima modificacion |

## Relaciones

- Pertenece a una **temporada** (`Season`)
- Pertenece a un **apoderado** (`Guardian`)
- Puede pertenecer a un **equipo** (via `TeamStudent`)
- Tiene muchos registros de **asistencia** (`Attendance`)

## Flujo de creacion de estudiante

1. Admin/Superadmin llena el formulario con datos del estudiante
2. Selecciona o crea un apoderado
3. Backend crea el registro en la base de datos
4. `qrService` genera un codigo QR con el ID del estudiante
5. El QR se compone sobre una imagen de plantilla con branding
6. La imagen resultante se sube a un CDN
7. `emailService` envia el QR por email al apoderado
8. Se guarda la URL del CDN en el campo `qrCode`

## Notas

- El QR contiene informacion que identifica al estudiante para el escaneo de asistencia
- La funcion "Reenviar QR" regenera y reenvia el email sin crear un nuevo QR
- El campo `retiradoApoderado` activa un flujo especial al registrar salida: se muestra un dialogo de confirmacion en el escaner
