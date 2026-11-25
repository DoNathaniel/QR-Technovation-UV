'use strict';

const XLSX = require('xlsx');

const MAX_WORKBOOK_BYTES = 12 * 1024 * 1024;

const itemDefinitions = [
  { code: '1.1', section: '1', sectionLabel: 'Carpeta del equipo', label: 'Enlace a carpeta del equipo', cells: ['D10'], required: true },
  { code: '2.1', section: '2', sectionLabel: 'Datos del equipo', label: 'Sede', cells: ['D12'], required: true },
  { code: '2.2', section: '2', sectionLabel: 'Datos del equipo', label: 'Nombre y correo de al menos un integrante', cells: ['B14', 'D14', 'B15', 'D15', 'B16', 'D16', 'B17', 'D17', 'B18', 'D18'], required: true, roster: true },
  { code: '2.3', section: '2', sectionLabel: 'Datos del equipo', label: 'Profesor/a y correo personal', cells: ['B20', 'D20', 'B21', 'D21', 'B22', 'D22'], required: true, teacher: true },
  { code: '3.1', section: '3', sectionLabel: 'Correo y clave del equipo', label: 'Correo del equipo', cells: ['D24'], required: true, sensitive: true },
  { code: '3.2', section: '3', sectionLabel: 'Correo y clave del equipo', label: 'Clave del correo', cells: ['D25'], required: true, sensitive: true, password: true },
  { code: '3.3', section: '3', sectionLabel: 'Correo y clave del equipo', label: 'Verificación de la cuenta y titular', cells: ['D26'], required: true, sensitive: true },
  { code: '3.4', section: '3', sectionLabel: 'Correo y clave del equipo', label: 'Captura del código QR', cells: ['D27'], required: true, sensitive: true, imageCell: 'D27' },
  { code: '3.5', section: '3', sectionLabel: 'Correo y clave del equipo', label: 'Correo de recuperación', cells: ['D28'], required: true, sensitive: true },
  { code: '4.1', section: '4', sectionLabel: 'Datos del proyecto', label: 'Nombre de la aplicación', cells: ['D30'], required: true },
  { code: '4.2', section: '4', sectionLabel: 'Datos del proyecto', label: 'ODS relacionado', cells: ['D31'], required: true },
  { code: '5.1', section: '5', sectionLabel: 'Descripción del proyecto', label: 'Descripción de la aplicación', cells: ['D34', 'E34'], required: true, bilingual: true },
  { code: '5.2', section: '5', sectionLabel: 'Descripción del proyecto', label: 'Ética en el desarrollo', cells: ['D35', 'E35'], required: true, bilingual: true },
  { code: '6.1', section: '6', sectionLabel: 'Información adicional del proyecto', label: 'Uso de inteligencia artificial', cells: ['D37', 'E37'], required: true, bilingual: true, conditional: true },
  { code: '6.2', section: '6', sectionLabel: 'Información adicional del proyecto', label: 'Aporte frente al cambio climático', cells: ['D38', 'E38'], required: true, bilingual: true, conditional: true },
  { code: '6.3', section: '6', sectionLabel: 'Información adicional del proyecto', label: 'Aporte a la educación', cells: ['D39', 'E39'], required: true, bilingual: true, conditional: true },
  { code: '6.4', section: '6', sectionLabel: 'Información adicional del proyecto', label: 'Bienestar y conexiones reales', cells: ['D40', 'E40'], required: true, bilingual: true },
  { code: '7.1', section: '7', sectionLabel: 'Documento de trabajo', label: 'Documento de trabajo', cells: ['D42'], required: true },
  { code: '7.2', section: '7', sectionLabel: 'Documento de trabajo', label: 'PDF en inglés', cells: ['D43'], required: true },
  { code: '8.1', section: '8', sectionLabel: 'App Inventor', label: 'Nombre del proyecto en App Inventor', cells: ['D45'], required: true },
  { code: '8.2', section: '8', sectionLabel: 'App Inventor', label: 'Archivo de la aplicación (.aia)', cells: ['D46'], required: true },
  { code: '8.3', section: '8', sectionLabel: 'App Inventor', label: 'Clave de la cuenta de App Inventor', cells: ['D47'], required: true, sensitive: true, password: true },
  { code: '9.1', section: '9', sectionLabel: 'Video', label: 'Guion del video', cells: ['D49'], required: true },
  { code: '9.2', section: '9', sectionLabel: 'Video', label: 'Archivo de video', cells: ['D50'], required: true },
  { code: '9.3', section: '9', sectionLabel: 'Video', label: 'Video pitch en YouTube', cells: ['D51'], required: true },
  { code: '9.4', section: '9', sectionLabel: 'Video', label: 'Video pitch en Vimeo', cells: ['D52'], required: false },
  { code: '10.1', section: '10', sectionLabel: 'Presentación pitch presencial', label: 'Presentación editable del pitch', cells: ['D54'], required: true },
  { code: '11.1', section: '11', sectionLabel: 'Camino de aprendizaje', label: 'Camino de aprendizaje', cells: ['D56', 'E56'], required: true, bilingual: true },
  { code: '11.2', section: '11', sectionLabel: 'Camino de aprendizaje', label: 'Legitimidad de la información', cells: ['D57', 'E57'], required: true, bilingual: true },
  { code: '11.3', section: '11', sectionLabel: 'Camino de aprendizaje', label: 'Bibliografía y herramientas utilizadas', cells: ['D58', 'E58'], required: true, bilingual: true },
  { code: '11.4', section: '11', sectionLabel: 'Camino de aprendizaje', label: 'Carpeta de imágenes', cells: ['D60'], required: true },
  { code: '11.5', section: '11', sectionLabel: 'Camino de aprendizaje', label: 'Foto del equipo', cells: ['D61'], required: true },
];
const MAX_CHECKLIST_SECTION = Math.max(...itemDefinitions.map((definition) => Number(definition.section)));

function normalizeText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().replace(/^(español|spanish|inglés|ingles|english)\s*:\s*/i, '').trim();
}

function cellHasContent(sheet, reference) {
  const cell = sheet?.[reference];
  if (!cell) return false;
  const value = cell.v !== undefined && cell.v !== null ? String(cell.v) : '';
  return Boolean(normalizeText(value) || cell.l?.Target || cell.f);
}

function imageExistsAt(workbook, reference) {
  const match = /^([A-Z]+)(\d+)$/.exec(reference);
  if (!match) return false;
  let col = 0;
  for (const char of match[1]) col = col * 26 + char.charCodeAt(0) - 64;
  const row0 = Number(match[2]) - 1;
  const col0 = col - 1;
  for (const path of workbook.keys || []) {
    if (!/^xl\/drawings\/drawing\d+\.xml$/.test(path)) continue;
    const xml = workbook.files?.[path]?.content?.toString('utf8') || '';
    const anchors = xml.match(/<(?:xdr:)?(?:oneCellAnchor|twoCellAnchor)\b[\s\S]*?<\/(?:xdr:)?(?:oneCellAnchor|twoCellAnchor)>/g) || [];
    if (anchors.some((anchor) => {
      const from = /<(?:xdr:)?from>[\s\S]*?<(?:xdr:)?col>(\d+)<\/(?:xdr:)?col>[\s\S]*?<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>[\s\S]*?<\/(?:xdr:)?from>/.exec(anchor);
      return /<(?:xdr:)?pic\b/.test(anchor) && from && Number(from[1]) === col0 && Number(from[2]) === row0;
    })) return true;
  }
  return false;
}

function detectSheet(workbook) {
  for (const name of workbook.SheetNames || []) {
    const sheet = workbook.Sheets[name];
    const projectName = normalizeText(sheet?.B30?.v).toLowerCase();
    const teamEmail = normalizeText(sheet?.B24?.v).toLowerCase();
    const documentLink = normalizeText(sheet?.B42?.v).toLowerCase();
    if (projectName.includes('nombre') && projectName.includes('proyecto') && teamEmail.includes('correo') && documentLink.includes('documento')) {
      return sheet;
    }
  }
  throw new Error('La planilla no coincide con el formato de checklist reconocido.');
}

function itemFilled(sheet, definition, workbook) {
  if (definition.imageCell && imageExistsAt(workbook, definition.imageCell)) return true;
  if (definition.roster) {
    return [14, 15, 16, 17, 18].some((row) =>
      cellHasContent(sheet, `B${row}`) && cellHasContent(sheet, `D${row}`)
    );
  }
  if (definition.teacher) {
    return [20, 21, 22].some((row) => cellHasContent(sheet, `B${row}`) && cellHasContent(sheet, `D${row}`));
  }
  return definition.cells.every((reference) => cellHasContent(sheet, reference));
}

function cellText(sheet, reference) {
  const cell = sheet?.[reference];
  if (!cell) return '';
  const value = normalizeText(cell.v);
  if (value) return value;
  return typeof cell.l?.Target === 'string' ? cell.l.Target.trim() : '';
}

function itemValues(sheet, definition, workbook) {
  if (definition.imageCell) return imageExistsAt(workbook, definition.imageCell) ? [{ label: 'Adjunto', value: 'Imagen adjunta' }] : [];
  if (definition.roster) {
    return [14, 15, 16, 17, 18].map((row) => {
      const name = cellText(sheet, `B${row}`);
      const email = cellText(sheet, `D${row}`);
      const platformPassword = cellText(sheet, `E${row}`);
      return [
        name && { label: 'Nombre', value: name },
        email && { label: 'Correo', value: email },
        platformPassword && { label: 'Clave plataforma internacional', value: platformPassword, password: true },
      ].filter(Boolean);
    }).flat();
  }
  if (definition.teacher) {
    return [20, 21, 22].map((row) => {
      const name = cellText(sheet, `B${row}`);
      const email = cellText(sheet, `D${row}`);
      return [
        name && { label: 'Profesor/a', value: name },
        email && { label: 'Correo', value: email },
      ].filter(Boolean);
    }).flat();
  }
  return definition.cells.map((reference, index) => {
    const value = cellText(sheet, reference);
    if (!value) return null;
    const label = definition.bilingual ? (index === 0 ? 'Español' : 'Inglés') : 'Valor';
    return { label, value, ...(definition.password ? { password: true } : {}) };
  }).filter(Boolean);
}

function summarizeChecklist(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', bookFiles: true, cellDates: false });
  } catch {
    throw new Error('No se pudo abrir la planilla Excel.');
  }
  const sheet = detectSheet(workbook);
  const values = {};
  const items = itemDefinitions.map((definition) => {
    const filled = itemFilled(sheet, definition, workbook);
    values[definition.code] = itemValues(sheet, definition, workbook);
    let status = 'pending';
    if (!definition.required) status = 'optional';
    else if (definition.conditional && !filled) status = 'not_applicable';
    else if (filled) status = 'complete';
    return {
      code: definition.code,
      section: definition.section,
      sectionLabel: definition.sectionLabel,
      label: definition.label,
      status,
      filled,
    };
  });
  const applicableItems = items.filter((item) => item.status !== 'optional' && item.status !== 'not_applicable');
  const completedCount = applicableItems.filter((item) => item.status === 'complete').length;
  const applicableCount = applicableItems.length;
  const percent = applicableCount ? Math.round((completedCount / applicableCount) * 100) : 100;
  const sections = [...new Map(items.map((item) => [item.section, { code: item.section, label: item.sectionLabel }])).values()]
    .map((section) => {
      const sectionItems = items.filter((item) => item.section === section.code);
      const applicable = sectionItems.filter((item) => item.status !== 'optional' && item.status !== 'not_applicable');
      const completed = applicable.filter((item) => item.status === 'complete').length;
      return {
        ...section,
        completedCount: completed,
        applicableCount: applicable.length,
        percent: applicable.length ? Math.round((completed / applicable.length) * 100) : null,
        items: sectionItems,
      };
    });
  return { items, sections, values, completedCount, applicableCount, percent };
}

function extractDriveFileId(fileUrl) {
  let parsed;
  try { parsed = new URL(fileUrl); } catch { throw new Error('Ingresa un enlace válido de Google Drive o Google Sheets.'); }
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(host)) {
    throw new Error('El enlace debe pertenecer a Google Drive o Google Sheets.');
  }
  const patterns = [
    /\/file\/d\/([\w-]+)/,
    /\/spreadsheets\/d\/([\w-]+)/,
    /\/document\/d\/([\w-]+)/,
  ];
  const match = patterns.map((pattern) => pattern.exec(parsed.pathname)).find(Boolean);
  const id = match?.[1] || parsed.searchParams.get('id');
  if (!id || !/^[\w-]{10,}$/.test(id)) throw new Error('No se encontró un identificador de archivo válido en el enlace.');
  return id;
}

async function readLimitedResponse(response) {
  if (!response.body) throw new Error('La descarga de Drive no devolvió contenido.');
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_WORKBOOK_BYTES) {
      await reader.cancel();
      throw new Error('La planilla supera el tamaño máximo permitido para la revisión.');
    }
    chunks.push(Buffer.from(value));
  }
  if (!totalBytes) throw new Error('La planilla está vacía.');
  return Buffer.concat(chunks, totalBytes);
}

async function readPublicChecklist(fileId) {
  const encodedId = encodeURIComponent(fileId);
  const candidateUrls = [
    `https://docs.google.com/spreadsheets/d/${encodedId}/export?format=xlsx`,
    `https://drive.google.com/uc?export=download&id=${encodedId}`,
  ];
  let lastReadError = null;
  for (const url of candidateUrls) {
    let response;
    try { response = await fetch(url, { redirect: 'follow' }); } catch {
      lastReadError = new Error('No se pudo conectar con el archivo público de Google Drive.');
      continue;
    }
    if (!response.ok) {
      lastReadError = new Error('Google Drive no permitió leer el archivo. Confirma que cualquier persona con el enlace pueda verlo.');
      continue;
    }
    try {
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_WORKBOOK_BYTES) throw new Error('La planilla supera el tamaño máximo permitido para la revisión.');
      const buffer = await readLimitedResponse(response);
      return summarizeChecklist(buffer);
    } catch (error) {
      lastReadError = error;
    }
  }
  if (lastReadError?.message.includes('tamaño máximo')) throw lastReadError;
  throw new Error('No se pudo leer una planilla compatible desde el enlace público.');
}

async function readChecklist(fileUrl) {
  const fileId = extractDriveFileId(fileUrl);
  return readPublicChecklist(fileId);
}

module.exports = {
  extractDriveFileId,
  readChecklist,
  summarizeChecklist,
  MAX_CHECKLIST_SECTION,
};
