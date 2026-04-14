# Modulo: Temporadas

## Descripcion

Gestiona las temporadas (periodos) del programa Technovation. Una temporada agrupa fechas de sesion, estudiantes, equipos y registros de asistencia. Todas las demas entidades se organizan dentro del contexto de una temporada.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/seasons.js` |
| Controlador | `backend/src/controllers/seasonController.js` |
| Entidad | `backend/src/entities/Season.js` |
| Pagina frontend | `frontend/src/pages/SeasonsPage.tsx` |
| Componente selector | `frontend/src/components/SeasonSelector.tsx` |

## Endpoints

| Metodo | Ruta | Middleware | Descripcion |
|--------|------|-----------|-------------|
| GET | `/api/seasons` | `authenticateToken` | Listar temporadas activas |
| GET | `/api/seasons/:id` | `authenticateToken` | Obtener temporada por ID |
| POST | `/api/seasons` | `authenticateToken`, `checkRole('superadmin')` | Crear temporada |
| PUT | `/api/seasons/:id` | `authenticateToken`, `checkRole('superadmin')` | Actualizar temporada |
| DELETE | `/api/seasons/:id` | `authenticateToken`, `checkRole('superadmin')` | Eliminar temporada |

## Permisos por rol

| Accion | Superadmin | Admin | Voluntario |
|--------|:----------:|:-----:|:----------:|
| Listar | Si | Si | Si |
| Ver detalle | Si | Si | Si |
| Crear | Si | No | No |
| Editar | Si | No | No |
| Eliminar | Si | No | No |

## Modelo de datos

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| nombre | VARCHAR | Nombre de la temporada (ej: "Temporada 2025") |
| activa | BOOLEAN | Si la temporada esta activa |
| createdAt | DATETIME | Fecha de creacion |
| updatedAt | DATETIME | Fecha de ultima modificacion |

## Relaciones

- Una temporada tiene muchas **fechas de sesion** (`SeasonDate`)
- Una temporada tiene muchos **estudiantes** (`Student`)
- Una temporada tiene muchos **equipos** (`Team`)
- Una temporada tiene muchos **registros de asistencia** (`Attendance`)
- Una temporada puede estar asociada a muchos **usuarios** (relacion many-to-many)

## Notas

- Solo las temporadas activas se listan por defecto
- El componente `SeasonSelector` permite al usuario cambiar de temporada en el frontend
- Al eliminar una temporada, considerar el impacto en cascada sobre los datos relacionados
