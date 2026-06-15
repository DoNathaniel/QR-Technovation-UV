const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const outputFile = path.resolve(__dirname, '..', '..', 'informe_produccion_prod.html');
const rawDbName = process.env.DB_NAME || 'uv_qr-technovation_prod';
const productionDbName = rawDbName.replace(/([_-])dev$/i, '$1prod');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateLong(value) {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function badgeForRole(role) {
  if (role === 'superadmin') return 'badge-superadmin';
  if (role === 'admin') return 'badge-admin';
  return 'badge-voluntario';
}

function badgeForCategory(category) {
  if (category === 'Beginner') return 'badge-beginner';
  if (category === 'Junior') return 'badge-junior';
  return 'badge-senior';
}

function badgeForRetired(retired) {
  return retired ? 'badge-retired' : 'badge-active';
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: productionDbName,
    timezone: 'Z',
    dateStrings: true,
    connectTimeout: 15000,
  });

  try {
    const [users] = await connection.query(
      `SELECT ID, nombre, apellido, email, rol, createdAt
       FROM users
       ORDER BY ID ASC`
    );

    const [seasons] = await connection.query(
      `SELECT ID, nombre, fechaInicio, fechaFin, activa, createdAt
       FROM seasons
       ORDER BY activa DESC, fechaInicio DESC, ID DESC`
    );

    const season = seasons[0] || null;
    if (!season) {
      throw new Error('No se encontraron temporadas en la base de datos.');
    }

    const [seasonDates] = await connection.query(
      `SELECT ID, fecha, activa
       FROM season_dates
       WHERE seasonID = ?
       ORDER BY fecha ASC`,
      [season.ID]
    );

    const [teams] = await connection.query(
      `SELECT ID, nombre, numeroCorrelativo, ods, categoria, createdAt
       FROM teams
       WHERE seasonID = ?
       ORDER BY categoria ASC, numeroCorrelativo ASC`,
      [season.ID]
    );

    const [teamMentors] = await connection.query(
      `SELECT teamID, COUNT(*) AS mentorCount
       FROM team_mentors
       WHERE seasonID = ?
       GROUP BY teamID`,
      [season.ID]
    );

    const [teamStudents] = await connection.query(
      `SELECT teamID, COUNT(*) AS studentCount
       FROM team_students
       WHERE seasonID = ?
       GROUP BY teamID`,
      [season.ID]
    );

    const [guardians] = await connection.query(
      `SELECT ID, nombres, apellidos, email, telefono, rut, createdAt
       FROM guardians
       WHERE seasonID = ?
       ORDER BY apellidos ASC, nombres ASC`,
      [season.ID]
    );

    const [students] = await connection.query(
      `SELECT
         s.ID,
         s.nombres,
         s.apellidos,
         s.email,
         s.categoria,
         s.retiradoPrograma,
         s.retiradoApoderado,
         s.retiradoEn,
         s.createdAt,
         s.teamID,
         t.nombre AS teamNombre,
         t.numeroCorrelativo AS teamNumero,
         t.ods AS teamOds
       FROM students s
       LEFT JOIN teams t ON t.ID = s.teamID
       WHERE s.seasonID = ?
       ORDER BY FIELD(s.categoria, 'Beginner', 'Junior', 'Senior'), s.apellidos ASC, s.nombres ASC`,
      [season.ID]
    );

    const [attendanceRows] = await connection.query(
      `SELECT
         a.studentID,
         a.tipo,
         a.justificacion,
         a.hora,
         a.createdAt,
         sd.fecha
       FROM attendance a
       INNER JOIN season_dates sd ON sd.ID = a.seasonDateID
       WHERE sd.seasonID = ?
       ORDER BY sd.fecha ASC, a.studentID ASC, a.createdAt ASC`,
      [season.ID]
    );

    const activeStudents = students.filter((student) => !student.retiradoPrograma);
    const retiredStudents = students.filter((student) => student.retiradoPrograma);
    const totalAttendanceRecords = attendanceRows.length;
    const entradas = attendanceRows.filter((row) => row.tipo === 'entrada').length;
    const salidas = attendanceRows.filter((row) => row.tipo === 'salida').length;
    const justificados = attendanceRows.filter((row) => row.tipo === 'justificado').length;
    const activeDatesWithAttendance = seasonDates.filter((date) =>
      attendanceRows.some((row) => row.fecha === date.fecha)
    );

    const attendanceByStudent = new Map();
    for (const student of students) {
      attendanceByStudent.set(student.ID, {
        ...student,
        days: new Map(),
        attendanceDays: 0,
        justifiedDays: 0,
        totalDays: activeDatesWithAttendance.length,
        percentage: null,
      });
    }

    for (const row of attendanceRows) {
      const student = attendanceByStudent.get(row.studentID);
      if (!student) continue;
      const day = student.days.get(row.fecha) || { hasEntrada: false, hasSalida: false, justificacion: null };
      if (row.tipo === 'entrada') day.hasEntrada = true;
      if (row.tipo === 'salida') day.hasSalida = true;
      if (row.tipo === 'justificado') day.justificacion = row.justificacion || 'Justificado';
      if (row.justificacion) day.justificacion = row.justificacion;
      student.days.set(row.fecha, day);
    }

    for (const student of attendanceByStudent.values()) {
      let attendanceDays = 0;
      let justifiedDays = 0;
      for (const date of activeDatesWithAttendance) {
        const day = student.days.get(date.fecha);
        if (day?.hasEntrada || day?.justificacion) attendanceDays += 1;
        if (day?.justificacion) justifiedDays += 1;
      }
      student.attendanceDays = attendanceDays;
      student.justifiedDays = justifiedDays;
      student.percentage = !student.retiradoPrograma && student.totalDays > 0
        ? Math.round((attendanceDays / student.totalDays) * 100)
        : null;
    }

    const averageAttendance = activeStudents.length && activeDatesWithAttendance.length
      ? Math.round(
          (activeStudents.reduce((sum, student) => sum + student.attendanceDays, 0) /
            (activeStudents.length * activeDatesWithAttendance.length)) * 100
        )
      : 0;

    const mentorsAssigned = teamMentors.reduce((sum, row) => sum + Number(row.mentorCount || 0), 0);
    const studentsAssignedToTeams = teamStudents.reduce((sum, row) => sum + Number(row.studentCount || 0), 0);

    const teamMentorMap = new Map(teamMentors.map((row) => [row.teamID, Number(row.mentorCount || 0)]));
    const teamStudentMap = new Map(teamStudents.map((row) => [row.teamID, Number(row.studentCount || 0)]));

    const nowLabel = new Date().toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const usersTable = users.map((user) => `
      <tr>
        <td>${escapeHtml(user.ID)}</td>
        <td>${escapeHtml(user.nombre)}</td>
        <td>${escapeHtml(user.apellido)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td><span class="badge ${badgeForRole(user.rol)}">${escapeHtml(user.rol)}</span></td>
        <td>${escapeHtml(formatDate(user.createdAt))}</td>
      </tr>
    `).join('');

    const seasonDatesTable = seasonDates.map((date) => {
      const records = attendanceRows.filter((row) => row.fecha === date.fecha).length;
      const studentsWithPresence = new Set(
        attendanceRows.filter((row) => row.fecha === date.fecha && row.tipo !== 'salida').map((row) => row.studentID)
      ).size;
      return `
        <tr>
          <td>${escapeHtml(date.ID)}</td>
          <td>${escapeHtml(formatDate(date.fecha))}</td>
          <td><span class="badge ${date.activa ? 'badge-active' : 'badge-retired'}">${date.activa ? 'Activa' : 'Inactiva'}</span></td>
          <td>${escapeHtml(records)}</td>
          <td>${escapeHtml(studentsWithPresence)}</td>
        </tr>
      `;
    }).join('');

    const teamsTable = teams.map((team) => `
      <tr>
        <td>${escapeHtml(team.ID)}</td>
        <td>${escapeHtml(team.nombre)}</td>
        <td>${escapeHtml(team.numeroCorrelativo)}</td>
        <td>${escapeHtml(team.ods)}</td>
        <td><span class="badge ${badgeForCategory(team.categoria)}">${escapeHtml(team.categoria)}</span></td>
        <td>${escapeHtml(teamStudentMap.get(team.ID) || 0)}</td>
        <td>${escapeHtml(teamMentorMap.get(team.ID) || 0)}</td>
      </tr>
    `).join('');

    const studentsTable = students.map((student) => {
      const record = attendanceByStudent.get(student.ID);
      const percentage = record?.percentage;
      const retired = Boolean(student.retiradoPrograma);
      const retiredLabel = retired ? `Retirada el ${formatDateLong(student.retiradoEn)}` : 'Activa';
      return `
        <tr class="${retired ? 'retired-row' : ''}">
          <td>${escapeHtml(student.ID)}</td>
          <td>${escapeHtml(student.apellidos)}, ${escapeHtml(student.nombres)}</td>
          <td>${escapeHtml(student.email || '-')}</td>
          <td><span class="badge ${badgeForCategory(student.categoria)}">${escapeHtml(student.categoria)}</span></td>
          <td>${escapeHtml(student.teamNombre || '-')}</td>
          <td><span class="badge ${badgeForRetired(retired)}">${escapeHtml(retiredLabel)}</span></td>
          <td>${retired ? '--' : `${escapeHtml(percentage)}%`}</td>
          <td>${escapeHtml(record?.attendanceDays || 0)}</td>
          <td>${escapeHtml(record?.justifiedDays || 0)}</td>
        </tr>
      `;
    }).join('');

    const retiredTable = retiredStudents.length
      ? retiredStudents.map((student) => `
          <tr>
            <td>${escapeHtml(student.ID)}</td>
            <td>${escapeHtml(student.apellidos)}, ${escapeHtml(student.nombres)}</td>
            <td>${escapeHtml(student.email || '-')}</td>
            <td>${escapeHtml(student.teamNombre || '-')}</td>
            <td>${escapeHtml(formatDateLong(student.retiradoEn))}</td>
            <td>${escapeHtml(student.retiradoApoderado ? 'Sí' : 'No')}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="6" class="empty">No hay estudiantes retiradas del programa.</td></tr>`;

    const guardiansTable = guardians.slice(0, 20).map((guardian) => `
      <tr>
        <td>${escapeHtml(guardian.ID)}</td>
        <td>${escapeHtml(guardian.apellidos)}, ${escapeHtml(guardian.nombres)}</td>
        <td>${escapeHtml(guardian.email || '-')}</td>
        <td>${escapeHtml(guardian.telefono || '-')}</td>
        <td>${escapeHtml(guardian.rut || '-')}</td>
        <td>${escapeHtml(formatDate(guardian.createdAt))}</td>
      </tr>
    `).join('');

    const attendanceByDateTable = seasonDates.map((date) => {
      const rows = attendanceRows.filter((row) => row.fecha === date.fecha);
      const studentsPresent = new Set(rows.filter((row) => row.tipo !== 'salida').map((row) => row.studentID)).size;
      const activePresent = rows.filter((row) => {
        const student = attendanceByStudent.get(row.studentID);
        return student && !student.retiradoPrograma && row.tipo !== 'salida';
      }).length;
      const activePossible = activeStudents.length;
      const percent = activePossible > 0 ? Math.round((activePresent / activePossible) * 100) : 0;
      return `
        <tr>
          <td>${escapeHtml(formatDate(date.fecha))}</td>
          <td>${escapeHtml(rows.length)}</td>
          <td>${escapeHtml(studentsPresent)}</td>
          <td>${escapeHtml(activePresent)}</td>
          <td>${escapeHtml(percent)}%</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Informe Sistema QR Technovation UV - Producción</title>
  <style>
    :root {
      --bg: #f4f7fb;
      --surface: #ffffff;
      --text: #1f2937;
      --muted: #6b7280;
      --primary: #334155;
      --accent: #4f46e5;
      --accent-2: #0891b2;
      --success: #16a34a;
      --warning: #ea580c;
      --danger: #dc2626;
      --border: #e5e7eb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #eef2ff 0%, var(--bg) 240px, #f8fafc 100%);
      color: var(--text);
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.5;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #4f46e5 55%, #0ea5e9 100%);
      color: white;
      padding: 40px 24px;
      box-shadow: 0 10px 35px rgba(15, 23, 42, 0.25);
    }
    .header-inner {
      max-width: 1400px;
      margin: 0 auto;
    }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 10px;
    }
    h1 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 3.1rem);
      line-height: 1.05;
    }
    .subtitle {
      margin-top: 10px;
      font-size: 1.05rem;
      opacity: 0.95;
    }
    .meta {
      margin-top: 14px;
      font-size: 0.95rem;
      opacity: 0.88;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 28px 20px 48px;
    }
    .section {
      background: var(--surface);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
      margin-bottom: 22px;
      overflow: hidden;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 22px;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      border-bottom: 1px solid var(--border);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary);
    }
    .section-content {
      padding: 20px 22px 24px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 16px;
    }
    .stat-card {
      padding: 18px;
      border-radius: 16px;
      color: white;
      background: linear-gradient(135deg, #334155 0%, #1d4ed8 100%);
      box-shadow: 0 12px 24px rgba(51, 65, 85, 0.18);
    }
    .stat-card.orange { background: linear-gradient(135deg, #fb7185 0%, #f97316 100%); }
    .stat-card.green { background: linear-gradient(135deg, #16a34a 0%, #0ea5e9 100%); }
    .stat-card.purple { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); }
    .stat-card.gray { background: linear-gradient(135deg, #475569 0%, #0f172a 100%); }
    .stat-label {
      font-size: 0.9rem;
      opacity: 0.9;
      margin-top: 6px;
    }
    .stat-number {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.04em;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .badge-superadmin { background: #fee2e2; color: #991b1b; }
    .badge-admin { background: #dbeafe; color: #1d4ed8; }
    .badge-voluntario { background: #dcfce7; color: #166534; }
    .badge-beginner { background: #ecfdf5; color: #047857; }
    .badge-junior { background: #dbeafe; color: #1d4ed8; }
    .badge-senior { background: #ede9fe; color: #6d28d9; }
    .badge-retired { background: #fee2e2; color: #b91c1c; }
    .badge-active { background: #dcfce7; color: #166534; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
    }
    .info-card h4 {
      margin: 0 0 10px;
      color: var(--primary);
      font-size: 1rem;
    }
    .info-card p {
      margin: 0 0 8px;
      color: var(--text);
    }
    .info-card p:last-child { margin-bottom: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      background: white;
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
    }
    thead th {
      background: #0f172a;
      color: white;
      text-align: left;
      padding: 12px 14px;
      font-size: 0.84rem;
      letter-spacing: 0.02em;
    }
    tbody td {
      padding: 11px 14px;
      border-top: 1px solid var(--border);
      font-size: 0.88rem;
      vertical-align: top;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .retired-row {
      background: #fff1f2 !important;
      color: #7f1d1d;
    }
    .retired-row td {
      text-decoration: line-through;
      text-decoration-thickness: 2px;
      text-decoration-color: #ef4444;
    }
    .empty {
      text-align: center;
      color: var(--muted);
      font-style: italic;
      text-decoration: none !important;
    }
    .footer {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px 32px;
      color: var(--muted);
      font-size: 0.92rem;
      text-align: center;
    }
    .table-wrap {
      overflow-x: auto;
      border-radius: 16px;
    }
    .subtle {
      color: var(--muted);
      font-size: 0.92rem;
      margin-top: 8px;
    }
    .section-note {
      margin-top: 12px;
      color: var(--muted);
      font-size: 0.92rem;
    }
    @media (max-width: 900px) {
      .container { padding-inline: 14px; }
      .section-title, .section-content { padding-inline: 16px; }
      thead th, tbody td { padding-inline: 10px; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <div class="eyebrow">Sistema QR Technovation UV</div>
      <h1>Informe de Producción</h1>
      <div class="subtitle">Base de Datos: ${escapeHtml(productionDbName)}</div>
      <div class="meta">Generado el ${escapeHtml(nowLabel)} · Temporada seleccionada: ${escapeHtml(season.nombre)}</div>
    </div>
  </header>

  <main class="container">
    <section class="section">
      <div class="section-title">Resumen General</div>
      <div class="section-content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${users.length}</div>
            <div class="stat-label">Usuarios registrados</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-number">${students.length}</div>
            <div class="stat-label">Estudiantes totales</div>
          </div>
          <div class="stat-card green">
            <div class="stat-number">${activeStudents.length}</div>
            <div class="stat-label">Estudiantes activas</div>
          </div>
          <div class="stat-card gray">
            <div class="stat-number">${retiredStudents.length}</div>
            <div class="stat-label">Estudiantes retiradas</div>
          </div>
          <div class="stat-card purple">
            <div class="stat-number">${seasonDates.length}</div>
            <div class="stat-label">Fechas de temporada</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-number">${teams.length}</div>
            <div class="stat-label">Equipos</div>
          </div>
          <div class="stat-card green">
            <div class="stat-number">${mentorsAssigned}</div>
            <div class="stat-label">Mentores asignados</div>
          </div>
          <div class="stat-card purple">
            <div class="stat-number">${guardians.length}</div>
            <div class="stat-label">Apoderados</div>
          </div>
        </div>
        <div class="stats-grid" style="margin-top:16px;">
          <div class="stat-card gray">
            <div class="stat-number">${totalAttendanceRecords}</div>
            <div class="stat-label">Registros de asistencia</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-number">${entradas}</div>
            <div class="stat-label">Entradas</div>
          </div>
          <div class="stat-card green">
            <div class="stat-number">${salidas}</div>
            <div class="stat-label">Salidas</div>
          </div>
          <div class="stat-card purple">
            <div class="stat-number">${justificados}</div>
            <div class="stat-label">Justificados</div>
          </div>
        </div>
        <div class="section-note">
          El promedio de asistencia se calcula solo con estudiantes activas, excluyendo las retiradas del programa.
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Información de la Temporada</div>
      <div class="section-content">
        <div class="info-grid">
          <div class="info-card">
            <h4>Temporada activa</h4>
            <p><strong>ID:</strong> ${escapeHtml(season.ID)}</p>
            <p><strong>Nombre:</strong> ${escapeHtml(season.nombre)}</p>
            <p><strong>Estado:</strong> <span class="badge ${season.activa ? 'badge-active' : 'badge-retired'}">${season.activa ? 'Activa' : 'Inactiva'}</span></p>
            <p><strong>Inicio:</strong> ${escapeHtml(formatDate(season.fechaInicio))}</p>
            <p><strong>Fin:</strong> ${escapeHtml(formatDate(season.fechaFin))}</p>
          </div>
          <div class="info-card">
            <h4>Conexión a base de datos</h4>
            <p><strong>Host:</strong> ${escapeHtml(process.env.DB_HOST || '-')}</p>
            <p><strong>Base:</strong> ${escapeHtml(productionDbName)}</p>
            <p><strong>Puerto:</strong> ${escapeHtml(process.env.DB_PORT || '3306')}</p>
            <p><strong>Fecha generación:</strong> ${escapeHtml(nowLabel)}</p>
          </div>
          <div class="info-card">
            <h4>Asistencia promedio</h4>
            <p><strong>Días con registros:</strong> ${activeDatesWithAttendance.length}</p>
            <p><strong>Promedio global:</strong> ${averageAttendance}%</p>
            <p><strong>Registros por fecha:</strong> ${activeDatesWithAttendance.length ? Math.round(totalAttendanceRecords / activeDatesWithAttendance.length) : 0}</p>
          </div>
          <div class="info-card">
            <h4>Datos de estructura</h4>
            <p><strong>Equipos con estudiantes:</strong> ${studentsAssignedToTeams}</p>
            <p><strong>Equipos con mentores:</strong> ${teamMentors.length}</p>
            <p><strong>Fechas activas:</strong> ${seasonDates.filter((date) => date.activa).length}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Usuarios del Sistema</div>
      <div class="section-content table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            ${usersTable}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Temporadas y Fechas</div>
      <div class="section-content table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Registros</th>
              <th>Estudiantes con presencia</th>
            </tr>
          </thead>
          <tbody>
            ${seasonDatesTable}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Equipos</div>
      <div class="section-content table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Número</th>
              <th>ODS</th>
              <th>Categoría</th>
              <th>Estudiantes</th>
              <th>Mentores</th>
            </tr>
          </thead>
          <tbody>
            ${teamsTable || '<tr><td colspan="7" class="empty">No hay equipos para esta temporada.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Estudiantes</div>
      <div class="section-content table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Categoría</th>
              <th>Equipo</th>
              <th>Estado</th>
              <th>%</th>
              <th>Presencias</th>
              <th>Justificados</th>
            </tr>
          </thead>
          <tbody>
            ${studentsTable}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Retiro del Programa</div>
      <div class="section-content">
        <div class="info-grid">
          <div class="info-card">
            <h4>Resumen de retiros</h4>
            <p><strong>Total retiradas:</strong> ${retiredStudents.length}</p>
            <p><strong>Activas:</strong> ${activeStudents.length}</p>
            <p><strong>Porcentaje retiradas:</strong> ${students.length ? Math.round((retiredStudents.length / students.length) * 100) : 0}%</p>
          </div>
        </div>
        <div class="table-wrap" style="margin-top:16px;">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Equipo</th>
                <th>Fecha retiro</th>
                <th>Retiro con apoderado</th>
              </tr>
            </thead>
            <tbody>
              ${retiredTable}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Asistencia por Fecha</div>
      <div class="section-content table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Registros</th>
              <th>Estudiantes con presencia</th>
              <th>Presentes activas</th>
              <th>% sobre activas</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceByDateTable || '<tr><td colspan="5" class="empty">No hay registros de asistencia en esta temporada.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <div class="section-title">Apoderados</div>
      <div class="section-content">
        <div class="info-grid">
          <div class="info-card">
            <h4>Resumen</h4>
            <p><strong>Apoderados registrados:</strong> ${guardians.length}</p>
            <p><strong>En temporada:</strong> ${season.nombre}</p>
          </div>
        </div>
        <div class="table-wrap" style="margin-top:16px;">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>RUT</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              ${guardiansTable || '<tr><td colspan="6" class="empty">No hay apoderados registrados.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div>Sistema QR Technovation UV · Informe generado desde la base de datos de producción</div>
    <div>Archivo: informe_produccion_prod.html</div>
  </footer>
</body>
</html>`;

    fs.writeFileSync(outputFile, html, 'utf8');
    console.log(`Informe generado en: ${outputFile}`);
    console.log(`Temporada usada: ${season.nombre} (ID ${season.ID})`);
    console.log(`Estudiantes totales: ${students.length} | Activas: ${activeStudents.length} | Retiradas: ${retiredStudents.length}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('No se pudo generar el informe:', error);
  process.exitCode = 1;
});
