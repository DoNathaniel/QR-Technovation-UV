# Modulo: Usuarios

## Descripcion

Gestiona los usuarios del sistema (personas que operan la plataforma). Cada usuario tiene un rol asignado (superadmin, admin o voluntario) y puede estar asociado a una o mas temporadas.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/users.js` |
| Controlador | `backend/src/controllers/userController.js` |
| Entidad | `backend/src/entities/User.js` |
| Pagina frontend | `frontend/src/pages/UsersPage.tsx` |

## Endpoints

| Metodo | Ruta | Middleware | Descripcion |
|--------|------|-----------|-------------|
| GET | `/api/users` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Listar usuarios |
| POST | `/api/users` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Crear usuario |
| PUT | `/api/users/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Actualizar usuario |
| DELETE | `/api/users/:id` | `authenticateToken`, `checkRole('superadmin')` | Eliminar usuario |

## Permisos por rol

| Accion | Superadmin | Admin | Voluntario |
|--------|:----------:|:-----:|:----------:|
| Listar usuarios | Si | Si | No (403) |
| Crear usuario | Si (cualquier rol) | Parcial (solo admin/voluntario) | No (403) |
| Editar usuario | Si (puede cambiar rol) | Parcial (no puede cambiar rol) | No (403) |
| Eliminar usuario | Si | No | No (403) |

## Reglas de negocio en el controlador

### Crear usuario (`userController.create`)
- Si el usuario autenticado es `admin`, **no puede** crear un usuario con `rol='superadmin'`
- Se retorna error 403: "No tienes permiso para crear superadmins"

### Editar usuario (`userController.update`)
- Solo `superadmin` puede modificar el campo `rol` de un usuario
- Si un `admin` intenta cambiar el rol, el cambio se ignora o se rechaza
- Un `admin` no puede asignar el rol `superadmin` a ningun usuario

## Modelo de datos

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| nombre | VARCHAR | Nombre del usuario |
| apellido | VARCHAR | Apellido del usuario |
| email | VARCHAR (unique) | Email para login |
| password | VARCHAR | Contrasena hasheada |
| rol | ENUM | `superadmin`, `admin`, `voluntario` |
| activo | BOOLEAN | Si el usuario esta activo |
| createdAt | DATETIME | Fecha de creacion |
| updatedAt | DATETIME | Fecha de ultima modificacion |

## Relaciones

- Un usuario puede estar asociado a muchas **temporadas** (many-to-many)
- Los usuarios con rol `voluntario` pueden ser asignados como mentores en **equipos**

## Notas

- Las contrasenas se almacenan hasheadas (bcrypt)
- El voluntario no tiene acceso a ninguna ruta de este modulo
- La logica de restriccion de roles esta en el controlador, no solo en el middleware
