import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../App';

interface MaintenanceStatus {
  enabled: boolean;
  updatedAt: string | null;
}

interface MaintenancePageProps {
  onStatusChange: (enabled: boolean) => void;
}

export default function MaintenancePage({ onStatusChange }: MaintenancePageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get<MaintenanceStatus>('/maintenance/status');
      setStatus(response.data);
      onStatusChange(response.data.enabled);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No fue posible consultar el mantenimiento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const update = async (enabled: boolean) => {
    setSaving(true);
    try {
      const response = await api.put<MaintenanceStatus>('/maintenance/status', { enabled });
      setStatus(response.data);
      onStatusChange(response.data.enabled);
      toast.success(enabled ? 'Modo de mantenimiento activado.' : 'Modo de mantenimiento desactivado.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No fue posible actualizar el mantenimiento.');
    } finally {
      setSaving(false);
    }
  };

  if (user?.rol !== 'superadmin') return <Navigate to="/panel" replace />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button onClick={() => navigate('/panel')} className="text-sm text-text-muted hover:text-text">← Volver al panel</button>
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Mantenimiento</h1>
        <p className="mt-2 text-sm text-gray-600">Cuando se activa, las cuentas normales no pueden entrar al sistema. Los administradores y superadministradores conservan el acceso y ven un aviso permanente.</p>
        {loading ? <p className="mt-6 text-sm text-gray-500">Consultando estado…</p> : (
          <div className="mt-6 rounded-lg border p-4">
            <p className="font-semibold text-gray-800">Estado: <span className={status?.enabled ? 'text-amber-700' : 'text-emerald-700'}>{status?.enabled ? 'Activo' : 'Inactivo'}</span></p>
            <p className="mt-1 text-sm text-gray-500">{status?.enabled ? 'Los usuarios normales verán el aviso de mantenimiento.' : 'El sistema está disponible para las cuentas con acceso.'}</p>
            <button type="button" onClick={() => void update(!status?.enabled)} disabled={saving || !status}
              className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${status?.enabled ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700'}`}>
              {saving ? 'Guardando…' : status?.enabled ? 'Desactivar mantenimiento' : 'Activar mantenimiento'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
