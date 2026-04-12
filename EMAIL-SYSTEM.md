# Sistema de Gestión de Emails - DoN Project

## Overview

El sistema de emails permite enviar correos usando la API de Zoho Mail. Soporta múltiples cuentas de correo, plantillas con variables y envío directo.

---

## Configuración Inicial

### 1. Configurar Zoho OAuth

Primero, necesitas obtener las credenciales de Zoho:

1. Ve a https://api-console.zoho.com/
2. Crea un cliente OAuth con estos permisos:
   - `ZohoMail.mails.compose`
   - `ZohoMail.mails.send`
3. Obtén el **refresh token** ejecutando el flujo OAuth

Luego, guarda la configuración en la API:

```bash
curl -X PUT http://localhost:1011/api/email/zoho \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "6792124000000008002",
    "clientId": "1000.YNIRW5A5PTYBH5FOEGNMWY0SSRUPAN",
    "clientSecret": "950fc9c9bddf625bfc0908433cde85376eca1fca80",
    "refreshToken": "1000.bf48eee7766098d76a45919bef4ec4fc.51c65bb4d6a38b1959fb9c5f7b6294fc"
  }'
```

### 2. Crear una Cuenta de Correo

```bash
curl -X POST http://localhost:1011/api/email/cuentas \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Notificaciones",
    "email": "notificaciones@donath.us",
    "fromAddress": "notificaciones@donath.us"
  }'
```

### 3. Crear una Plantilla

```bash
curl -X POST http://localhost:1011/api/email/plantillas \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Bienvenida",
    "asunto": "Bienvenido {{nombre}}",
    "cuerpo": "<p>Hola {{nombre}}, gracias por registrarte.</p><p>Tu código de verificación es: <strong>{{codigo}}</strong></p>",
    "firma": "Equipo DoNath"
  }'
```

---

## Endpoints API

### Zoho

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/email/zoho` | Ver config de Zoho |
| PUT | `/api/email/zoho` | Actualizar config |

### Cuentas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/email/cuentas` | Listar cuentas |
| GET | `/api/email/cuentas/:id` | Ver cuenta |
| POST | `/api/email/cuentas` | Crear cuenta |
| PUT | `/api/email/cuentas/:id` | Actualizar cuenta |
| DELETE | `/api/email/cuentas/:id` | Eliminar cuenta |

### Plantillas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/email/plantillas` | Listar plantillas |
| GET | `/api/email/plantillas/:id` | Ver plantilla |
| POST | `/api/email/plantillas` | Crear plantilla |
| PUT | `/api/email/plantillas/:id` | Actualizar plantilla |
| DELETE | `/api/email/plantillas/:id` | Eliminar plantilla |

### Envío

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/email/enviar` | Enviar con plantilla |
| POST | `/api/email/enviar-directo` | Enviar directo |

---

## Uso del Envío

### Enviar con Plantilla

```bash
curl -X POST http://localhost:1011/api/email/enviar \
  -H "Content-Type: application/json" \
  -d '{
    "cuentaId": "notificaciones",
    "plantillaId": "bienvenida",
    "to": "cliente@ejemplo.com",
    "variables": {
      "nombre": "Juan Pérez",
      "codigo": "12345"
    }
  }'
```

**Parámetros:**
- `cuentaId` (string, required) - ID de la cuenta creada
- `plantillaId` (string, required) - ID de la plantilla
- `to` (string, required) - Email del destinatario
- `variables` (object, optional) - Variables para reemplazar en la plantilla

### Enviar Directo

```bash
curl -X POST http://localhost:1011/api/email/enviar-directo \
  -H "Content-Type: application/json" \
  -d '{
    "cuentaId": "notificaciones",
    "to": "cliente@ejemplo.com",
    "asunto": "Asunto del email",
    "contenido": "<p>Hola, este es un email directo.</p>"
  }'
```

---

## Estructura de Datos

### Plantilla

```json
{
  "id": "bienvenida-abc123",
  "nombre": "Bienvenida",
  "asunto": "Bienvenido {{nombre}}",
  "cuerpo": "<p>Hola {{nombre}}, tu código es {{codigo}}</p>",
  "firma": "Equipo StellarClass",
  "imagenUrl": "https://tu-dominio.com/logo.png",
  "createdAt": "2025-01-01"
}
```

### Cuenta

```json
{
  "id": "notificaciones",
  "nombre": "Notificaciones",
  "email": "notificaciones@donath.us",
  "fromAddress": "notificaciones@donath.us",
  "activo": true,
  "createdAt": "2025-01-01"
}
```

---

## Variables en Plantillas

Las plantillas soportan variables con la sintaxis `{{nombre}}`:

- `{{nombre}}` - Nombre del destinatario
- `{{apellido}}` - Apellido
- `{{email}}` - Email
- `{{codigo}}` - Código de verificación
- Cualquier otra: `{{variable}}`

---

## Firma Automática

Todas las plantillas incluyen automáticamente la firma "DoNath SpA" al final del email.

---

## Interfaz Web

También puedes gestionar todo desde la interfaz web en:

```
http://localhost:1011/app/email
```

Allí encontrarás:
- Configuración de Zoho
- Gestión de cuentas
- Editor de plantillas con vista previa
- Formulario de envío de prueba