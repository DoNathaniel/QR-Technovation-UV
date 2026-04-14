# Modulo: Equipos

## Descripcion

Gestiona los equipos de trabajo del programa Technovation. Permite crear equipos, asignar estudiantes y mentores (voluntarios) mediante una interfaz de arrastrar y soltar (drag-and-drop). Cada equipo tiene un limite maximo de 5 estudiantes.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/teams.js` |
| Controlador | `backend/src/controllers/teamController.js` |
| Entidad equipo | `backend/src/entities/Team.js` |
| Entidad equipo-estudiante | `backend/src/entities/TeamStudent.js` |
| Entidad equipo-mentor | `backend/src/entities/TeamMentor.js` |
| Pagina frontend | `frontend/src/pages/TeamsPage.tsx` |

## Endpoints

| Metodo | Ruta | Middleware | Descripcion |
|--------|------|-----------|-------------|
| GET | `/api/teams` | `authenticateToken` | Listar equipos |
| GET | `/api/teams/:id` | `authenticateToken` | Obtener equipo por ID |
| POST | `/api/teams` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Crear equipo |
| PUT | `/api/teams/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Actualizar equipo |
| DELETE | `/api/teams/:id` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Eliminar equipo |
| GET | `/api/teams/students` | `authenticateToken` | Listar asignaciones estudiante-equipo |
| GET | `/api/teams/mentors` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Listar asignaciones mentor-equipo |
| POST | `/api/teams/assign-student` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Asignar estudiante a equipo |
| POST | `/api/teams/remove-student` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Remover estudiante de equipo |
| POST | `/api/teams/assign-mentor` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Asignar mentor a equipo |
| POST | `/api/teams/remove-mentor` | `authenticateToken`, `checkRole('superadmin', 'admin')` | Remover mentor de equipo |

## Permisos por rol

| Accion | Superadmin | Admin | Voluntario |
|--------|:----------:|:-----:|:----------:|
| Listar equipos | Si | Si | Si |
| Ver detalle | Si | Si | Si |
| Crear equipo | Si | Si | No |
| Editar equipo | Si | Si | No |
| Eliminar equipo | Si | Si | No |
| Ver asignaciones estudiantes | Si | Si | Si |
| Ver asignaciones mentores | Si | Si | No |
| Asignar/remover estudiantes | Si | Si | No |
| Asignar/remover mentores | Si | Si | No |

## Modelo de datos

### Team (Equipo)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| nombre | VARCHAR | Nombre del equipo |
| categoria | VARCHAR | Categoria del equipo |
| seasonID | INT (FK) | Temporada a la que pertenece |
| createdAt | DATETIME | Fecha de creacion |
| updatedAt | DATETIME | Fecha de ultima modificacion |

### TeamStudent (Asignacion estudiante-equipo)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| teamID | INT (FK) | Referencia al equipo |
| studentID | INT (FK) | Referencia al estudiante |

### TeamMentor (Asignacion mentor-equipo)
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| teamID | INT (FK) | Referencia al equipo |
| userID | INT (FK) | Referencia al usuario (mentor/voluntario) |

## Reglas de negocio

1. **Maximo 5 estudiantes por equipo** - Validado en el controlador al asignar
2. **Un estudiante solo puede pertenecer a un equipo por temporada** - Restriccion unica en base de datos + validacion en controlador
3. **La categoria del estudiante debe coincidir con la del equipo** - Validado en el frontend
4. **Un mentor puede estar en multiples equipos** - No hay restriccion de unicidad para mentores

## Relaciones

- Pertenece a una **temporada** (`Season`)
- Tiene muchos **estudiantes** (via `TeamStudent`)
- Tiene muchos **mentores** (via `TeamMentor`, referencia a `User`)

## Notas

- La interfaz usa drag-and-drop para asignar estudiantes y mentores
- En el Dashboard, la tarjeta de equipos solo es visible para `superadmin`, aunque `admin` tiene permisos backend completos
- El voluntario puede ver equipos y sus estudiantes pero no puede modificar nada
