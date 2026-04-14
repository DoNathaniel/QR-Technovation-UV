# Modulo: Autenticacion

## Descripcion

Maneja el inicio de sesion de usuarios mediante email y contrasena. Genera tokens JWT para autenticar las peticiones subsecuentes. Al iniciar sesion, retorna las temporadas asociadas al usuario.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/auth.js` |
| Controlador | `backend/src/controllers/authController.js` |
| Middleware JWT | `backend/src/middleware.js` |
| Pagina frontend | `frontend/src/pages/Login.tsx` |
| Contexto de auth | `frontend/src/context/AuthContext.tsx` |
| Servicio frontend | `frontend/src/services/auth.ts` |
| Interceptor API | `frontend/src/services/api.ts` |

## Endpoints

| Metodo | Ruta | Middleware | Descripcion |
|--------|------|-----------|-------------|
| POST | `/api/auth/login` | Ninguno (publico) | Autenticar usuario |

### POST `/api/auth/login`

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contrasena123"
}
```

**Respuesta exitosa (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "nombre": "Juan",
    "apellido": "Perez",
    "email": "usuario@ejemplo.com",
    "rol": "admin"
  },
  "temporadas": [...]
}
```

## Permisos por rol

| Rol | Acceso |
|-----|:------:|
| Superadmin | Si |
| Admin | Si |
| Voluntario | Si |
| Sin autenticar | Si (es la ruta publica de login) |

## Flujo de autenticacion

1. Usuario envia email + password a `POST /api/auth/login`
2. Backend verifica credenciales contra la base de datos
3. Si son correctas, genera un token JWT con `{ id, email, rol, temporadas }`
4. Frontend almacena el token en `AuthContext`
5. Todas las peticiones subsecuentes incluyen el token en el header `Authorization: Bearer <token>`
6. El middleware `authenticateToken` valida el token en cada peticion protegida

## Notas tecnicas

- Los tokens JWT se generan con la libreria `jsonwebtoken`
- El secret se configura via variable de entorno `JWT_SECRET`
- El interceptor en `frontend/src/services/api.ts` agrega automaticamente el header de autorizacion
- Si el token expira o es invalido, el frontend redirige a `/iniciar-sesion`
