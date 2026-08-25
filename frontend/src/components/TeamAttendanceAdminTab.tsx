import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import type { Season } from '../types';

interface Member { ID: number; nombre: string; apellido: string; rol: 'admin' | 'voluntario'; }
interface TeamAttendance { ID: number; tipo: 'entrada' | 'salida'; hora: string; mentorID: number; scannedByUserID: number; esFechaPlanificada: boolean; scannedBy?: { nombre: string; apellido: string }; }
interface DashboardData { fecha: string; global: boolean; members: Member[]; attendances: TeamAttendance[]; }

function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function TeamAttendanceAdminTab() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonFilter, setSeasonFilter] = useState('global');
  const [date, setDate] = useState(localToday);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { api.get<Season[]>('/seasons').then((response) => setSeasons(response.data)).catch(console.error); }, []);
  useEffect(() => {
    setLoading(true);
    api.get<DashboardData>(`/mentor-attendance/dashboard?fecha=${date}&seasonID=${seasonFilter}`)
      .then((response) => setData(response.data))
      .catch((error) => { console.error('Error cargando resumen de asistencia:', error); setData(null); })
      .finally(() => setLoading(false));
  }, [date, seasonFilter]);

  const summaries = useMemo(() => {
    if (!data) return [];
    const recordsByMember = new Map<number, TeamAttendance[]>();
    for (const record of data.attendances) recordsByMember.set(record.mentorID, [...(recordsByMember.get(record.mentorID) || []), record]);
    return data.members.map((member) => {
      const records = (recordsByMember.get(member.ID) || []).sort((a, b) => a.hora.localeCompare(b.hora));
      const last = records.at(-1);
      return { member, records, last, status: !last ? 'ausente' : last.tipo === 'entrada' ? 'presente' : 'salio' };
    }).filter(({ member }) => `${member.nombre} ${member.apellido}`.toLocaleLowerCase('es-CL').includes(search.trim().toLocaleLowerCase('es-CL')));
  }, [data, search]);

  const stats = useMemo(() => ({
    presentes: summaries.filter((summary) => summary.status === 'presente').length,
    salieron: summaries.filter((summary) => summary.status === 'salio').length,
    ausentes: summaries.filter((summary) => summary.status === 'ausente').length,
    entradas: data?.attendances.filter((record) => record.tipo === 'entrada').length || 0,
    salidas: data?.attendances.filter((record) => record.tipo === 'salida').length || 0,
  }), [summaries, data]);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-surface p-4 shadow">
      <div>
        <label className="mb-1 block text-sm font-medium text-text">Alcance</label>
        <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="global">Asistencia global</option>
          {seasons.map((season) => <option key={season.ID} value={season.ID}>{season.nombre}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text">Fecha</label>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="min-w-48 flex-1">
        <label className="mb-1 block text-sm font-medium text-text">Buscar integrante</label>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o apellido" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {[['Presentes', stats.presentes, 'text-emerald-700'], ['Salieron', stats.salieron, 'text-orange-700'], ['Ausentes', stats.ausentes, 'text-red-700'], ['Entradas', stats.entradas, 'text-violet-700'], ['Salidas', stats.salidas, 'text-blue-700']].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm"><div className={`text-2xl font-bold ${color}`}>{value}</div><div className="mt-1 text-xs text-gray-500">{label}</div></div>)}
    </div>

    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3"><h2 className="font-semibold text-gray-800">Asistencia del equipo</h2><p className="text-xs text-gray-500">{seasonFilter === 'global' ? 'Todos los registros de la fecha seleccionada' : 'Registros de la temporada seleccionada'}</p></div>
      {loading ? <div className="p-8 text-center text-sm text-gray-500">Cargando asistencia…</div> : <div className="divide-y divide-gray-100">
        {summaries.map(({ member, records, last, status }) => <div key={member.ID} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-gray-50">
          <div className={`h-2.5 w-2.5 rounded-full ${status === 'presente' ? 'bg-emerald-500' : status === 'salio' ? 'bg-orange-500' : 'bg-gray-300'}`} />
          <div className="min-w-44 flex-1"><p className="font-medium text-gray-800">{member.nombre} {member.apellido}</p><p className="text-xs text-gray-500">{member.rol === 'admin' ? 'Administrador/a' : 'Mentor/a'}</p></div>
          <div className="text-sm text-gray-600">{records.length ? records.map((record) => `${record.tipo === 'entrada' ? 'Entrada' : 'Salida'} ${record.hora.slice(0, 5)}`).join(' · ') : 'Sin registros'}</div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${status === 'presente' ? 'bg-emerald-100 text-emerald-800' : status === 'salio' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}>{status === 'presente' ? 'Presente' : status === 'salio' ? 'Se retiró' : 'Ausente'}</span>
          {last && <span className="basis-full text-right text-xs text-gray-400">Último registro por {last.scannedBy ? `${last.scannedBy.nombre} ${last.scannedBy.apellido}` : `Usuario #${last.scannedByUserID}`}{!last.esFechaPlanificada ? ' · Fuera de fecha' : ''}</span>}
        </div>)}
        {summaries.length === 0 && <div className="p-8 text-center text-sm text-gray-500">No hay integrantes ni registros para los filtros seleccionados.</div>}
      </div>}
    </section>
  </div>;
}
