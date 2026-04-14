# Modulo: Fechas de Sesion

## Descripcion

Gestiona las fechas especificas dentro de una temporada en las que se realizan talleres y se registra asistencia. Permite crear fechas individuales o en bloque (rango de fechas).

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/seasonDates.js` |
| Entidad | `backend/src/entities/SeasonDate.js` |
| Pagina frontend | `frontend/src/pages/DatesPage.tsx` |

> **Nota:** Este modulo no tiene controlador separado. Los handlers estan definidos directamente en el archivo de rutas.

## Endpoints

| Metodo | Ruta | Middleware | Descripcion |
|--------|------|-----------|-------------|
| GET | `/api/seasons/:seasonID/dates` | `authenticateToken` | Listar fechas de una temporada |
| POST | `/api/seasons/:seasonID/dates` | `authenticateToken`, `checkRole('superadmin')` | Crear fecha individual |
| POST | `/api/seasons/:seasonID/dates/bulk` | `authenticateToken`, `checkRole('superadmin')` | Crear fechas en bloque |
| DELETE | `/api/seasons/:seasonID/dates/:id` | **Sin middleware** | Eliminar fecha |

> **Advertencia:** La ruta DELETE no tiene middleware de autenticacion ni de rol. Esto es un problema de seguridad conocido.

## Permisos por rol

| Accion | Superadmin | Admin | Voluntario |
|--------|:----------:|:-----:|:----------:|
| Listar fechas | Si | Si | Si |
| Crear fecha individual | Si | No | No |
| Crear fechas en bloque | Si | No | No |
| Eliminar fecha | Si | Sin proteccion* | Sin proteccion* |

*La ruta DELETE carece de middleware, cualquier peticion (incluso sin token) puede eliminar fechas.

## Modelo de datos

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | INT (PK) | Identificador unico |
| fecha | DATE | Fecha de la sesion |
| seasonID | INT (FK) | Referencia a la temporada |

## Relaciones

- Pertenece a una **temporada** (`Season`)
- Los registros de asistencia se asocian por fecha

## Creacion en bloque

El endpoint `POST /api/seasons/:seasonID/dates/bulk` permite crear multiples fechas a partir de un rango:

```json
{
  "fechaInicio": "2025-03-01",
  "fechaFin": "2025-06-30",
  "diaSemana": 6
}
```

Esto crea una fecha por cada dia del rango que coincida con el dia de la semana indicado (0=domingo, 6=sabado).

## Notas

- Las fechas se usan como referencia para los registros de asistencia
- El informe de asistencia muestra una columna por cada fecha de la temporada
