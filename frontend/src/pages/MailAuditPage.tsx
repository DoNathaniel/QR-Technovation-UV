import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

type AuditStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'skipped_unsubscribed';

interface AuditMail {
  ID: number;
  recipientEmail: string;
  subject: string;
  category: string;
  status: AuditStatus;
  relatedEntityType: string | null;
  relatedEntityID: number | null;
  studentID: number | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  lockedAt: string | null;
  sentAt: string | null;
  providerMessageID: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  hasHtmlBody?: boolean;
}

interface Pagination { page: number; pageSize: number; total: number; totalPages: number; }

const statusLabels: Record<AuditStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  sent: 'Enviado',
  failed: 'Fallido',
  skipped_unsubscribed: 'Omitido: desuscrito',
};

const statusClasses: Record<AuditStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  skipped_unsubscribed: 'bg-gray-200 text-gray-700',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    student_attendance: 'Asistencia estudiante',
    student_qr: 'QR estudiante',
    mentor_attendance: 'Asistencia mentor/a',
    mentor_qr: 'QR mentor/a',
  };
  return labels[category] || category;
}

export default function MailAuditPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditMail[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [filterOptions, setFilterOptions] = useState<{ statuses: AuditStatus[]; categories: string[] }>({ statuses: [], categories: [] });
  const [filters, setFilters] = useState({ status: '', category: '', recipient: '', dateFrom: '', dateTo: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AuditMail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const canAccess = user?.rol === 'superadmin' || user?.rol === 'admin';

  useEffect(() => {
    if (!canAccess) return;
    api.get('/admin/mail-audit/filters')
      .then(({ data }) => setFilterOptions(data))
      .catch(() => setError('No fue posible cargar los filtros de auditoría.'));
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    setLoading(true);
    setError('');
    api.get('/admin/mail-audit', { params: { ...filters, page: pagination.page, pageSize: pagination.pageSize } })
      .then(({ data }) => {
        setRows(data.data);
        setPagination(data.pagination);
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'No fue posible cargar la auditoría de correos.'))
      .finally(() => setLoading(false));
  }, [canAccess, filters, pagination.page, pagination.pageSize]);

  if (!canAccess) return <Navigate to="/panel" replace />;

  const updateFilter = (name: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setError('');
    try {
      const { data } = await api.get<AuditMail>(`/admin/mail-audit/${id}`);
      setSelected(data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'No fue posible cargar el detalle del correo.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Auditoría de correos</h1>
        <p className="mt-1 text-gray-600">Consulta los envíos, reintentos, fallos y notificaciones omitidas.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos los estados</option>
            {filterOptions.statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
          <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Todos los tipos</option>
            {filterOptions.categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}
          </select>
          <input value={filters.recipient} onChange={(event) => updateFilter('recipient', event.target.value)} placeholder="Buscar correo" type="search" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} aria-label="Fecha desde" type="date" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} aria-label="Fecha hasta" type="date" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
          <span className="text-sm text-gray-600">{pagination.total} registro{pagination.total === 1 ? '' : 's'}</span>
          {detailLoading && <span className="text-sm text-gray-500">Cargando detalle…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Destinatario</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Intentos</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Cargando auditoría…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No hay correos que coincidan con los filtros.</td></tr>}
              {!loading && rows.map((mail) => (
                <tr key={mail.ID} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(mail.createdAt)}</td>
                  <td className="max-w-56 truncate px-4 py-3 font-medium text-gray-800" title={mail.recipientEmail}>{mail.recipientEmail}</td>
                  <td className="px-4 py-3 text-gray-600">{categoryLabel(mail.category)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[mail.status]}`}>{statusLabels[mail.status]}</span></td>
                  <td className="px-4 py-3 text-gray-600">{mail.attempts}/{mail.maxAttempts}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => openDetail(mail.ID)} className="font-medium text-blue-700 hover:text-blue-900">Ver detalle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
          <button type="button" disabled={pagination.page <= 1 || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="rounded border border-gray-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
          <span className="text-gray-600">Página {pagination.page} de {pagination.totalPages}</span>
          <button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="rounded border border-gray-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Detalle de correo">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-800">Detalle de correo #{selected.ID}</h2><p className="mt-1 text-sm text-gray-500">{selected.subject}</p></div><button type="button" onClick={() => setSelected(null)} className="text-2xl leading-none text-gray-500 hover:text-gray-800" aria-label="Cerrar">×</button></div>
            <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
              <div><dt className="text-gray-500">Destinatario</dt><dd className="mt-1 break-all font-medium text-gray-800">{selected.recipientEmail}</dd></div>
              <div><dt className="text-gray-500">Estado</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[selected.status]}`}>{statusLabels[selected.status]}</span></dd></div>
              <div><dt className="text-gray-500">Tipo</dt><dd className="mt-1 text-gray-800">{categoryLabel(selected.category)}</dd></div>
              <div><dt className="text-gray-500">Intentos</dt><dd className="mt-1 text-gray-800">{selected.attempts} de {selected.maxAttempts}</dd></div>
              <div><dt className="text-gray-500">Creado</dt><dd className="mt-1 text-gray-800">{formatDate(selected.createdAt)}</dd></div>
              <div><dt className="text-gray-500">Enviado</dt><dd className="mt-1 text-gray-800">{formatDate(selected.sentAt)}</dd></div>
              <div><dt className="text-gray-500">Próximo intento</dt><dd className="mt-1 text-gray-800">{formatDate(selected.nextAttemptAt)}</dd></div>
              <div><dt className="text-gray-500">Relacionado</dt><dd className="mt-1 text-gray-800">{selected.relatedEntityType && selected.relatedEntityID ? `${selected.relatedEntityType} #${selected.relatedEntityID}` : '—'}</dd></div>
              {selected.studentID && <div><dt className="text-gray-500">Estudiante</dt><dd className="mt-1 text-gray-800">#{selected.studentID}</dd></div>}
            </dl>
            {selected.lastError && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4"><h3 className="font-semibold text-red-800">Motivo / error</h3><p className="mt-2 break-words whitespace-pre-wrap text-sm text-red-700">{selected.lastError}</p></div>}
            <p className="mt-6 text-xs text-gray-500">Por seguridad, el contenido del correo y sus enlaces no se muestran en esta auditoría.</p>
          </div>
        </div>
      )}
    </div>
  );
}
