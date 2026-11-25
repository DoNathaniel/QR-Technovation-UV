import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import type { Season } from '../types';

interface Member { ID: number; nombre: string; apellido: string; rol: 'admin' | 'voluntario'; }
interface TeamAttendance { ID: number; fecha: string; tipo: 'entrada' | 'salida'; hora: string; mentorID: number; scannedByUserID: number; esFechaPlanificada: boolean; scannedBy?: { nombre: string; apellido: string }; }
interface SeasonHistory {
  seasonID: number;
  members: Member[];
  dates: { fecha: string; configurada: boolean }[];
  attendances: TeamAttendance[];
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function TeamAttendanceAdminTab({ currentSeasonId }: { currentSeasonId: number | null }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonFilter, setSeasonFilter] = useState(currentSeasonId?.toString() ?? '');
  const [history, setHistory] = useState<SeasonHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<Season[]>('/seasons')
      .then((response) => setSeasons(response.data))
      .catch((error) => console.error('Error cargando temporadas:', error));
  }, []);

  useEffect(() => {
    if (currentSeasonId) setSeasonFilter(currentSeasonId.toString());
  }, [currentSeasonId]);

  useEffect(() => {
    if (!seasonFilter && seasons.length) setSeasonFilter(seasons[0].ID.toString());
  }, [seasonFilter, seasons]);

  useEffect(() => {
    if (!seasonFilter) {
      setHistory(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api.get<SeasonHistory>(`/mentor-attendance/season?seasonID=${seasonFilter}`)
      .then((response) => { if (active) setHistory(response.data); })
      .catch((error) => {
        console.error('Error cargando historial de asistencia:', error);
        if (active) setHistory(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [seasonFilter]);

  const filteredMembers = useMemo(() => {
    if (!history) return [];
    const query = search.trim().toLocaleLowerCase('es-CL');
    return history.members.filter((member) =>
      `${member.nombre} ${member.apellido}`.toLocaleLowerCase('es-CL').includes(query),
    );
  }, [history, search]);

  const recordsByDateAndMember = useMemo(() => {
    const records = new Map<string, TeamAttendance[]>();
    for (const attendance of history?.attendances ?? []) {
      const key = `${attendance.fecha.slice(0, 10)}:${attendance.mentorID}`;
      records.set(key, [...(records.get(key) ?? []), attendance]);
    }
    return records;
  }, [history]);

  const presentMarks = useMemo(() => {
    let count = 0;
    for (const records of recordsByDateAndMember.values()) {
      if (records.some((record) => record.tipo === 'entrada')) count += 1;
    }
    return count;
  }, [recordsByDateAndMember]);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-surface p-4 shadow">
      <div>
        <label className="mb-1 block text-sm font-medium text-text">Temporada</label>
        <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {seasons.map((season) => <option key={season.ID} value={season.ID}>{season.nombre}</option>)}
        </select>
      </div>
      <div className="min-w-48 flex-1">
        <label className="mb-1 block text-sm font-medium text-text">Buscar integrante</label>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o apellido" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
    </div>

    {history && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[
        ['Fechas de temporada', history.dates.length, 'text-violet-700'],
        ['Presentes registrados', presentMarks, 'text-emerald-700'],
        ['Integrantes', history.members.length, 'text-blue-700'],
      ].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
        <div className={`text-2xl font-bold ${color}`}>{value}</div><div className="mt-1 text-xs text-gray-500">{label}</div>
      </div>)}
    </div>}

    {loading ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Cargando asistencia…</div> : !history ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Selecciona una temporada para ver la asistencia.</div> : history.dates.length === 0 ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Esta temporada todavía no tiene fechas ni registros de asistencia.</div> : <div className="space-y-4">
      {history.dates.map((date) => {
        const isFuture = date.fecha > new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
        const memberRecords = filteredMembers.map((member) => {
          const records = (recordsByDateAndMember.get(`${date.fecha}:${member.ID}`) ?? []).sort((a, b) => a.hora.localeCompare(b.hora));
          const present = records.some((record) => record.tipo === 'entrada');
          return { member, records, present };
        });
        const presentCount = memberRecords.filter(({ present }) => present).length;

        return <section key={date.fecha} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="font-semibold capitalize text-gray-800">{formatDate(date.fecha)}</h2>
              <p className="text-xs text-gray-500">{presentCount} de {memberRecords.length} presentes</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${date.configurada ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'}`}>
              {date.configurada ? 'Fecha configurada' : 'Fecha no configurada'}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {memberRecords.map(({ member, records, present }) => <div key={member.ID} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <div className={`h-2.5 w-2.5 rounded-full ${present ? 'bg-emerald-500' : isFuture ? 'bg-blue-300' : 'bg-gray-300'}`} />
              <div className="min-w-44 flex-1">
                <p className="font-medium text-gray-800">{member.nombre} {member.apellido}</p>
                <p className="text-xs text-gray-500">{member.rol === 'admin' ? 'Administrador/a' : 'Mentor/a'}</p>
              </div>
              <div className="text-sm text-gray-600">{records.length ? records.map((record) => `${record.tipo === 'entrada' ? 'Entrada' : 'Salida'} ${record.hora.slice(0, 5)}`).join(' · ') : 'Sin registros'}</div>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${present ? 'bg-emerald-100 text-emerald-800' : isFuture ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {present ? 'Presente' : isFuture ? 'Pendiente' : 'Ausente'}
              </span>
            </div>)}
            {memberRecords.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No hay integrantes que coincidan con la búsqueda.</div>}
          </div>
        </section>;
      })}
    </div>}
  </div>;
}
