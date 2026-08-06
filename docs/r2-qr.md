# QR en Cloudflare R2

Los QR nuevos se almacenan en el bucket R2 `qr-technovation-dev` mediante su API S3 y se publican usando `https://qr-technovation-cdn.donath.us`.

Configura en `backend/.env` las variables R2 indicadas en `backend/.env.example`. El dominio personalizado debe estar en estado **Active** antes de enviar QR por correo.

El contenido codificado permanece sin cambios: `season_{seasonID}/student_{studentID}.png`.

Para mover los QR ya existentes, primero ejecuta `npm run migrate:qr:r2:dry` en `backend`, revisa el resultado y luego `npm run migrate:qr:r2`.
