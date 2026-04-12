'use strict';
const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');

// Path a la imagen base en la raiz del monorepo
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const BASE_QR_PATH = path.join(MONOREPO_ROOT, 'base-qr.png');

// CDN
const CDN_UPLOAD_URL = 'https://cdn.donath.us/cdn/upload';
const CDN_BASE_PATH = '_UV_QR-TECHNOVATION_';

// Dimensiones
const BASE_SIZE = 500;   // base-qr.png es 500x500
const QR_SIZE = 400;     // el QR se genera a 400x400
const QR_OFFSET = Math.floor((BASE_SIZE - QR_SIZE) / 2); // 50px centrado

/**
 * Genera el string que se codifica dentro del QR.
 * Formato: season_{seasonID}/student_{studentID}.png
 */
function buildQRContent(seasonID, studentID) {
  return `season_${seasonID}/student_${studentID}.png`;
}

/**
 * Sube un buffer PNG al CDN y retorna la URL publica.
 *
 * @param {Buffer} buffer - Buffer de la imagen PNG
 * @param {number} seasonID - ID de la temporada
 * @param {number} studentID - ID del estudiante
 * @returns {Promise<string>} URL publica del archivo en el CDN
 */
async function uploadToCDN(buffer, seasonID, studentID) {
  const cdnPath = `${CDN_BASE_PATH}/season_${seasonID}`;
  const filename = `student_${studentID}.png`;

  const form = new FormData();
  form.append('file', buffer, {
    filename,
    contentType: 'image/png',
  });

  const response = await axios.post(
    `${CDN_UPLOAD_URL}?path=${cdnPath}`,
    form,
    {
      headers: form.getHeaders(),
      timeout: 30000,
    }
  );

  const url = response.data.url;
  if (!url) {
    throw new Error('El CDN no devolvio una URL en la respuesta');
  }

  console.log(`[CDN] Subido: ${cdnPath}/${filename} -> ${url}`);
  return url;
}

/**
 * Genera la imagen QR compuesta (QR sobre base-qr.png) y la sube al CDN.
 *
 * @param {number} seasonID - ID de la temporada
 * @param {number} studentID - ID del estudiante
 * @returns {Promise<string>} URL publica del QR en el CDN
 */
async function generateQR(seasonID, studentID) {
  const content = buildQRContent(seasonID, studentID);

  // 1. Generar QR como buffer PNG a 400x400
  const qrBuffer = await QRCode.toBuffer(content, {
    type: 'png',
    width: QR_SIZE,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });

  // 2. Componer: base-qr.png + QR centrado
  const composedBuffer = await sharp(BASE_QR_PATH)
    .composite([
      {
        input: qrBuffer,
        top: QR_OFFSET,
        left: QR_OFFSET,
      },
    ])
    .png()
    .toBuffer();

  // 3. Subir al CDN
  const cdnUrl = await uploadToCDN(composedBuffer, seasonID, studentID);

  console.log(`[QR] Generado y subido: ${content} -> ${cdnUrl}`);
  return cdnUrl;
}

module.exports = {
  generateQR,
  buildQRContent,
};
