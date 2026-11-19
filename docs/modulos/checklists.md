# Checklists de equipos

## Descripción

Asocia un archivo de checklist de Google Drive o Google Sheets a cada equipo. Administración puede vincular, reemplazar o desvincular el enlace y solicitar una lectura manual. Mentores ven el resumen de los equipos que tienen asignados.

La estructura de ítems se comparte entre categorías. Se guarda solamente el estado por ítem, sección y equipo, el porcentaje y las horas de intento y última lectura exitosa. No se guardan respuestas de la planilla. Para los campos sensibles, el lector calcula únicamente si están vacíos u ocupados.

Los códigos de la columna A, como `2.1`, identifican ítems; no son fechas.

El ítem `2.2` se considera completo cuando al menos una fila tiene el nombre y el correo personal de un integrante. No es necesario completar las filas de todos los integrantes ni la clave de plataforma internacional. El lector solo registra la presencia de esos dos campos; no guarda sus valores.

Los errores de lectura se guardan como estado y no borran el último resumen exitoso. Una planilla inaccesible o con un formato desconocido no se interpreta como una entrega vacía.

## Avance hasta la fecha

La vista de administración y la de mentores muestran el avance total y el avance exigible hasta la fecha actual de la temporada. En **Fechas de Asistencia**, cada fecha permite elegir individualmente el punto del checklist exigible al cierre de esa clase. Si se deja en automático, se usa el orden de fechas (la cuarta fecha corresponde al punto 3). Solo se cuentan los puntos hasta ese límite; los ítems opcionales y «No aplica» se excluyen, igual que en el avance total. Antes de la primera fecha o cuando aún no hay puntos exigibles, se muestra «—» en lugar de un porcentaje engañoso.

## Archivos clave

| Capa | Archivo |
|------|---------|
| Ruta backend | `backend/src/routes/teamChecklists.js` |
| Controlador | `backend/src/controllers/teamChecklistController.js` |
| Lector de Drive y parser | `backend/src/services/teamChecklistService.js` |
| Entidad y tabla | `backend/src/entities/TeamChecklist.js` (`team_checklists`) |
| Página frontend | `frontend/src/pages/ChecklistsPage.tsx` |
| Cola de revisiones | `backend/src/services/teamChecklistRunService.js` |
| Ejecución y detalles | `backend/src/entities/TeamChecklistRun.js`, `backend/src/entities/TeamChecklistRunItem.js` |

## Rutas

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/checklists?seasonID=:id` | Autenticado | Listar resúmenes. Admin ve todos los equipos de la temporada; voluntario solo los equipos donde tiene asignación de mentor. |
| PUT | `/api/checklists/:teamID` | Admin o superadmin | Vincular o reemplazar el enlace (`{ "url": "..." }`). |
| DELETE | `/api/checklists/:teamID` | Admin o superadmin | Desvincular y eliminar el resultado asociado. |
| POST | `/api/checklists/:teamID/refresh` | Admin o superadmin | Leer la planilla ahora y guardar el resumen. |
| POST | `/api/checklists/:teamID/send-status` | Admin o superadmin | Encolar el estado revisado del equipo para sus mentores asignados. |
| POST | `/api/checklists/verify-all` | Admin o superadmin | Crear una revisión manual para todos los enlaces de la temporada (`{ "seasonID": 1 }`). No encola correos. |
| GET | `/api/checklists/runs/overview?seasonID=:id` | Admin o superadmin | Consultar última revisión masiva y próxima revisión automática. |
| GET | `/api/checklists/runs/active?seasonID=:id` | Admin o superadmin | Consultar la revisión en curso de la temporada. |
| GET | `/api/checklists/runs/:runID` | Admin o superadmin | Consultar avance, cambios detectados e intentos de la revisión. |

## Revisión programada y avisos

El worker revisa las fechas de temporada usando la zona horaria `America/Santiago`. Desde las 19:00 del día anterior a la próxima fecha de temporada, inicia una ejecución automática para todos los checklists vinculados de esa temporada. Cada planilla se reintenta hasta tres veces si la lectura falla; los errores finales quedan visibles para administración.

Al terminar una ejecución automática, se encola un aviso por equipo para cada mentor voluntario asignado. El aviso incluye el avance actual y cambios de estado, o informa que la revisión falló sin presentar el último porcentaje guardado como actual. La cola usa una clave única por ejecución, equipo y mentor para evitar duplicados. Las ejecuciones manuales no encolan avisos.

## Lectura desde Google Drive

Cada archivo debe estar compartido como **Cualquier persona con el enlace: lector**. No se necesita una cuenta de servicio ni credenciales de Google en el backend.

El lector intenta exportar el enlace como hoja nativa de Google Sheets y luego intenta la descarga pública de Drive, que cubre archivos Excel. El buffer se procesa en memoria y no se escribe a disco. Se aceptan archivos de hasta 12 MB.

La hoja debe contener las filas del formato de checklist reconocido. Las celdas se evalúan solo por presencia; no se comparan ni se almacenan sus valores. El lector reconoce campos bilingües únicamente cuando ambos campos contienen texto después de sus rótulos de idioma. Los requisitos condicionales vacíos se muestran como «No aplica» y se excluyen del total; Vimeo se muestra como opcional y también se excluye.

Si el enlace no permite lectura pública o el formato no coincide, la revisión falla con un mensaje visible y se conserva el resultado anterior.

## Navegación

- Mentores: tarjeta **Mi checklist** y ruta `/mi-checklist`. Solo muestra los equipos asignados al mentor.
- Admin y superadmin: tarjeta **Checklists de equipos** y ruta `/administracion/checklists`. Permite gestionar enlaces y actualizar la lectura.
- Las dos áreas presentan el mismo resumen, pero tienen navegación y controles separados. Los permisos de escritura se autorizan también en el backend.
