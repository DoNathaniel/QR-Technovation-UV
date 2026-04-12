# Envío de Emails - DoN Project

## Descripción

El sistema permite enviar emails de dos formas:
1. **Con Plantilla**: Usa una plantilla predefinida y reemplaza las variables
2. **Directo**: Envía un email con contenido HTML fijo (sin plantilla)

Ambas opciones añaden automáticamente la firma "DoNath SpA" al final del email.

---

## Autenticación

Para usar los endpoints de envío desde un proyecto externo, se requiere una **API Key** que debe enviarse en el header de la request.

```
X-API-Key: don_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

La API Key se crea desde la interfaz web en `/app/email` → pestaña "API Keys".

---

## Endpoints

### 1. Enviar con Plantilla

Usa una plantilla y sustituye las variables definidas en ella.

```
POST /api/email/enviar

Header: X-API-Key: don_sk_xxxxxxxxxxxxx
```

**Parámetros:**
- `cuentaId` (string) - ID de la cuenta de correo a usar
- `plantillaId` (string) - ID de la plantilla
- `to` (string) - Email del destinatario
- `variables` (object) - Variables para reemplazar en la plantilla

**Ejemplo:**

```javascript
// Axios
await axios.post("http://TU_VPS:1011/api/email/enviar", {
  cuentaId: "api",
  plantillaId: "bienvenida",
  to: "cliente@ejemplo.com",
  variables: {
    nombre: "Juan",
    codigo: "12345"
  }
}, {
  headers: { "X-API-Key": "don_sk_xxxxxxxxxxxxx" }
});

// Fetch
fetch("http://TU_VPS:1011/api/email/enviar", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "don_sk_xxxxxxxxxxxxx"
  },
  body: JSON.stringify({
    cuentaId: "api",
    plantillaId: "bienvenida",
    to: "cliente@ejemplo.com",
    variables: { nombre: "Juan", codigo: "12345" }
  })
});
```

---

### 2. Enviar Directo

Envía un email sin usar plantillas, con contenido HTML fijo.

```
POST /api/email/enviar-directo

Header: X-API-Key: don_sk_xxxxxxxxxxxxx
```

**Parámetros:**
- `cuentaId` (string) - ID de la cuenta de correo a usar
- `to` (string) - Email del destinatario
- `asunto` (string) - Asunto del email
- `contenido` (string) - Contenido HTML del email

**Ejemplo:**

```javascript
// Axios
await axios.post("http://TU_VPS:1011/api/email/enviar-directo", {
  cuentaId: "api",
  to: "cliente@ejemplo.com",
  asunto: "Confirmación de registro",
  contenido: "<p>Hola, gracias por registrarte.</p>"
}, {
  headers: { "X-API-Key": "don_sk_xxxxxxxxxxxxx" }
});

// Fetch
fetch("http://TU_VPS:1011/api/email/enviar-directo", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "don_sk_xxxxxxxxxxxxx"
  },
  body: JSON.stringify({
    cuentaId: "api",
    to: "cliente@ejemplo.com",
    asunto: "Confirmación de registro",
    contenido: "<p>Hola, gracias por registrarte.</p>"
  })
});
```

---

## Notas

- Las plantillas usan variables con la sintaxis `{{nombreVariable}}`
- La firma "DoNath SpA" se añade automáticamente al final de todo email
- La cuenta debe estar activa (`activo: true`) para poder enviar
- En caso de error, la respuesta incluye `duration` con el tiempo de ejecución en milisegundos