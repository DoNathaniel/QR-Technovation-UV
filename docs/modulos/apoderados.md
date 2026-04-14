# Modulo: Apoderados

## Descripcion

Gestiona los apoderados (tutores/padres) de los estudiantes. Un apoderado puede tener multiples estudiantes asociados (hermanos). Los datos del apoderado se utilizan para el envio de QR por email y para el flujo de confirmacion de retiro de estudiantes.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/guardians.js` |
| Controlador | `backend/src/controllers/guardianController.js` |
| Entidad | `backend/src/entities/Guardian.js` |
| Frontend | Integrado en `frontend/src/pages/StudentsPage.tsx` (formulario inline y dropdown de seleccion) |

> **Nota:** No existe una pagina dedicada para apoderados. La gestion se hace desde la pagina de estudiantes.

## Endpoints

| Metodo | Ruta | Middleware | Descripcion |
|--------|------|-----------|-------------|
| GET | `/api/guardians` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Listar apoderados |
| GET | `/api/guardians/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Obtener apoderado por ID |
| GET | `/api/guardians/:id/students` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Listar estudiantes de un apoderado |
| POST | `/api/guardians` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Crear apoderado |
| PUT | `/api/guardians/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Actualizar apoderado |
| DELETE | `/api/guardians/:id` | `authenticateToken`, `checkRole('superadmin')` | Eliminar apoderado |

## Permisos por rol

| Accion | Superadmin | Admin | Voluntario |
|--------|:----------:|:-----:|:----------:|
| Listar | Si | Si | No (403) |
| Ver detalle | Si | Si | No (403) |
| Ver estudiantes asociados | Si | Si | No (403) |
| Crear | Si | Si | No (403) |
| Editar | Si | Si | No (403) |
| Eliminar | Si | No | No (403) |

## Modelo de datos

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| nombre | VARCHAR | Nombre del apoderado |
| apellido | VARCHAR | Apellido del apoderado |
| rut | VARCHAR | RUT del apoderado |
| telefono | VARCHAR | Telefono de contacto |
| email | VARCHAR | Email (se usa para enviar QR) |
| createdAt | DATETIME | Fecha de creacion |
| updatedAt | DATETIME | Fecha de ultima modificacion |

## Relaciones

- Un apoderado tiene muchos **estudiantes** (`Student`) - relacion uno-a-muchos
- Los estudiantes que comparten apoderado se consideran hermanos (usado en el flujo de alerta de hermanos al registrar salida)

## Notas

- Al crear un estudiante, se puede seleccionar un apoderado existente o crear uno nuevo inline
- El email del apoderado se utiliza para el envio del codigo QR del estudiante
- Al registrar la salida de un estudiante, el sistema busca hermanos (otros estudiantes con el mismo `guardianID`) y muestra una alerta
