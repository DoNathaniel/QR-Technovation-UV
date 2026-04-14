# Modulo: Informe de Asistencia

## Descripcion

Pagina de solo lectura que muestra un reporte visual de asistencia en formato de grilla. Cruza todos los estudiantes de una temporada con todas las fechas de sesion, mostrando el estado de asistencia con colores.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Pagina frontend | `frontend/src/pages/AttendanceReportPage.tsx` |

> **Nota:** Este modulo es solo frontend. Combina datos de multiples endpoints de otros modulos.

## Endpoints utilizados

| Endpoint | Modulo origen | Datos obtenidos |
|----------|---------------|-----------------|
| `GET /api/students?seasonID=X` | Estudiantes | Lista de estudiantes de la temporada |
| `GET /api/seasons/:id/dates` | Fechas | Lista de fechas de sesion |
| `GET /api/attendance/season/:seasonID` | Asistencia | Todos los registros de asistencia |

## Permisos por rol

| Accion | Superadmin | Admin | Voluntario |
|--------|:----------:|:-----:|:----------:|
| Ver informe | Si | Si | Si |

## Visualizacion de la grilla

La grilla muestra:
- **Filas:** Un estudiante por fila
- **Columnas:** Una fecha de sesion por columna
- **Celdas:** Estado de asistencia con codigo de color

### Codigo de colores

| Color | Significado |
|-------|-------------|
| Verde | Entrada + Salida registradas |
| Naranja | Solo entrada registrada (sin salida) |
| Gris | Ausente (sin registros) |

### Porcentaje de asistencia

Se calcula y muestra el porcentaje de asistencia de cada estudiante:
- `(dias con al menos una entrada / total de fechas) * 100`

## Notas

- El informe es de solo lectura, no permite modificar datos
- Todos los roles autenticados pueden acceder a este informe
- Es util para supervisar la participacion general de los estudiantes
- Los datos se cargan combinando tres peticiones API independientes
