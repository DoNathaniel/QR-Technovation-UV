'use strict';
const path = require('path');
const QRCode = require('qrcode');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Path a la imagen base en la raiz del monorepo
const BASE_QR_PATH = path.join(__dirname, "../media/base-qr-season2.png");
const BASE_MENTOR_QR_PATH = path.join(__dirname, "../../../media/base-qr-equipo.png");

function r2Config() {
  const R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://a09105738e1d4fe8bcbf689176c62491.r2.cloudflarestorage.com';
  const R2_BUCKET = process.env.R2_BUCKET || 'qr-technovation-dev';
  const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || 'https://qr-technovation-cdn.donath.us';
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  const missing = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables de configuración R2: ${missing.join(', ')}`);
  return { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL };
}

function r2Client(config) {
  return new S3Client({
    region: 'auto',
    endpoint: config.R2_ENDPOINT,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  });
}

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
 * Los QR de mentores pertenecen al usuario, no a una temporada.
 */
function buildMentorQRContent(userID) {
  return `users/user_${userID}.png`;
}

/**
 * Sube un buffer PNG a Cloudflare R2 y retorna su URL pública mediante
 * el dominio personalizado del bucket.
 *
 * @param {Buffer} buffer - Buffer de la imagen PNG
 * @param {number} seasonID - ID de la temporada
 * @param {number} studentID - ID del estudiante
 * @returns {Promise<string>} URL publica del archivo en el CDN
 */
async function uploadToR2(buffer, seasonID, studentID) {
  const config = r2Config();
  const key = buildQRContent(seasonID, studentID);
  await r2Client(config).send(new PutObjectCommand({
    Bucket: config.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  const url = `${config.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  console.log(`[R2] Subido: ${key} -> ${url}`);
  return url;
}

/**
 * Genera la imagen QR compuesta (QR sobre base-qr.png) y la sube a R2.
 *
 * @param {number} seasonID - ID de la temporada
 * @param {number} studentID - ID del estudiante
 * @returns {Promise<string>} URL pública del QR en el dominio personalizado
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

  // 3. Subir a R2. El texto codificado no cambia: season_{id}/student_{id}.png
  const cdnUrl = await uploadToR2(composedBuffer, seasonID, studentID);

  console.log(`[QR] Generado y subido a R2: ${content} -> ${cdnUrl}`);
  return cdnUrl;
}

/**
 * Genera el QR permanente de un mentor usando su diseño institucional.
 * El mismo identificador y archivo se conservan entre temporadas.
 *
 * @param {number} userID - ID del usuario mentor
 * @returns {Promise<string>} URL pública del QR en R2
 */
async function generateMentorQR(userID) {
  const content = buildMentorQRContent(userID);
  const baseSize = 1254;
  const qrSize = 900;
  const qrOffset = Math.floor((baseSize - qrSize) / 2);
  const qrBuffer = await QRCode.toBuffer(content, {
    type: 'png',
    width: qrSize,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });

  const composedBuffer = await sharp(BASE_MENTOR_QR_PATH)
    .composite([{ input: qrBuffer, top: qrOffset, left: qrOffset }])
    .png()
    .toBuffer();

  const config = r2Config();
  await r2Client(config).send(new PutObjectCommand({
    Bucket: config.R2_BUCKET,
    Key: content,
    Body: composedBuffer,
    ContentType: 'image/png',
    CacheControl: 'no-cache',
  }));

  const url = `${config.R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${content}`;
  console.log(`[QR] Mentor generado y subido a R2: ${content} -> ${url}`);
  return url;
}

module.exports = {
  generateQR,
  generateMentorQR,
  buildQRContent,
  buildMentorQRContent,
  uploadToR2,
};
