import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
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
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [seasonDates, setSeasonDates] = useState<string[]>([]);
  const [attendances, setAttendances] = useState<{ studentID: number; fecha: string; tipo: 'entrada' | 'salida' }[]>([]);
  const [filterCategoria, setFilterCategoria] = useState<Categoria | 'todas'>('todas');

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
          {filteredStudents.length} estudiante{filteredStudents.length !== 1 ? 's' : ''} · {validDates.length} días con asistencia
        </span>
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
                        title = 'No asistió';
                      }
                    }
                    return (
                      <td key={fecha} className="px-1 py-2 text-center">
                        <div
                          className={`w-5 h-5 rounded mx-auto ${bgClass}`}
                          title={title}
                        />
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
    </div>
  );
}
