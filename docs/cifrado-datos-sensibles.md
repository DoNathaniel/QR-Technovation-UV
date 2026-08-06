# Cifrado de RUT y correos

El backend cifra RUT y correo con AES-256-GCM y guarda un índice HMAC-SHA-256 para búsquedas. Las claves sólo se configuran en el servidor mediante `SENSITIVE_DATA_ENCRYPTION_KEY` y, opcionalmente, `SENSITIVE_DATA_HMAC_KEY`, ambas Base64 de 32 bytes.

1. Respaldar la base de datos.
2. Configurar las claves en `backend/.env` usando `backend/.env.example` como referencia.
3. Desplegar esta versión y comprobar creación, edición, login y reenvío de QR.
4. Como superadmin, abrir **Cifrado de datos** y ejecutar primero la simulación. Luego ejecutar los lotes hasta que no queden pendientes.

No se puede recuperar la información si se pierde la clave de cifrado. Guárdala en un gestor de secretos y no la rote ni elimine hasta completar una migración explícita de claves.
