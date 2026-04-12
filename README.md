# Sistema de Toma de Asistencia Estudiantil

Webapp para gestionar la asistencia de estudiantes mediante escaneo de códigos QR.

## Descripción

Sistema diseñado para mentores y coordinadores que necesitan registrar la asistencia de estudiantes en actividades/talleres. El flujo principal consiste en escanear un código QR único por estudiante para registrar entrada/salida.

## Características Principales

- **Escaneo QR**: Cámara optimizada para dispositivos móviles
- **Gestión por Temporadas**: Cada temporada tiene sus propias fechas de asistencia y estudiantes
- **Roles de Usuario**: Superadmin, Admin, Voluntario
- **Tiempo Real**: Actualización instantánea via Socket.io
- **Categorías**: Beginner, Junior, Senior

## Roles y Permisos

| Permiso | Superadmin | Admin | Voluntario |
|---------|------------|-------|------------|
| Crear temporadas | ✅ | ❌ | ❌ |
| Gestionar fechas de asistencia | ✅ | 🔵 (ver) | ❌ |
| Crear usuarios | ✅ (hasta superadmin) | ✅ (hasta admin) | ❌ |
| Gestionar estudiantes (CRUD) | ✅ | ✅ | ❌ |
| Ver lista estudiantes | ✅ | ✅ | 🔵 (solo nombres, apellido, categoría) |
| Panel de asistencia | ✅ | ✅ | ✅ |
| Escanear QR | ✅ | ✅ | ✅ |
| Re-enviar QR por email | ✅ | ✅ | ❌ |

✅ = Acceso total | 🔵 = Acceso limitado | ❌ = Sin acceso

## Reglas de Negocio

- **Estudiantes por temporada**: Un RUT puede repetirse en diferentes temporadas, pero no dentro de la misma temporada
- **Fechas predefinidas**: El superadmin define las fechas de asistencia por temporada. Si se registra asistencia en una fecha no definida, se crea automáticamente
- **Retiro con apoderado**: Si el estudiante tiene retiro con apoderado, al marcar salida se solicita confirmación visual
- **Hermanas**: Un apoderado puede tener múltiples estudiantes asociadas en la misma temporada
- **Selector de temporada**: Si un usuario tiene acceso a múltiples temporadas, debe seleccionar una al iniciar sesión

## Estructura del Proyecto

```
QR-Technovation-UV/
├── frontend/           # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── types/
│   └── ...
│
├── backend/            # Express + TypeScript + MySQL
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── sockets/
│   └── ...
│
├── TODO.md             # Lista de tareas del proyecto
└── README.md
```

## Tecnologías

### Frontend
- React 18+ con TypeScript
- Vite
- React Router DOM
- Axios
- Socket.io-client
- Tailwind CSS (opcional)

### Backend
- Express.js con TypeScript
- MySQL
- TypeORM / Sequelize
- Socket.io
- JWT (autenticación)
- bcrypt (contraseñas)

## Requisitos Previos

- Node.js 18+
- MySQL 8+
- npm o yarn

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repositorio>
cd QR-Technovation-UV
```

### 2. Configurar Backend

```bash
cd backend
npm install
```

Crear archivo `.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=asistencia_db
JWT_SECRET=tu_secret_key
```

Iniciar servidor:

```bash
npm run dev
```

### 3. Configurar Frontend

```bash
cd frontend
npm install
```

Crear archivo `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

Iniciar aplicación:

```bash
npm run dev
```

## Primeros Pasos

1. **Crear superadmin inicial**: Directly en la base de datos (el usuario creará el suyo manualmente según las reglas)
2. **Crear temporada**: El superadmin crea una temporada
3. **Definir fechas**: El superadmin agrega las fechas de asistencia predefinidas
4. **Crear usuarios**: Superadmin crea admins, admins crean voluntarios
5. **Registrar estudiantes**: Los admins registran estudiantes con su QR único
6. **Escanear**: Voluntarios/admins escanean QR para registrar asistencia

## Flujo de Asistencia

```
1. Usuario inicia sesión → selecciona temporada
2. Abre panel de escaneo QR
3. Escanea código QR del estudiante
4. Sistema verifica:
   - ¿Ya tiene entrada? → Marcar salida
   - ¿Tiene retiro con apoderado? → Confirmar que vio al apoderado
5. Registro即时 visible en panel de asistencia (socket)
```

## API Endpoints

### Autenticación
- `POST /auth/login` - Iniciar sesión

### Temporadas
- `GET /seasons` - Listar temporadas
- `POST /seasons` - Crear temporada (superadmin)
- `PUT /seasons/:id` - Editar temporada
- `DELETE /seasons/:id` - Eliminar temporada

### Fechas de Asistencia
- `GET /seasons/:id/dates` - Ver fechas de una temporada
- `POST /seasons/:id/dates` - Agregar fecha (superadmin)
- `POST /seasons/:id/dates/bulk` - Importar rango de fechas

### Usuarios
- `GET /users` - Listar usuarios
- `POST /users` - Crear usuario
- `PUT /users/:id` - Editar usuario
- `DELETE /users/:id` - Eliminar usuario

### Estudiantes
- `GET /students` - Listar estudiantes (filtro por temporada)
- `POST /students` - Crear estudiante
- `PUT /students/:id` - Editar estudiante
- `DELETE /students/:id` - Eliminar estudiante
- `GET /students/:id/qr` - Obtener imagen QR
- `POST /students/:id/resend-qr` - Re-enviar QR por email

### Apoderados
- `GET /guardians` - Listar apoderados
- `POST /guardians` - Crear/editar apoderado
- `GET /guardians/:id/students` - Ver estudiantes asociadas

### Asistencia
- `POST /attendance` - Registrar asistencia
- `GET /attendance/date/:date` - Ver asistencia por fecha
- `GET /attendance/student/:studentId` - Historial de estudiante

## Socket Events

### Server → Client
- `attendance:registered` - Nueva asistencia registrada
- `attendance:updated` - Asistencia actualizada (entrada→salida)
- `students:online` - Usuarios conectados por sesión

## Pendientes

- [ ] Integración con CDN para almacenamiento de imágenes QR (detalles por definir)
- [ ] Sistema de emails para re-envío de QR

## Licencia

MIT