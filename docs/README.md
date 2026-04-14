# Documentacion QR-Technovation-UV

Sistema de gestion de asistencia mediante codigos QR para talleres de Technovation UV.

## Estructura de la documentacion

### Roles

Documentacion detallada de los permisos y accesos de cada rol del sistema.

| Rol | Descripcion | Documentacion |
|-----|-------------|---------------|
| **Superadmin** | Administrador total del sistema | [Ver detalle](roles/superadmin.md) |
| **Admin** | Administrador con permisos limitados | [Ver detalle](roles/admin.md) |
| **Voluntario** | Voluntario/mentor con acceso minimo | [Ver detalle](roles/voluntario.md) |

### Modulos

Documentacion de cada modulo funcional del sistema.

| Modulo | Descripcion | Documentacion |
|--------|-------------|---------------|
| Autenticacion | Login y manejo de sesion JWT | [Ver detalle](modulos/autenticacion.md) |
| Temporadas | Gestion de temporadas/periodos | [Ver detalle](modulos/temporadas.md) |
| Fechas | Gestion de fechas de sesion | [Ver detalle](modulos/fechas.md) |
| Usuarios | Gestion de usuarios del sistema | [Ver detalle](modulos/usuarios.md) |
| Apoderados | Gestion de apoderados/tutores | [Ver detalle](modulos/apoderados.md) |
| Estudiantes | Gestion de estudiantes y QR | [Ver detalle](modulos/estudiantes.md) |
| Equipos | Gestion de equipos y asignaciones | [Ver detalle](modulos/equipos.md) |
| Asistencia | Registro de asistencia via QR | [Ver detalle](modulos/asistencia.md) |
| Dashboard | Panel principal con estadisticas | [Ver detalle](modulos/dashboard.md) |
| Informe Asistencia | Reportes de asistencia | [Ver detalle](modulos/informe-asistencia.md) |

### Referencia API

Tabla completa de todas las rutas de la API: [Ver rutas API](api-rutas.md)

---

## Resumen rapido de permisos por rol

| Modulo | Superadmin | Admin | Voluntario |
|--------|:----------:|:-----:|:----------:|
| Temporadas (CRUD) | Completo | Solo lectura | Solo lectura |
| Fechas (CRUD) | Completo | Solo lectura | Solo lectura |
| Usuarios (CRUD) | Completo | Crear/Editar (limitado) | Sin acceso |
| Apoderados (CRUD) | Completo | CRUD (sin eliminar) | Sin acceso |
| Estudiantes (CRUD) | Completo | Completo | Solo lectura |
| Equipos (CRUD) | Completo | Completo | Solo lectura |
| Asistencia | Completo | Completo | Completo |
| Dashboard | Todas las tarjetas | Tarjetas limitadas | Solo asistencia |
| Informe Asistencia | Completo | Completo | Completo |

---

## Como modificar esta documentacion

Cada archivo `.md` sigue una estructura consistente y facil de editar:

1. **Roles** (`docs/roles/`): Un archivo por rol con tablas de permisos por modulo
2. **Modulos** (`docs/modulos/`): Un archivo por modulo con descripcion, archivos clave, endpoints y permisos
3. **API** (`docs/api-rutas.md`): Tabla unica con todas las rutas

Para agregar un nuevo rol o modulo, simplemente crea un nuevo archivo `.md` siguiendo la misma estructura y agrega el enlace en este README.
