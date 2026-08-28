'use strict';
const { SendMailClient } = require("zeptomail");

const clientZeptoMail = new SendMailClient({ url: process.env.ZEPTOMAIL_API_URL, token: process.env.ZEPTOMAIL_API_TOKEN });

/**
 * Construye el correo con el QR del estudiante usando la URL del CDN.
 *
 * @param {string} studentName - Nombre completo del estudiante
 * @param {string} qrUrl - URL publica del QR en el CDN
 * @returns {{subject: string, htmlBody: string}} Mensaje listo para encolar
 */
function buildQREmail(studentName, qrUrl) {
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

  return { subject: '🥳 Tu Codigo QR - Technovation Girls', htmlBody: contenido };
}

function buildMentorQREmail(mentorName, qrUrl) {
  const contenido = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto; background: #f7f9fb; border-radius: 16px; padding: 32px 24px 18px; box-shadow:0 3px 18px 0 #0001;">
      <div style="text-align:center; margin-bottom:22px;"><img src="https://cdn.donath.us/cdn/uploads/_UV_QR-TECHNOVATION_/DATA/uv.png" alt="Logo UV" style="height:55px;"></div>
      <h2 style="color:#1a365d; text-align:center; margin:0 0 20px;">Technovation Girls Chile</h2>
      <p style="font-size:17px; color:#1a365d;">Hola <strong>${mentorName}</strong>,</p>
      <p>Adjuntamos tu <b>código QR personal de acceso</b> para registrar tu asistencia. Preséntalo al llegar y al retirarte de la Facultad de Ingeniería.</p>
      <div style="text-align:center; margin:32px 0 16px;"><img src="${qrUrl}" alt="Código QR de acceso" style="width:300px; height:300px; border-radius:8px; background:#fff;"></div>
      <p style="color:#566; font-size:13px; text-align:center;">No compartas este código QR con nadie.<br>Es personal e intransferible.</p>
      <hr style="border:none; border-top:1px solid #dbeafe; margin:24px 0 10px;">
      <div style="text-align:center;"><img src="https://cdn.donath.us/cdn/uploads/_UV_QR-TECHNOVATION_/DATA/escuela-informatica.png" alt="Escuela de Ingeniería Informática" style="height:105px;"><p style="color:#999; font-size:12px; margin:6px 0 0;">Universidad de Valparaíso — Escuela de Ingeniería Informática</p></div>
    </div>`;

  return { subject: '🥳 Tu Código QR de Mentor/a - Technovation Girls', htmlBody: contenido };
}

function buildMentorAttendanceEmail(mentorName, tipo, hora, scannedByName, esFechaPlanificada) {
  const action = tipo === 'entrada' ? 'entrada' : 'salida';
  const actionLabel = tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada';
  const actionColor = tipo === 'entrada' ? '#15803d' : '#c2410c';
  const contenido = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f7f9fb;border-radius:16px;padding:32px 24px 18px;box-shadow:0 3px 18px 0 #0001;">
      <div style="text-align:center;margin-bottom:22px;">
        <img src="https://cdn.donath.us/cdn/uploads/_UV_QR-TECHNOVATION_/DATA/uv.png" alt="Logo UV" style="height:55px;">
      </div>
      <h2 style="color:#1a365d;text-align:center;font-weight:700;letter-spacing:-0.5px;margin:0 0 20px;">Technovation Girls Chile</h2>
      <p style="font-size:17px;color:#1a365d;margin:0 0 12px;">Hola <strong>${mentorName}</strong>,</p>
      <p style="margin:0 0 18px;">Tu asistencia fue registrada correctamente en el sistema.</p>
      <div style="background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:18px 20px;margin:24px 0;box-shadow:0 6px 26px #20629b19;">
        <p style="color:${actionColor};font-size:18px;font-weight:700;text-align:center;margin:0 0 16px;">${actionLabel}</p>
        <p style="color:#1a365d;margin:0 0 10px;"><strong>Hora:</strong> ${hora}</p>
        <p style="color:#1a365d;margin:0;"><strong>Registrada por:</strong> ${scannedByName}</p>
      </div>
      ${!esFechaPlanificada ? '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:13px;padding:10px 12px;margin:0 0 18px;">Aviso: el registro se realizó fuera de una fecha activa planificada.</div>' : ''}
      <p style="color:#566;font-size:13px;text-align:center;margin:0 0 6px;">Este es un aviso automático de asistencia del equipo.</p>
      <hr style="border:none;border-top:1px solid #dbeafe;margin:24px 0 10px;">
      <div style="text-align:center;">
        <img src="https://cdn.donath.us/cdn/uploads/_UV_QR-TECHNOVATION_/DATA/escuela-informatica.png" alt="Escuela de Ingeniería Informática" style="height:105px;margin-top:8px;">
        <p style="color:#999;font-size:12px;margin:6px 0 0;">Universidad de Valparaíso — Escuela de Ingeniería Informática</p>
      </div>
    </div>`;

  return {
    subject: `Asistencia registrada: ${action} · Technovation Girls`,
    htmlBody: contenido,
  };
}

function buildStudentAttendanceEmail(studentName, tipo, fecha, hora, unsubscribeUrl) {
  const safeName = String(studentName || '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
  const [year, month, day] = String(fecha || '').split('-');
  const displayDate = year && month && day ? `${day}/${month}/${year}` : String(fecha || '');
  const displayTime = String(hora || '').slice(0, 5);
  const isEntry = tipo === 'entrada';
  const action = isEntry ? 'llegada' : 'salida';
  const actionLabel = isEntry ? 'Llegada registrada' : 'Salida registrada';
  const actionColor = isEntry ? '#15803d' : '#c2410c';
  const unsubscribeSection = unsubscribeUrl
    ? `<p style="color:#899;font-size:11px;text-align:center;line-height:1.45;margin:16px 0 0;">Si no deseas recibir más notificaciones de asistencia, <a href="${unsubscribeUrl}" style="color:#566;">puedes desuscribirte aquí</a>.</p>`
    : '';
  const contenido = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f7f9fb;border-radius:16px;padding:32px 24px 18px;box-shadow:0 3px 18px 0 #0001;">
      <div style="text-align:center;margin-bottom:22px;"><img src="https://cdn.donath.us/cdn/uploads/_UV_QR-TECHNOVATION_/DATA/uv.png" alt="Logo UV" style="height:55px;"></div>
      <h2 style="color:#1a365d;text-align:center;font-weight:700;letter-spacing:-0.5px;margin:0 0 20px;">Technovation Girls Chile</h2>
      <p style="font-size:17px;color:#1a365d;margin:0 0 12px;">Hola <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 18px;">Tu ${action} fue registrada correctamente.</p>
      <div style="background:#fff;border:1px solid #dbeafe;border-radius:12px;padding:18px 20px;margin:24px 0;box-shadow:0 6px 26px #20629b19;">
        <p style="color:${actionColor};font-size:18px;font-weight:700;text-align:center;margin:0 0 16px;">${actionLabel}</p>
        <p style="color:#1a365d;margin:0 0 10px;"><strong>Fecha:</strong> ${displayDate}</p>
        <p style="color:#1a365d;margin:0;"><strong>Hora:</strong> ${displayTime}</p>
      </div>
      <p style="color:#566;font-size:13px;text-align:center;margin:0 0 6px;">Este es un aviso automático de asistencia.</p>
      ${unsubscribeSection}
      <hr style="border:none;border-top:1px solid #dbeafe;margin:24px 0 10px;">
      <div style="text-align:center;"><img src="https://cdn.donath.us/cdn/uploads/_UV_QR-TECHNOVATION_/DATA/escuela-informatica.png" alt="Escuela de Ingeniería Informática" style="height:105px;margin-top:8px;"><p style="color:#999;font-size:12px;margin:6px 0 0;">Universidad de Valparaíso — Escuela de Ingeniería Informática</p></div>
    </div>`;
  return { subject: `${actionLabel} · Technovation Girls`, htmlBody: contenido };
}

function buildStudentArrivalEmail(studentName, fecha, hora, unsubscribeUrl) {
  return buildStudentAttendanceEmail(studentName, 'entrada', fecha, hora, unsubscribeUrl);
}

async function deliverEmail({ to, subject, htmlBody }) {
  if (!process.env.ZEPTOMAIL_API_TOKEN) {
    throw new Error('ZEPTOMAIL_API_TOKEN no configurada en .env');
  }
  const response = await clientZeptoMail.sendMail({
    from: { address: process.env.ZEPTOMAIL_FROM_EMAIL, name: process.env.ZEPTOMAIL_FROM_NAME },
    to: [{ email_address: { address: to } }],
    subject,
    htmlbody: htmlBody,
  });
  return response.data;
}

module.exports = { buildQREmail, buildMentorQREmail, buildMentorAttendanceEmail, buildStudentAttendanceEmail, buildStudentArrivalEmail, deliverEmail };
