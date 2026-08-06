import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../App';

type Section = { total: number; pending: number };
type Status = { students: Section; guardians: Section; users: Section };
type Log = { ID: number; userID: number; dryRun: boolean; processed: number; failed: number; createdAt: string };

export default function SensitiveDataPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [statusResponse, logsResponse] = await Promise.all([
        api.get<Status>('/admin/sensitive-data/status'),
        api.get<Log[]>('/admin/sensitive-data/logs'),
      ]);
      setStatus(statusResponse.data);
      setLogs(logsResponse.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No fue posible cargar el estado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const migrate = async (dryRun: boolean) => {
    if (!dryRun && !window.confirm('Esto cifrará hasta 100 registros pendientes por cada tabla y eliminará sus valores en texto plano. ¿Deseas continuar?')) return;
    setRunning(true);
    try {
      const response = await api.post('/admin/sensitive-data/migrate', { dryRun, batchSize: 100 });
      const { processed, failed } = response.data;
      toast.success(dryRun ? `Simulación lista: ${processed} registros serían procesados.` : `Lote terminado: ${processed} registros cifrados.`);
      if (failed) toast.warning(`${failed} registros presentaron errores; revisa la auditoría.`);
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No fue posible ejecutar el lote');
    } finally {
      setRunning(false);
    }
  };

  if (user?.rol !== 'superadmin') return <Navigate to="/panel" replace />;
  const rows: Array<[string, Section | undefined]> = [
    ['Estudiantes', status?.students],
    ['Apoderados', status?.guardians],
    ['Usuarios', status?.users],
  ];
  const pending = rows.reduce((sum, [, section]) => sum + (section?.pending || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate('/panel')} className="text-text-muted hover:text-text text-sm">← Volver al panel</button>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Cifrado de datos sensibles</h1>
        <p className="text-gray-600 mt-2">Cifra correos y RUT existentes. Los nuevos registros ya se guardan cifrados; la API los descifra únicamente para usuarios autorizados.</p>
        <p className="mt-4 rounded-lg bg-amber-50 text-amber-800 p-3 text-sm">Antes de migrar, verifica que exista un respaldo de la base de datos y que las claves de cifrado estén configuradas y respaldadas fuera del servidor.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map(([label, section]) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '—' : section?.pending ?? 0}</p>
            <p className="text-xs text-gray-500">pendientes de {section?.total ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-gray-800">Migración por lotes</h2><p className="text-sm text-gray-500">Cada ejecución procesa como máximo 100 pendientes de cada tabla.</p></div>
        <div className="flex gap-3">
          <button disabled={running || loading || pending === 0} onClick={() => migrate(true)} className="px-4 py-2 rounded-lg border border-blue-600 text-blue-700 disabled:opacity-50">Simular</button>
          <button disabled={running || loading || pending === 0} onClick={() => migrate(false)} className="px-4 py-2 rounded-lg bg-blue-700 text-white disabled:opacity-50">{running ? 'Procesando…' : 'Cifrar siguiente lote'}</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-semibold text-gray-800">Auditoría reciente</h2></div>
        <table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Tipo</th><th className="p-3 text-right">Procesados</th><th className="p-3 text-right">Errores</th></tr></thead><tbody>
          {logs.length === 0 ? <tr><td colSpan={4} className="p-5 text-center text-gray-500">Sin ejecuciones registradas.</td></tr> : logs.map(log => <tr key={log.ID} className="border-t"><td className="p-3">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3">{log.dryRun ? 'Simulación' : 'Migración'}</td><td className="p-3 text-right">{log.processed}</td><td className="p-3 text-right">{log.failed}</td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}
