import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../App';

interface MyAttendance {
  ID: number;
  tipo: 'entrada' | 'salida';
  fecha: string;
  hora: string;
  esFechaPlanificada: boolean;
  scannedBy?: { nombre: string; apellido: string };
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function displayDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function MyTeamAttendancePage() {
  const navigate = useNavigate();
  const seasonID = Number(localStorage.getItem('currentSeasonId')) || null;
  const [records, setRecords] = useState<MyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(toKey(new Date()));
  const [qrModal, setQrModal] = useState<{ open: boolean; qrUrl: string | null }>({ open: false, qrUrl: null });

  useEffect(() => {
    if (!seasonID) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get<MyAttendance[]>(`/mentor-attendance/mine?seasonID=${seasonID}`)
      .then((response) => setRecords(response.data))
      .catch((error) => console.error('Error cargando mis asistencias:', error))
      .finally(() => setLoading(false));
  }, [seasonID]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, MyAttendance[]>();
    for (const record of records) map.set(record.fecha, [...(map.get(record.fecha) || []), record]);
    return map;
  }, [records]);
  const selectedRecords = (recordsByDate.get(selectedDate) || []).sort((a, b) => a.hora.localeCompare(b.hora));
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthLabel = month.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  const openQR = async () => {
    try {
      const response = await api.get<{ qrUrl: string }>('/users/me/qr');
      setQrModal({ open: true, qrUrl: response.data.qrUrl });
    } catch (error: any) {
      toast.warning(error.response?.data?.message || 'No fue posible obtener tu QR');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><button onClick={() => navigate('/panel')} className="text-sm text-text-muted hover:text-text">← Volver</button>
        <div>
          <h1 className="text-xl font-bold text-text sm:text-2xl">Mi asistencia</h1>
          <p className="text-sm text-text-muted">Tus registros como integrante del equipo</p>
        </div></div>
        <button onClick={openQR} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">Ver mi QR</button>
      </div>

      {!seasonID ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Selecciona una temporada para consultar tus registros.</div>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg px-3 py-1.5 text-violet-700 hover:bg-violet-50" aria-label="Mes anterior">←</button>
              <h2 className="font-semibold capitalize text-gray-800">{monthLabel}</h2>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg px-3 py-1.5 text-violet-700 hover:bg-violet-50" aria-label="Mes siguiente">→</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-gray-400">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => <div key={day} className="py-1">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, index) => <div key={`empty-${index}`} />)}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
                const key = toKey(date);
                const dayRecords = recordsByDate.get(key) || [];
                const isSelected = key === selectedDate;
                const isToday = key === toKey(new Date());
                return (
                  <button key={key} onClick={() => setSelectedDate(key)} className={`min-h-14 rounded-lg border p-1.5 text-sm transition ${isSelected ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-400' : 'border-transparent hover:bg-gray-50'} ${isToday ? 'font-bold text-violet-700' : 'text-gray-700'}`}>
                    <span>{index + 1}</span>
                    <div className="mt-1 flex justify-center gap-1">
                      {dayRecords.some((record) => record.tipo === 'entrada') && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Entrada" />}
                      {dayRecords.some((record) => record.tipo === 'salida') && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" title="Salida" />}
                      {dayRecords.some((record) => !record.esFechaPlanificada) && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Fuera de fecha" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Entrada</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />Salida</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Fuera de fecha planificada</span></div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold capitalize text-gray-800">{displayDate(selectedDate)}</h2>
            {loading ? <p className="mt-4 text-sm text-gray-500">Cargando registros…</p> : selectedRecords.length === 0 ? <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">No tienes registros de asistencia para este día.</p> : (
              <ol className="mt-4 space-y-3 border-l-2 border-violet-100 pl-5">
                {selectedRecords.map((record) => (
                  <li key={record.ID} className="relative">
                    <span className={`absolute -left-[1.85rem] top-1 h-3 w-3 rounded-full ${record.tipo === 'entrada' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-semibold text-gray-800">{record.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span><span className="text-sm text-gray-500">{record.hora.slice(0, 5)}</span>{!record.esFechaPlanificada && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Fuera de fecha</span>}</div>
                    <p className="mt-0.5 text-sm text-gray-500">Registrada por {record.scannedBy ? `${record.scannedBy.nombre} ${record.scannedBy.apellido}` : 'un administrador'}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
      {qrModal.open && qrModal.qrUrl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQrModal({ open: false, qrUrl: null })}>
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-gray-800">Mi código QR</h2><p className="text-sm text-gray-500">Preséntalo para registrar tu asistencia.</p></div><button onClick={() => setQrModal({ open: false, qrUrl: null })} className="text-2xl text-gray-400 hover:text-gray-700" aria-label="Cerrar">×</button></div>
          <img src={qrModal.qrUrl} alt="Mi código QR de asistencia" className="mx-auto w-full max-w-[300px] rounded-lg" />
        </div>
      </div>}
    </div>
  );
}
