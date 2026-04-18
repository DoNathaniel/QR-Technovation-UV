import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Categoria } from '../types';

interface StudentInfo {
  ID: number;
  nombres: string;
  apellidos: string;
  categoria: Categoria;
  teamID: number | null;
  teamNombre: string | null;
}

interface DayAttendance {
  fecha: string;
  hasEntrada: boolean;
  hasSalida: boolean;
  justificacion?: string;
}

interface StudentAttendance {
  studentID: number;
  nombres: string;
  apellidos: string;
  categoria: Categoria;
  equipo: string | null;
  days: Record<string, DayAttendance>;
  attendanceDays: number;
  totalDays: number;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function AttendanceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'superadmin' || user?.rol === 'admin';
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [seasonDates, setSeasonDates] = useState<string[]>([]);
  const [attendances, setAttendances] = useState<{ studentID: number; fecha: string; tipo: 'entrada' | 'salida'; justificacion?: string }[]>([]);
  const [filterCategoria, setFilterCategoria] = useState<Categoria | 'todas'>('todas');
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [justifyData, setJustifyData] = useState<{ studentID: number; nombre: string; fecha: string } | null>(null);
  const [justifyText, setJustifyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const seasonIdStr = localStorage.getItem('currentSeasonId');
  const seasonID = seasonIdStr ? parseInt(seasonIdStr, 10) : null;

  useEffect(() => {
    if (!seasonID) return;
    Promise.all([
      api.get<StudentInfo[]>(`/students?seasonID=${seasonID}`),
      api.get<{ fecha: string }[]>(`/seasons/${seasonID}/dates`),
      api.get<{ studentID: number; fecha: string; tipo: 'entrada' | 'salida' }[]>(`/attendance/season/${seasonID}`),
    ])
      .then(([studentsRes, datesRes, attendanceRes]) => {
        setStudents(studentsRes.data);
        setSeasonDates(datesRes.data.map((d) => d.fecha));
        setAttendances(attendanceRes.data);
      })
      .catch((err) => console.error('Error loading data:', err))
      .finally(() => setLoading(false));
  }, [seasonID]);

  // Find dates that have at least one attendance record (these count toward the percentage)
  const validDates = useMemo(() => {
    const datesWithAttendance = new Set<string>();
    for (const a of attendances) {
      datesWithAttendance.add(a.fecha);
    }
    return seasonDates.filter(d => datesWithAttendance.has(d));
  }, [seasonDates, attendances]);

  const studentAttendance: StudentAttendance[] = useMemo(() => {
    const byStudent = new Map<number, StudentAttendance>();

    for (const s of students) {
      byStudent.set(s.ID, {
        studentID: s.ID,
        nombres: s.nombres,
        apellidos: s.apellidos,
        categoria: s.categoria,
        equipo: s.teamNombre,
        days: {},
        attendanceDays: 0,
        totalDays: 0,
      });
    }

    for (const a of attendances) {
      const student = byStudent.get(a.studentID);
      if (!student) continue;
      if (!student.days[a.fecha]) {
        student.days[a.fecha] = { fecha: a.fecha, hasEntrada: false, hasSalida: false };
      }
      if (a.tipo === 'entrada') {
        student.days[a.fecha].hasEntrada = true;
      } else {
        student.days[a.fecha].hasSalida = true;
      }
      if (a.justificacion) {
        student.days[a.fecha].justificacion = a.justificacion;
      }
    }

    for (const student of byStudent.values()) {
      let attendanceDays = 0;
      for (const fecha of validDates) {
        const day = student.days[fecha];
        if (day?.hasEntrada) {
          attendanceDays++;
        }
      }
      student.attendanceDays = attendanceDays;
      student.totalDays = validDates.length;
    }

    return Array.from(byStudent.values()).sort((a, b) => {
      const catOrder: Record<Categoria, number> = { Beginner: 0, Junior: 1, Senior: 2 };
      const catDiff = catOrder[a.categoria] - catOrder[b.categoria];
      if (catDiff !== 0) return catDiff;
      return `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`);
    });
  }, [students, attendances, validDates]);

  const filteredStudents = useMemo(() => {
    if (filterCategoria === 'todas') return studentAttendance;
    return studentAttendance.filter((s) => s.categoria === filterCategoria);
  }, [studentAttendance, filterCategoria]);

  const stats = useMemo(() => {
    const totalStudents = studentAttendance.length;
    const totalDays = validDates.length;
    let totalAttendance = 0;
    for (const s of studentAttendance) {
      totalAttendance += s.attendanceDays;
    }
    const totalPossible = totalStudents * totalDays;
    const avgPercent = totalPossible > 0 ? Math.round((totalAttendance / totalPossible) * 100) : 0;
    return { totalStudents, totalDays, avgPercent };
  }, [studentAttendance, validDates]);

  if (!seasonID) {
    return <div className="p-4">Debes seleccionar una temporada.</div>;
  }

  if (loading) {
    return <div className="p-4 text-center text-text-muted">Cargando informe...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/panel')} className="text-text-muted hover:text-text text-sm">
          &larr; Volver
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-text">Informe de Asistencia</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value as Categoria | 'todas')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="todas">Todas las categorías</option>
          <option value="Beginner">Beginner</option>
          <option value="Junior">Junior</option>
          <option value="Senior">Senior</option>
        </select>
        <span className="text-xs text-text-muted ml-auto">
          {filteredStudents.length} estudiante{filteredStudents.length !== 1 ? 's' : ''} · {validDates.length} días
        </span>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 bg-slate-50 rounded-lg p-3 border border-slate-200">
        <div className="flex-1 text-center">
          <div className="text-lg font-bold text-slate-700">{stats.totalStudents}</div>
          <div className="text-xs text-text-muted">Estudiantes</div>
        </div>
        <div className="flex-1 text-center border-l border-slate-200">
          <div className="text-lg font-bold text-slate-700">{stats.totalDays}</div>
          <div className="text-xs text-text-muted">Días registrados</div>
        </div>
        <div className="flex-1 text-center border-l border-slate-200">
          <div className={`text-lg font-bold ${stats.avgPercent >= 80 ? 'text-green-600' : stats.avgPercent >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
            {stats.avgPercent}%
          </div>
          <div className="text-xs text-text-muted">Asistencia promedio</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg shadow border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b w-56">Estudiante</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b w-28">Equipo</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b w-24">Categoría</th>
              {seasonDates.map((fecha) => (
                <th key={fecha} className="px-1 py-3 text-center font-semibold text-slate-700 border-b w-9">
                  <div className="transform -rotate-45 origin-center whitespace-nowrap text-[9px]">
                    {formatDateDisplay(fecha)}
                  </div>
                </th>
              ))}
              <th className="px-2 py-3 text-center font-semibold text-slate-700 border-b w-16 bg-slate-50">%</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => {
              const percentage = s.totalDays > 0 ? Math.round((s.attendanceDays / s.totalDays) * 100) : 0;
              return (
                <tr key={s.studentID} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-800 truncate">
                      {s.apellidos}, {s.nombres}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{s.equipo || '-'}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        s.categoria === 'Beginner'
                          ? 'bg-emerald-100 text-emerald-700'
                          : s.categoria === 'Junior'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {s.categoria}
                    </span>
                  </td>
                  {seasonDates.map((fecha) => {
                    const day = s.days[fecha];
                    const isValidDate = validDates.includes(fecha);
                    let bgClass = 'bg-gray-100';
                    let title = 'Sin registro';
                    if (isValidDate) {
                      if (day?.hasEntrada && day?.hasSalida) {
                        bgClass = 'bg-green-500';
                        title = 'Entrada y salida';
                      } else if (day?.hasEntrada) {
                        bgClass = 'bg-orange-400';
                        title = 'Solo entrada';
                      } else {
                        bgClass = 'bg-gray-200';
                        title = day?.justificacion ? `No asistió: ${day.justificacion}` : 'No asistió';
                      }
                    }
                    const isClickable = isAdmin && isValidDate && !day?.hasEntrada;
                    return (
                      <td key={fecha} className="px-1 py-2 text-center">
                        <div
                          className={`w-5 h-5 rounded mx-auto ${bgClass} ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-amber-400' : ''} relative`}
                          title={title}
                          onClick={() => {
                            if (isClickable) {
                              setJustifyData({ studentID: s.studentID, nombre: `${s.apellidos}, ${s.nombres}`, fecha });
                              setShowJustifyModal(true);
                            }
                          }}
                        >
                          {day?.justificacion && (
                            <svg className="absolute -top-1 -right-1 w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2.5 text-center bg-slate-50">
                    <span className={`font-bold ${
                      percentage >= 80 ? 'text-green-600' :
                      percentage >= 50 ? 'text-orange-500' :
                      percentage > 0 ? 'text-red-500' :
                      'text-gray-400'
                    }`}>
                      {percentage}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-6 text-xs text-text-muted justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-200" />
          <span>No asistió</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-orange-400" />
          <span>Solo entrada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Entrada y salida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
          <span>Día sin asistencia registrada</span>
        </div>
      </div>

      {/* Justify Modal */}
      {showJustifyModal && justifyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowJustifyModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-2">Justificar inasistencia</h3>
            <p className="text-sm text-text-muted mb-3">
              {justifyData.nombre} - {formatDateDisplay(justifyData.fecha)}
            </p>
            <textarea
              value={justifyText}
              onChange={(e) => setJustifyText(e.target.value)}
              placeholder="Motivo de la inasistencia."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!justifyText.trim()) return;
                  setSubmitting(true);
                  try {
                    await api.patch(`/attendance/justificar?seasonID=${seasonID}`, {
                      studentID: justifyData.studentID,
                      fecha: justifyData.fecha,
                      justificacion: justifyText.trim(),
                    });
                    setShowJustifyModal(false);
                    setJustifyText('');
                    window.location.reload();
                  } catch (err) {
                    console.error('Error justifying:', err);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={!justifyText.trim() || submitting}
                className="flex-1 bg-green-600 text-white font-semibold py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => { setShowJustifyModal(false); setJustifyText(''); }}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
