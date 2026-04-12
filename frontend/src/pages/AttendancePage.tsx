import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors } from '../config';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import QrScanner from '../components/QrScanner';
import type { Attendance, Categoria } from '../types';

// ──────────────────────────────────────────────
// Types local to this page
// ──────────────────────────────────────────────

interface StudentSummary {
  studentID: number;
  nombres: string;
  apellidos: string;
  categoria: Categoria;
  retiradoApoderado: boolean;
  records: Attendance[];
  lastRecord: Attendance | null;
  status: 'presente' | 'salio' | 'ausente';
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST issues
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(hora: string): string {
  // hora comes as "HH:MM:SS" — show HH:MM
  return hora.slice(0, 5);
}

function categoriaBadge(cat: Categoria) {
  const styles: Record<Categoria, string> = {
    Beginner: 'bg-emerald-100 text-emerald-800',
    Junior: 'bg-blue-100 text-blue-800',
    Senior: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${styles[cat]}`}>
      {cat}
    </span>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export default function AttendancePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoria, setFilterCategoria] = useState<Categoria | 'todas'>('todas');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'presente' | 'salio' | 'ausente'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [allStudents, setAllStudents] = useState<
    { ID: number; nombres: string; apellidos: string; categoria: Categoria; retiradoApoderado: boolean }[]
  >([]);

  const seasonIdStr = localStorage.getItem('currentSeasonId');
  const seasonID = seasonIdStr ? parseInt(seasonIdStr, 10) : null;

  const isToday = selectedDate === todayStr();

  // ── Socket.io real-time updates ──
  const { on, connected, reconnect } = useSocket(seasonID);

  const handleAttendanceRegistered = useCallback(
    (data: Attendance) => {
      // Only apply real-time updates when viewing today
      if (selectedDate !== todayStr()) return;
      setAttendances((prev) => {
        // Avoid duplicates (same ID)
        if (prev.some((a) => a.ID === data.ID)) return prev;
        return [...prev, data];
      });
    },
    [selectedDate],
  );

  useEffect(() => {
    const unsub = on<Attendance>('attendance-registered', handleAttendanceRegistered);
    return unsub;
  }, [on, handleAttendanceRegistered]);

  // Load students list for the season (once)
  useEffect(() => {
    if (!seasonID) return;
    api
      .get(`/students?seasonID=${seasonID}`)
      .then((res) => setAllStudents(res.data))
      .catch((err) => console.error('Error loading students:', err));
  }, [seasonID]);

  // Load attendance for the selected date
  useEffect(() => {
    setLoading(true);
    api
      .get<Attendance[]>(`/attendance/date/${selectedDate}`)
      .then((res) => setAttendances(res.data))
      .catch((err) => {
        console.error('Error loading attendance:', err);
        setAttendances([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // ── Compute student summaries ──
  const studentSummaries: StudentSummary[] = useMemo(() => {
    // Group attendance records by studentID
    const byStudent = new Map<number, Attendance[]>();
    for (const a of attendances) {
      const sid = a.studentID;
      if (!byStudent.has(sid)) byStudent.set(sid, []);
      byStudent.get(sid)!.push(a);
    }

    // Sort each student's records by hora ascending (earliest first)
    for (const records of byStudent.values()) {
      records.sort((a, b) => a.hora.localeCompare(b.hora));
    }

    // Build summaries: students with records
    const summaries: StudentSummary[] = [];
    const studentsWithRecords = new Set<number>();

    for (const [sid, records] of byStudent) {
      studentsWithRecords.add(sid);
      const lastRecord = records[records.length - 1];
      const status: StudentSummary['status'] = lastRecord.tipo === 'entrada' ? 'presente' : 'salio';

      // Get student info from the attendance record (if relation loaded) or from allStudents
      const fromRecord = records[0].student;
      const fromList = allStudents.find((s) => s.ID === sid);
      const nombres = fromRecord?.nombres ?? fromList?.nombres ?? 'Desconocido';
      const apellidos = fromRecord?.apellidos ?? fromList?.apellidos ?? '';
      const categoria = fromRecord?.categoria ?? fromList?.categoria ?? 'Beginner';
      const retiradoApoderado = fromRecord?.retiradoApoderado ?? fromList?.retiradoApoderado ?? false;

      summaries.push({
        studentID: sid,
        nombres,
        apellidos,
        categoria,
        retiradoApoderado,
        records,
        lastRecord,
        status,
      });
    }

    // Add absent students (in the season but no records this date)
    for (const s of allStudents) {
      if (!studentsWithRecords.has(s.ID)) {
        summaries.push({
          studentID: s.ID,
          nombres: s.nombres,
          apellidos: s.apellidos,
          categoria: s.categoria,
          retiradoApoderado: s.retiradoApoderado,
          records: [],
          lastRecord: null,
          status: 'ausente',
        });
      }
    }

    return summaries;
  }, [attendances, allStudents]);

  // ── Filtered & searched summaries ──
  const filteredSummaries = useMemo(() => {
    let list = studentSummaries;

    if (filterCategoria !== 'todas') {
      list = list.filter((s) => s.categoria === filterCategoria);
    }
    if (filterStatus !== 'todos') {
      list = list.filter((s) => s.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.nombres.toLowerCase().includes(q) ||
          s.apellidos.toLowerCase().includes(q)
      );
    }

    // Sort: presentes first, then salio, then ausente. Within group, alphabetical.
    const statusOrder: Record<string, number> = { presente: 0, salio: 1, ausente: 2 };
    list.sort((a, b) => {
      const so = statusOrder[a.status] - statusOrder[b.status];
      if (so !== 0) return so;
      return `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`);
    });

    return list;
  }, [studentSummaries, filterCategoria, filterStatus, searchQuery]);

  // ── Stats ──
  const stats = useMemo(() => {
    const presentes = studentSummaries.filter((s) => s.status === 'presente').length;
    const salieron = studentSummaries.filter((s) => s.status === 'salio').length;
    const ausentes = studentSummaries.filter((s) => s.status === 'ausente').length;
    const totalEntradas = attendances.filter((a) => a.tipo === 'entrada').length;
    const totalSalidas = attendances.filter((a) => a.tipo === 'salida').length;
    return { presentes, salieron, ausentes, totalEntradas, totalSalidas };
  }, [studentSummaries, attendances]);

  // ── Early returns ──
  if (!seasonID) {
    return (
      <div className="p-4">
        Debes seleccionar una temporada antes de ver la asistencia.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/panel')}
            className="text-text-muted hover:text-text text-sm"
          >
            &larr; Volver
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-text">Panel de Asistencia</h1>
        </div>
      </div>

      {/* Date navigation */}
      <div className="bg-surface rounded-lg shadow p-3 flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
          className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium"
        >
          &larr; Anterior
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-sm text-text-muted capitalize hidden sm:inline">
            {formatDateDisplay(selectedDate)}
          </span>
          {isToday && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
              HOY
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
            className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium"
          >
            Siguiente &rarr;
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayStr())}
              className="px-3 py-1.5 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: colors.accent }}
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* QR Scanner — only shown when viewing today */}
      {isToday && user && (
        <QrScanner userID={user.ID} connected={connected} onReconnect={reconnect} />
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <button
          onClick={() => setFilterStatus(filterStatus === 'presente' ? 'todos' : 'presente')}
          className={`rounded-lg p-2.5 text-center transition-all ${filterStatus === 'presente' ? 'ring-2 ring-green-500 shadow-md' : 'shadow'}`}
          style={{ backgroundColor: colors.surface }}
        >
          <div className="text-2xl font-bold" style={{ color: colors.success }}>
            {stats.presentes}
          </div>
          <div className="text-[10px] text-text-muted">Presentes</div>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'salio' ? 'todos' : 'salio')}
          className={`rounded-lg p-2.5 text-center transition-all ${filterStatus === 'salio' ? 'ring-2 ring-orange-400 shadow-md' : 'shadow'}`}
          style={{ backgroundColor: colors.surface }}
        >
          <div className="text-2xl font-bold" style={{ color: colors.warning }}>
            {stats.salieron}
          </div>
          <div className="text-[10px] text-text-muted">Salieron</div>
        </button>
        <button
          onClick={() => setFilterStatus(filterStatus === 'ausente' ? 'todos' : 'ausente')}
          className={`rounded-lg p-2.5 text-center transition-all ${filterStatus === 'ausente' ? 'ring-2 ring-red-400 shadow-md' : 'shadow'}`}
          style={{ backgroundColor: colors.surface }}
        >
          <div className="text-2xl font-bold" style={{ color: colors.danger }}>
            {stats.ausentes}
          </div>
          <div className="text-[10px] text-text-muted">Ausentes</div>
        </button>
        <div className="rounded-lg shadow p-2.5 text-center hidden sm:block" style={{ backgroundColor: colors.surface }}>
          <div className="text-2xl font-bold" style={{ color: colors.secondary }}>
            {stats.totalEntradas}
          </div>
          <div className="text-[10px] text-text-muted">Entradas</div>
        </div>
        <div className="rounded-lg shadow p-2.5 text-center hidden sm:block" style={{ backgroundColor: colors.surface }}>
          <div className="text-2xl font-bold" style={{ color: colors.accent }}>
            {stats.totalSalidas}
          </div>
          <div className="text-[10px] text-text-muted">Salidas</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Buscar estudiante..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value as Categoria | 'todas')}
          className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="todas">Todas las categorias</option>
          <option value="Beginner">Beginner</option>
          <option value="Junior">Junior</option>
          <option value="Senior">Senior</option>
        </select>
        {filterStatus !== 'todos' && (
          <button
            onClick={() => setFilterStatus('todos')}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Limpiar filtro status
          </button>
        )}
        <span className="text-xs text-text-muted ml-auto">
          {filteredSummaries.length} estudiante{filteredSummaries.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Student list */}
      {loading ? (
        <div className="bg-surface rounded-lg shadow p-8 text-center text-text-muted">
          Cargando asistencia...
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSummaries.length === 0 && (
            <div className="bg-surface rounded-lg shadow p-8 text-center text-text-muted">
              {attendances.length === 0 && allStudents.length === 0
                ? 'No hay datos de asistencia para esta fecha.'
                : 'Ningun estudiante coincide con los filtros.'}
            </div>
          )}

          {filteredSummaries.map((s) => (
            <StudentCard key={s.studentID} summary={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Student attendance card
// ──────────────────────────────────────────────

function StudentCard({ summary }: { summary: StudentSummary }) {
  const [expanded, setExpanded] = useState(false);
  const { status, lastRecord, records } = summary;

  const statusConfig = {
    presente: {
      bg: 'bg-green-50 border-green-200',
      badge: 'bg-green-100 text-green-800',
      label: 'Presente',
      dot: 'bg-green-500',
    },
    salio: {
      bg: 'bg-orange-50 border-orange-200',
      badge: 'bg-orange-100 text-orange-800',
      label: 'Salio',
      dot: 'bg-orange-400',
    },
    ausente: {
      bg: 'bg-gray-50 border-gray-200',
      badge: 'bg-gray-100 text-gray-500',
      label: 'Ausente',
      dot: 'bg-gray-400',
    },
  };

  const cfg = statusConfig[status];

  return (
    <div className={`rounded-lg border shadow-sm overflow-hidden ${cfg.bg}`}>
      {/* Main row */}
      <button
        onClick={() => records.length > 0 && setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        {/* Status dot */}
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

        {/* Name & category */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text truncate">
            {summary.apellidos}, {summary.nombres}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {categoriaBadge(summary.categoria)}
            {summary.retiradoApoderado && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                Retiro apoderado
              </span>
            )}
          </div>
        </div>

        {/* Status badge + last time */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          {lastRecord && (
            <span className="text-[10px] text-text-muted mt-0.5">
              {lastRecord.tipo === 'entrada' ? 'Entrada' : 'Salida'} {formatTime(lastRecord.hora)}
            </span>
          )}
        </div>

        {/* Expand chevron */}
        {records.length > 0 && (
          <span className="text-text-muted text-xs flex-shrink-0">
            {expanded ? '\u25B2' : '\u25BC'}
          </span>
        )}
      </button>

      {/* Expanded: timeline of records */}
      {expanded && records.length > 0 && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200/60">
          <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1.5">
            Historial del dia ({records.length} registro{records.length !== 1 ? 's' : ''})
          </div>
          <div className="space-y-1">
            {records.map((r, i) => (
              <div key={r.ID ?? i} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    r.tipo === 'entrada' ? 'bg-green-500' : 'bg-orange-400'
                  }`}
                />
                <span className="font-medium w-14">
                  {formatTime(r.hora)}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    r.tipo === 'entrada'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {r.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
