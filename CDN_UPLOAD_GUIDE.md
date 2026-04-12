# Guía Rápida — Cómo Subir Archivos al CDN (cdn.donath.us)

Esta guía te enseña cómo subir cualquier archivo al CDN de Donath (`cdn.donath.us`) y obtener su URL pública, usando JavaScript (por ejemplo, en un proyecto React, Next.js, Vue o vanilla JS).

---

## Flujo Básico
1. Elige el archivo a subir (ej: con `<input type="file">`).
2. Sube el archivo haciendo un POST con `FormData` al endpoint de upload del CDN:
   - `https://cdn.donath.us/cdn/upload?path=TU/RUTA/PERSONALIZADA`
3. El CDN responde con un JSON que contiene la URL pública del archivo.
4. Usa esa URL donde la necesites (mostrar imágenes, documentos, enlaces, etc).

---

## Ejemplo de Código

```js
// 1. Selecciona tu archivo desde el input
elementoInput.addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;

  // 2. Prepara el FormData
  const formData = new FormData();
  formData.append('file', archivo);

  // 3. Realiza la petición POST al CDN con el path adecuado
  // Cambia el path por el que desees organizar (opcional)
  const response = await fetch('https://cdn.donath.us/cdn/upload?path=EJEMPLO/ARCHIVOS', {
    method: 'POST',
    body: formData,
  });

  // 4. Obtiene la URL pública
  const data = await response.json();
  const urlPublica = data.url; // <- ¡Listo!
  console.log('Archivo subido, URL:', urlPublica);
});
```

---

- **El parámetro `path` en la URL:**
  - Sirve para organizar tus archivos dentro del CDN.
  - Puedes poner cualquier ruta, como `MIS-PDFS/FACTURAS` o `IMAGENES/AVATARES`.
- **El archivo debe enviarse con el key `file` en el FormData.**
- **El campo resultante es siempre `url`** en la respuesta JSON.

---

## Checklist Súper Rápido
- [ ] Haz un POST a `https://cdn.donath.us/cdn/upload?path=MIDIRECTORIO` (usa FormData, key: `file`).
- [ ] Extrae `result.url` del JSON de respuesta.
- [ ] Usa la URL a gusto (mostrar, guardar, compartir...)

---

**¡Eso es todo! Puedes reutilizar este patrón en cualquier aplicación web que permita JavaScript, y tendrás tu archivo cargado y servido desde el CDN.**

---

¿Preguntas? Solo repite este flujo cambiando el `path` si deseas organizar los archivos de otra manera.
