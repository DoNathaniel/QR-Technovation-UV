'use strict';
const { SendMailClient } = require("zeptomail");

const clientZeptoMail = new SendMailClient({ url: process.env.ZEPTOMAIL_API_URL, token: process.env.ZEPTOMAIL_API_TOKEN });

/**
 * Envia un email con el QR del estudiante usando la URL del CDN.
 *
 * @param {string} to - Email del destinatario
 * @param {string} studentName - Nombre completo del estudiante
 * @param {string} qrUrl - URL publica del QR en el CDN
 * @returns {Promise<object>} Respuesta del servicio de email
 */
async function sendQREmail(to, studentName, qrUrl) {
  if (!process.env.ZEPTOMAIL_API_TOKEN) {
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
        Preséntalo cada vez que llegues a la Facultad de Ingeniería y antes de irte de la misma.
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

  const response = await clientZeptoMail.sendMail({
    from: {
      address: process.env.ZEPTOMAIL_FROM_EMAIL,
      name: process.env.ZEPTOMAIL_FROM_NAME
    },
    to: [
      {
        email_address: {
          address: to
        }
      }
    ],
    subject: '🥳 Tu Codigo QR - Technovation Girls',
    htmlbody: contenido
  })

  console.log(`[Email] QR enviado a ${to} para estudiante: ${studentName}`);
  return response.data;
}

module.exports = { sendQREmail };
