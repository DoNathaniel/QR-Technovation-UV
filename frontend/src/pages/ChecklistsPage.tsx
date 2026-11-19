import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from '../App';
import type { Team } from '../types';

type ChecklistItemStatus = 'complete' | 'pending' | 'optional' | 'not_applicable';

interface ChecklistItem {
  code: string;
  section: string;
  sectionLabel: string;
  label: string;
  status: ChecklistItemStatus;
  filled: boolean;
}

interface ChecklistSection {
  code: string;
  label: string;
  completedCount: number;
  applicableCount: number;
  percent: number | null;
  items: ChecklistItem[];
}

interface ChecklistProgressToDate {
  sessionNumber: number;
  currentPoint: number | null;
  completedCount: number;
  applicableCount: number;
  percent: number | null;
}

interface ChecklistSummary {
  status: 'unlinked' | 'not_reviewed' | 'reviewed' | 'error';
  fileUrl: string | null;
  items: ChecklistItem[];
  sections: ChecklistSection[];
  completedCount: number;
  applicableCount: number;
  percent: number;
  lastAttemptAt: string | null;
  lastSuccessfulReviewAt: string | null;
  lastError: string | null;
  hasLastSuccessfulResult: boolean;
  progressToDate: ChecklistProgressToDate;
}

interface TeamChecklistRow {
  team: Team;
  checklist: ChecklistSummary;
}

interface ChecklistRunItem {
  ID: number;
  teamID: number;
  teamName: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastError: string | null;
  changes: Array<{ code: string; label: string; from: string; to: string }> | null;
}

interface ChecklistRun {
  ID: number;
  mode?: 'manual' | 'automatic';
  status: 'queued' | 'running' | 'completed' | 'completed_with_errors';
  total: number;
  completed: number;
  failed: number;
  currentTeamName: string | null;
  finishedAt?: string | null;
  items: ChecklistRunItem[];
}

interface ChecklistRunOverview {
  activeRun: ChecklistRun | null;
  lastRun: Pick<ChecklistRun, 'ID' | 'mode' | 'status' | 'total' | 'completed' | 'failed' | 'finishedAt'> | null;
  nextReview: { targetDate: string; scheduledDate: string } | null;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' }).format(date);
}

function statusLabel(status: ChecklistItemStatus, filled: boolean) {
  if (status === 'complete') return 'Completo';
  if (status === 'optional') return filled ? 'Opcional · entregado' : 'Opcional';
  if (status === 'not_applicable') return 'No aplica';
  return 'Pendiente';
}

function itemStatusClass(status: ChecklistItemStatus) {
  if (status === 'complete') return 'bg-green-100 text-green-800';
  if (status === 'optional' || status === 'not_applicable') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-800';
}

function teamStatusLabel(checklist: ChecklistSummary) {
  if (checklist.status === 'unlinked') return 'Sin checklist';
  if (checklist.status === 'not_reviewed') return 'Sin revisión';
  if (checklist.status === 'error') return 'Error de actualización';
  return 'Revisado';
}

function teamStatusClass(checklist: ChecklistSummary) {
  if (checklist.status === 'reviewed' || (checklist.status === 'error' && checklist.hasLastSuccessfulResult)) return 'bg-green-100 text-green-800';
  if (checklist.status === 'error') return 'bg-red-100 text-red-800';
  if (checklist.status === 'not_reviewed') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}

function progressToDateLabel(progress: ChecklistProgressToDate) {
  if (!progress.sessionNumber) return 'Antes de la primera fecha';
  if (!progress.currentPoint) return `Fecha ${progress.sessionNumber} · sin puntos exigibles`;
  return `Fecha ${progress.sessionNumber} · hasta punto ${progress.currentPoint}`;
}

export default function ChecklistsPage({ mode }: { mode: 'admin' | 'mentor' }) {
  const { currentSeasonId } = useAuth();
  const navigate = useNavigate();
  const canManage = mode === 'admin';
  const [rows, setRows] = useState<TeamChecklistRow[]>([]);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyTeamID, setBusyTeamID] = useState<number | null>(null);
  const [selectedTeamID, setSelectedTeamID] = useState<number | null>(null);
  const [run, setRun] = useState<ChecklistRun | null>(null);
  const [runOverview, setRunOverview] = useState<ChecklistRunOverview | null>(null);
  const [startingRun, setStartingRun] = useState(false);
  const [sendingStatusTeamID, setSendingStatusTeamID] = useState<number | null>(null);
  const selectedRow = rows.find((row) => row.team.ID === selectedTeamID) || null;

  useEffect(() => {
    if (selectedTeamID && !rows.some((row) => row.team.ID === selectedTeamID)) setSelectedTeamID(null);
  }, [rows, selectedTeamID]);

  useEffect(() => {
    if (!selectedTeamID) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedTeamID(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedTeamID]);

  const load = useCallback(async () => {
    if (!currentSeasonId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get<TeamChecklistRow[]>(`/checklists?seasonID=${currentSeasonId}`);
      setRows(response.data);
      setUrls((current) => {
        const next = { ...current };
        for (const row of response.data) next[row.team.ID] = row.checklist.fileUrl || '';
        return next;
      });
    } catch {
      setLoadError('No se pudieron cargar los checklists. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [currentSeasonId]);

  useEffect(() => { void load(); }, [load]);

  const loadRun = useCallback(async () => {
    if (!currentSeasonId || !canManage) { setRun(null); setRunOverview(null); return; }
    try {
      const response = await api.get<ChecklistRunOverview>(`/checklists/runs/overview?seasonID=${currentSeasonId}`);
      setRunOverview(response.data);
      setRun(response.data.activeRun);
    } catch { /* La revisión de las filas sigue disponible aunque falle el estado de la cola. */ }
  }, [currentSeasonId, canManage]);

  useEffect(() => { void loadRun(); }, [loadRun]);

  useEffect(() => {
    if (!run || !['queued', 'running'].includes(run.status)) return;
    const timer = window.setInterval(() => {
      void api.get<ChecklistRun>(`/checklists/runs/${run.ID}`).then((response) => {
        setRun(response.data);
        if (['completed', 'completed_with_errors'].includes(response.data.status)) {
          void load();
          void loadRun();
        }
      }).catch(() => {});
    }, 3000);
    return () => window.clearInterval(timer);
  }, [run?.ID, run?.status, load, loadRun]);

  const verifyAll = async () => {
    if (!currentSeasonId) return;
    setStartingRun(true);
    try {
      const response = await api.post<ChecklistRun>('/checklists/verify-all', { seasonID: currentSeasonId });
      setRun(response.data);
      void loadRun();
      toast.success('Revisión masiva iniciada. Esta ejecución manual no envía correos.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo iniciar la revisión masiva.');
    } finally { setStartingRun(false); }
  };

  const saveLink = async (teamID: number) => {
    setBusyTeamID(teamID);
    try {
      await api.put(`/checklists/${teamID}`, { url: urls[teamID] || '' });
      toast.success('Checklist vinculado al equipo');
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo vincular el checklist');
    } finally {
      setBusyTeamID(null);
    }
  };

  const unlink = async (teamID: number) => {
    setBusyTeamID(teamID);
    try {
      await api.delete(`/checklists/${teamID}`);
      toast.success('Checklist desvinculado');
      await load();
    } catch {
      toast.error('No se pudo desvincular el checklist');
    } finally {
      setBusyTeamID(null);
    }
  };

  const refresh = async (teamID: number) => {
    setBusyTeamID(teamID);
    try {
      await api.post(`/checklists/${teamID}/refresh`);
      toast.success('Checklist actualizado');
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar el checklist');
      await load();
    } finally {
      setBusyTeamID(null);
    }
  };

  const sendStatusToMentors = async (teamID: number) => {
    setSendingStatusTeamID(teamID);
    try {
      const response = await api.post<{ queued: number; skipped: number; failed: number; message: string | null }>(`/checklists/${teamID}/send-status`);
      const { queued, skipped, failed, message } = response.data;
      if (queued > 0) toast.success(`Estado encolado para ${queued} mentor${queued === 1 ? '' : 'es'}.${skipped ? ` ${skipped} omitido(s).` : ''}${failed ? ` ${failed} no se pudo encolar.` : ''}`);
      else if (message) toast.warning(message);
      else toast.warning(`No se encolaron correos.${skipped ? ` ${skipped} mentor(es) desuscrito(s).` : ''}${failed ? ` ${failed} con error.` : ''}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo enviar el estado al mentor.');
    } finally {
      setSendingStatusTeamID(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <button type="button" onClick={() => navigate('/panel')} className="text-sm text-gray-600 transition-colors hover:text-violet-700">← Volver al panel</button>
      <header className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Equipos</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{canManage ? 'Administrar checklists' : 'Mi checklist'}</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          {canManage
            ? 'Vincula el archivo de Drive de cada equipo y actualiza manualmente su avance.'
            : 'Consulta el avance de tus equipos asignados y abre el checklist original en Drive.'}
        </p>
      </header>

      {!currentSeasonId && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Selecciona una temporada para ver los equipos.</div>}
      {canManage && currentSeasonId && (
        <section className="space-y-3 rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">Revisión masiva</h2>
              <p className="mt-1 text-sm text-gray-600">Lee todos los checklists vinculados de esta temporada. Las ejecuciones manuales no envían correos.</p>
            </div>
            <button type="button" onClick={() => void verifyAll()} disabled={startingRun || Boolean(run && ['queued', 'running'].includes(run.status))} className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
              {startingRun ? 'Iniciando…' : run && ['queued', 'running'].includes(run.status) ? 'Revisión en curso…' : 'Verificar todos'}
            </button>
          </div>
          <div className="grid gap-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-800">Última revisión masiva</p>
              {runOverview?.lastRun ? (
                <p className="mt-1 text-gray-600">
                  {formatDate(runOverview.lastRun.finishedAt || null) || 'Fecha no disponible'} · {runOverview.lastRun.mode === 'automatic' ? 'Automática' : 'Manual'} · {runOverview.lastRun.completed}/{runOverview.lastRun.total} revisados{runOverview.lastRun.failed ? ` · ${runOverview.lastRun.failed} con error` : ''}
                </p>
              ) : <p className="mt-1 text-gray-500">Todavía no hay revisiones masivas.</p>}
            </div>
            <div>
              <p className="font-semibold text-gray-800">Siguiente revisión automática</p>
              {runOverview?.nextReview ? (
                <p className="mt-1 text-gray-600">
                  {new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' }).format(new Date(`${runOverview.nextReview.scheduledDate}T12:00:00Z`))} a las 19:00, hora de Chile · antes de la fecha {new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' }).format(new Date(`${runOverview.nextReview.targetDate}T12:00:00Z`))}
                </p>
              ) : <p className="mt-1 text-gray-500">No hay otra fecha de temporada programada.</p>}
            </div>
          </div>
          {run && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4" aria-live="polite">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium text-gray-800">{run.status === 'queued' || run.status === 'running' ? `Revisando ${run.currentTeamName || 'equipos en cola'}…` : run.status === 'completed_with_errors' ? 'Revisión terminada con errores' : 'Revisión terminada'}</span>
                <span className="text-gray-600">{run.completed + run.failed} de {run.total} · {run.failed} con error</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-violet-600 transition-all" style={{ width: `${run.total ? Math.min(100, Math.round(((run.completed + run.failed) / run.total) * 100)) : 100}%` }} /></div>
              {run.items?.some((item) => (item.changes?.length || 0) > 0 || item.status === 'failed') && (
                <ul className="mt-3 space-y-1 text-xs text-gray-600">
                  {run.items.filter((item) => (item.changes?.length || 0) > 0 || item.status === 'failed').map((item) => (
                    <li key={item.ID}><strong>{item.teamName}:</strong> {item.status === 'failed' ? `Error después de ${item.attempts} intentos: ${item.lastError}` : item.changes?.map((change) => `${change.code} ${change.label}: ${change.from} → ${change.to}`).join(' · ')}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
      {loadError && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{loadError}</div>}
      {loading ? <div className="py-12 text-center text-sm text-gray-500">Cargando checklists…</div> : null}
      {!loading && !loadError && rows.length === 0 && currentSeasonId && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
          {canManage
            ? 'No hay equipos en esta temporada.'
            : 'No aparecen equipos asignados a tu cuenta en esta temporada. Si esperabas ver uno, pide a administración revisar la asignación del equipo y la temporada seleccionada.'}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
            <span>Equipo</span><span>Estado</span><span>Avance</span>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map(({ team, checklist }) => (
              <button
                key={team.ID}
                type="button"
                onClick={() => setSelectedTeamID(team.ID)}
                className="grid w-full grid-cols-1 gap-2 px-5 py-4 text-left transition-colors hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-gray-900">{team.nombre}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Equipo #{team.numeroCorrelativo} · {team.categoria}</span>
                </span>
                <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${teamStatusClass(checklist)}`}>{teamStatusLabel(checklist)}</span>
                <span className="flex items-center justify-between gap-3 text-sm text-gray-700 sm:min-w-36 sm:justify-end">
                  {checklist.status === 'reviewed' || checklist.hasLastSuccessfulResult
                    ? <span className="text-right">
                      <span className="block">Total {checklist.status === 'error' ? 'último ' : ''}{checklist.percent}%</span>
                      <span className="block text-xs text-gray-500">A la fecha {checklist.progressToDate.percent === null ? '—' : `${checklist.status === 'error' ? 'último ' : ''}${checklist.progressToDate.percent}%`}</span>
                    </span>
                    : <span className="text-xs text-gray-500">Abrir detalle</span>}
                  <span aria-hidden="true" className="text-lg text-violet-600">›</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4 md:p-6"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTeamID(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="checklist-modal-title" className="flex h-[92vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-4 bg-slate-800 px-5 py-4 text-white sm:px-7">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/65">{canManage ? 'Administración de checklist' : 'Mi equipo'}</p>
                <h2 id="checklist-modal-title" className="mt-1 truncate text-xl font-bold sm:text-2xl">{selectedRow.team.nombre}</h2>
                <p className="mt-1 text-sm text-white/70">Equipo #{selectedRow.team.numeroCorrelativo} · {selectedRow.team.categoria}</p>
              </div>
              <button type="button" onClick={() => setSelectedTeamID(null)} aria-label="Cerrar detalle" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl text-white/80 hover:bg-white/10 hover:text-white">×</button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              {(() => {
                const { team, checklist } = selectedRow;
                const busy = busyTeamID === team.ID;
                const reviewedAt = formatDate(checklist.lastSuccessfulReviewAt);
                return (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div>
                        {checklist.status === 'unlinked' && <p className="font-medium text-gray-700">Sin checklist asociado</p>}
                        {checklist.status === 'not_reviewed' && <p className="font-medium text-amber-800">Vinculado, sin revisión</p>}
                        {checklist.status === 'reviewed' && <p className="font-medium text-green-800">Última revisión: {reviewedAt || 'fecha no disponible'}</p>}
                        {checklist.status === 'error' && (
                          <div>
                            <p className="font-medium text-red-800">Error en la última actualización</p>
                            <p className="mt-1 text-sm text-red-700">{checklist.lastError}</p>
                            {checklist.hasLastSuccessfulResult && <p className="mt-1 text-sm text-gray-600">Se conserva la última revisión válida del {reviewedAt || 'fecha no disponible'}.</p>}
                          </div>
                        )}
                      </div>
                      {(checklist.status === 'reviewed' || checklist.hasLastSuccessfulResult) && (
                        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
                          <div className="rounded-lg bg-white px-4 py-3 text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avance total</p>
                            <p className="text-3xl font-bold text-slate-800">{checklist.status === 'error' ? `Último ${checklist.percent}%` : `${checklist.percent}%`}</p>
                            <p className="text-sm text-gray-600">{checklist.completedCount} de {checklist.applicableCount} ítems aplicables</p>
                          </div>
                          <div className="rounded-lg bg-white px-4 py-3 text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Avance hasta la fecha</p>
                            <p className="mt-1 text-sm font-medium text-gray-700">{progressToDateLabel(checklist.progressToDate)}</p>
                            <p className="text-3xl font-bold text-violet-700">{checklist.progressToDate.percent === null ? '—' : `${checklist.status === 'error' ? 'Último ' : ''}${checklist.progressToDate.percent}%`}</p>
                            <p className="text-sm text-gray-600">{checklist.progressToDate.applicableCount ? `${checklist.progressToDate.completedCount} de ${checklist.progressToDate.applicableCount} ítems exigibles` : 'Sin puntos exigibles todavía'}</p>
                          </div>
                        </div>
                      )}
                      {checklist.fileUrl && <a href={checklist.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">Abrir checklist</a>}
                    </div>

                    {canManage && (
                      <div className="rounded-xl border border-gray-200 p-4 sm:p-5">
                        <label htmlFor={`checklist-url-${team.ID}`} className="mb-1 block text-sm font-semibold text-gray-800">Enlace de Google Drive o Google Sheets</label>
                        <p className="mb-3 text-xs text-gray-500">El archivo debe estar visible para cualquier persona con el enlace.</p>
                        <div className="flex flex-col gap-2 lg:flex-row">
                          <input
                            id={`checklist-url-${team.ID}`}
                            value={urls[team.ID] || ''}
                            onChange={(event) => setUrls((current) => ({ ...current, [team.ID]: event.target.value }))}
                            placeholder="https://drive.google.com/..."
                            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                          />
                          <button type="button" onClick={() => void saveLink(team.ID)} disabled={busy || !(urls[team.ID] || '').trim()} className="rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar enlace'}</button>
                          {checklist.fileUrl && <button type="button" onClick={() => void unlink(team.ID)} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Desvincular</button>}
                          {checklist.fileUrl && <button type="button" onClick={() => void refresh(team.ID)} disabled={busy} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{busy ? 'Actualizando…' : 'Actualizar'}</button>}
                          {checklist.fileUrl && <button type="button" onClick={() => void sendStatusToMentors(team.ID)} disabled={busy || sendingStatusTeamID === team.ID || checklist.status !== 'reviewed'} title={checklist.status !== 'reviewed' ? 'Actualiza el checklist antes de enviar su estado.' : undefined} className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{sendingStatusTeamID === team.ID ? 'Encolando…' : 'Enviar estado al mentor'}</button>}
                        </div>
                      </div>
                    )}

                    {checklist.sections.length > 0 ? (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {checklist.sections.map((section) => (
                          <section key={section.code} className="overflow-hidden rounded-xl border border-gray-200">
                            <header className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-3">
                              <h3 className="font-semibold text-gray-800">{section.code}. {section.label}</h3>
                              <span className="text-sm text-gray-600">{section.applicableCount === 0 ? 'Sin ítems aplicables' : `${section.completedCount}/${section.applicableCount} · ${section.percent}%`}</span>
                            </header>
                            <ul className="divide-y divide-gray-100">
                              {section.items.map((item) => (
                                <li key={item.code} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                                  <span className="text-gray-700"><span className="mr-2 text-xs text-gray-400">{item.code}</span>{item.label}</span>
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${itemStatusClass(item.status)}`}>{statusLabel(item.status, item.filled)}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                        <p className="font-semibold text-gray-700">
                          {checklist.status === 'unlinked'
                            ? canManage ? 'Este equipo todavía no tiene un checklist vinculado.' : 'Administración aún no ha vinculado el checklist de este equipo.'
                            : checklist.status === 'not_reviewed'
                              ? canManage ? 'El enlace está guardado, pero todavía no se ha realizado la primera revisión.' : 'El checklist está vinculado, pero todavía no se ha realizado la primera revisión.'
                              : 'No hay un resultado de revisión disponible.'}
                        </p>
                        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
                          {checklist.status === 'unlinked'
                            ? canManage ? 'Agrega el enlace público de Drive en el campo de arriba y guárdalo. Luego pulsa «Actualizar» para cargar el avance.' : 'Cuando administración agregue el enlace de Drive y actualice el checklist, aquí aparecerá el avance por sección e ítem.'
                            : checklist.status === 'not_reviewed'
                              ? canManage ? 'Pulsa «Actualizar» arriba para cargar el avance por sección e ítem.' : 'Pide a administración que use «Actualizar» en la ficha del equipo para cargar el avance.'
                              : checklist.lastError || 'El avance aparecerá aquí después de una lectura exitosa.'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
