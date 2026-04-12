'use strict';
const axios = require('axios');

const EMAIL_API_URL = process.env.EMAIL_API_URL || 'http://51.222.141.196:1011';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';
const EMAIL_CUENTA_ID = process.env.EMAIL_CUENTA_ID || 'api';

/**
 * Envia un email con el QR del estudiante usando la URL del CDN.
 *
 * @param {string} to - Email del destinatario
 * @param {string} studentName - Nombre completo del estudiante
 * @param {string} qrUrl - URL publica del QR en el CDN
 * @returns {Promise<object>} Respuesta del servicio de email
 */
async function sendQREmail(to, studentName, qrUrl) {
  if (!EMAIL_API_KEY) {
    throw new Error('EMAIL_API_KEY no configurada en .env');
  }

  const contenido = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto; background: #f7f9fb; border-radius: 16px; padding: 32px 24px 18px 24px; box-shadow:0 3px 18px 0 #0001;">
      <div style="display: flex; justify-content: center; align-items: center; gap: 18px; margin-bottom: 22px;">
        <img src="https://cdn.donath.us/cdn/uploads/_UV_QR-TECHNOVATION_/DATA/uv.png" alt="Logo UV" style="height: 55px;">
      </div>
      <h2 style="color: #1a365d; text-align: center; font-weight: 700; letter-spacing:-0.5px; margin: 0 0 20px 0">Technovation Girls Chile</h2>
      <p style="font-size: 17px; color:#1a365d; margin-bottom: 2px;">
        💫 Hola <strong>${studentName}</strong>,
      </p>
      <p style="margin: 0 0 18px 0;">
        Adjuntamos tu <b>código QR personal</b> para el registro de asistencia. <br>
        Preséntalo cada vez que llegues a la Facultad y antes de irte de la misma.
      </p>
      <div style="display: flex; flex-direction: column; align-items: center; margin: 32px 0 16px 0;">
        <div style="box-shadow: 0 6px 26px #20629b19;">
          <img src="${qrUrl}" alt="Código QR" style="width: 300px; height: 300px; border-radius:8px; background:#fff; display:block;" />
        </div>
      </div>
      <p style="color: #566; font-size: 13px; text-align: center; margin-bottom:6px;">
        No compartas este código QR con nadie.<br> Es personal e intransferible.
      </p>
      <hr style="border: none; border-top: 1px solid #dbeafe; margin: 24px 0 10px 0;" />
      <div style="text-align: center;">
        <img src="https://cdn.donath.us/cdn/uploads/_UV_QR-TECHNOVATION_/DATA/escuela-informatica.png" alt="Escuela de Ingeniería Informática" style="height: 105px; margin-top: 8px;">
        <p style="color: #999; font-size: 12px; text-align: center; margin: 6px 0 0 0;">
          Universidad de Valparaíso — Escuela de Ingeniería Informática
        </p>
      </div>
    </div>
  `;

  const response = await axios.post(
    `${EMAIL_API_URL}/api/email/enviar-directo`,
    {
      cuentaId: EMAIL_CUENTA_ID,
      to,
      asunto: '🥳 Tu Codigo QR - Technovation Girls',
      contenido,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': EMAIL_API_KEY,
      },
      timeout: 15000,
    }
  );

  console.log(`[Email] QR enviado a ${to} para estudiante: ${studentName}`);
  return response.data;
}

module.exports = { sendQREmail };
