# Modulo: Dashboard

## Descripcion

Pagina principal del sistema tras iniciar sesion. Muestra estadisticas de asistencia del dia actual y tarjetas de navegacion hacia los demas modulos. Las tarjetas visibles dependen del rol del usuario.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Pagina frontend | `frontend/src/pages/Dashboard.tsx` |

> **Nota:** Este modulo es solo frontend. Usa endpoints de otros modulos para obtener datos.

## Endpoints utilizados

| Endpoint | Modulo origen | Datos obtenidos |
|----------|---------------|-----------------|
| `GET /api/attendance/stats` | Asistencia | Total estudiantes, presentes hoy, entradas, salidas |

## Permisos por rol

### Estadisticas (visibles para todos)

| Estadistica | Superadmin | Admin | Voluntario |
|-------------|:----------:|:-----:|:----------:|
| Total estudiantes | Si | Si | Si |
| Presentes hoy | Si | Si | Si |
| Entradas hoy | Si | Si | Si |
| Salidas hoy | Si | Si | Si |

### Tarjetas de navegacion

| Tarjeta | Ruta | Superadmin | Admin | Voluntario |
|---------|------|:----------:|:-----:|:----------:|
| Panel de Asistencia | `/asistencia` | Si | Si | Si |
| Informe de Asistencia | `/informe-asistencia` | Si | Si | Si |
| Lista de Estudiantes | `/estudiantes` | Si | Si | No |
| Gestion de Equipos | `/equipos` | Si | No | No |
| Temporadas | `/temporadas` | Si | No | No |
| Usuarios | `/usuarios` | Si | No | No |
| Fechas | `/fechas` | Si | No | No |

## Logica de control de acceso (frontend)

El Dashboard usa una funcion helper `canAccess(roles)` que verifica si el rol del usuario autenticado esta en la lista de roles permitidos:

```typescript
// Ejemplo de uso en Dashboard.tsx
canAccess(['superadmin'])          // Solo superadmin
canAccess(['superadmin', 'admin']) // Superadmin y admin
```

## Notas

- Las tarjetas que no son visibles para un rol simplemente no se renderizan
- No hay restriccion a nivel de ruta frontend: un voluntario podria navegar directamente a `/temporadas` por URL
- El control real de acceso lo hace el backend al rechazar las peticiones con 403
