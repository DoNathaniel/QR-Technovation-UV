# Entrada propia por ubicación

En **Mi asistencia** los usuarios voluntario y admin pueden registrar su entrada de hoy. El QR sigue disponible, con su flujo habitual de entrada/salida.

## Configuración del backend

Definir `MENTOR_CHECKIN_LATITUDE`, `MENTOR_CHECKIN_LONGITUDE`, `MENTOR_CHECKIN_RADIUS_METERS` y `MENTOR_CHECKIN_MAX_ACCURACY_METERS`. Las coordenadas deben corresponder a la sede real. Los valores de ejemplo de radio y precisión son 150 y 50 metros; deben verificarse en terreno. Sin configuración válida el botón permanece deshabilitado. El frontend requiere HTTPS y permiso de ubicación.

La entidad MentorAttendance añade `metodo` (qr/ubicacion, por defecto qr para registros existentes). Este proyecto usa TypeORM synchronize; revisar y respaldar el esquema antes del despliegue.

## API y reglas

- GET `/api/mentor-attendance/mine/status?seasonID=…`: fecha de Chile, estado de entrada y configuración.
- POST `/api/mentor-attendance/mine/entry`: `{ seasonID, position: { latitude, longitude, accuracy, timestamp } }`.
- La identidad viene del token. Requiere rol permitido, acceso a temporada y temporada activa. Se conserva la posibilidad actual de marcar fuera de una fecha planificada, identificándolo en el registro.
- Solo entrada, sin fecha/hora proporcionada por el usuario. Una entrada previa, por QR o ubicación, impide el autorregistro (409).
- Una transacción bloquea la fila del mentor; el escaneo QR comparte ese bloqueo. Las solicitudes simultáneas de autorregistro no crean duplicados. El QR conserva la alternancia entrada/salida.
- La posición debe ser reciente (60 segundos, con tolerancia de 10 segundos al futuro), precisa y su distancia más incertidumbre debe quedar dentro del radio. No se almacenan coordenadas ni hay seguimiento continuo.
- La pantalla consulta estado al abrir, al recuperar foco y cada 30 segundos para reflejar escaneos QR y cambios de día. El servidor siempre vuelve a verificar.
- Se conserva el aviso por correo. Un fallo al encolarlo no invalida la asistencia.

La ubicación proporcionada por el dispositivo puede ser manipulada; este control no constituye prueba infalible de presencia.

## Comprobación en terreno

Probar dentro y fuera de la sede en HTTPS, permiso denegado, señal imprecisa, doble pulsación, recarga, entrada previa por QR y salida posterior por QR. Confirmar coordenadas/radio antes de habilitar.
