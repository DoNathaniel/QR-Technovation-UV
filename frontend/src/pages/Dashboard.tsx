import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../config';
import api from '../services/api';

interface AttendanceStats {
  totalEstudiantes: number;
  presentesHoy: number;
  entradasHoy: number;
  salidasHoy: number;
}

export default function Dashboard() {
  const { user, currentSeasonId, temporadas } = useAuth();
  const currentSeason = temporadas.find(t => t.ID === currentSeasonId);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);

  const roleLabels = {
    superadmin: 'Super Administrador',
    admin: 'Administrador',
    voluntario: 'Voluntario',
  };

  const canAccess = (requiredRoles: string[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.rol);
  };

  useEffect(() => {
    if (currentSeasonId) {
      setLoading(true);
      api.get(`/attendance/stats?seasonID=${currentSeasonId}`)
        .then(res => setStats(res.data))
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
    }
  }, [currentSeasonId]);

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-text mb-2">
          Bienvenido, {user?.nombre} {user?.apellido}
        </h2>
        <p className="text-text-muted">
          Rol: <span className="font-medium">{roleLabels[user?.rol || 'voluntario']}</span>
        </p>
        {currentSeason && (
          <p className="text-text-muted mt-1">
            Temporada: <span className="font-medium">{currentSeason.nombre}</span>
          </p>
        )}
      </div>

      {currentSeasonId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold" style={{ color: colors.primary }}>
              {loading ? '...' : stats?.totalEstudiantes || 0}
            </div>
            <div className="text-sm text-text-muted mt-1">Total Estudiantes</div>
          </div>
          <div className="bg-surface rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold" style={{ color: colors.success }}>
              {loading ? '...' : stats?.presentesHoy || 0}
            </div>
            <div className="text-sm text-text-muted mt-1">Presentes Hoy</div>
          </div>
          <div className="bg-surface rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold" style={{ color: colors.secondary }}>
              {loading ? '...' : stats?.entradasHoy || 0}
            </div>
            <div className="text-sm text-text-muted mt-1">Entradas Hoy</div>
          </div>
          <div className="bg-surface rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold" style={{ color: colors.accent }}>
              {loading ? '...' : stats?.salidasHoy || 0}
            </div>
            <div className="text-sm text-text-muted mt-1">Salidas Hoy</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-text">Panel de Asistencia</h3>
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-text-muted">
              Voluntario / Admin / Superadmin
            </span>
          </div>
          <p className="text-text-muted text-sm mb-4">Escanea QR y gestiona la asistencia en tiempo real</p>
          <Link 
            to="/asistencia"
            className="inline-block px-4 py-2 rounded text-white text-sm"
            style={{ backgroundColor: colors.accent }}
          >
            Ir al Panel
          </Link>
        </div>

        {canAccess(['superadmin', 'admin']) && (
          <div className="bg-surface rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-text">Lista de Estudiantes</h3>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-text-muted">
                Admin / Superadmin
              </span>
            </div>
            <p className="text-text-muted text-sm mb-4">Ver y gestionar estudiantes</p>
            <Link 
              to="/estudiantes"
              className="inline-block px-4 py-2 rounded text-white text-sm"
              style={{ backgroundColor: colors.secondary }}
            >
              Ver Estudiantes
            </Link>
          </div>
        )}

        {canAccess(['superadmin']) && (
          <>
            <div className="bg-surface rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-text">Gestión de Temporadas</h3>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-text-muted">
                  Superadmin
                </span>
              </div>
              <p className="text-text-muted text-sm mb-4">Crear y editar temporadas</p>
              <Link 
                to="/temporadas"
                className="inline-block px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: colors.primary }}
              >
                Gestionar
              </Link>
            </div>

            <div className="bg-surface rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-text">Gestión de Usuarios</h3>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-text-muted">
                  Superadmin
                </span>
              </div>
              <p className="text-text-muted text-sm mb-4">Crear y editar usuarios del sistema</p>
              <Link 
                to="/usuarios"
                className="inline-block px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: colors.primary }}
              >
                Gestionar
              </Link>
            </div>
          </>
        )}

        {canAccess(['superadmin']) && (
          <div className="bg-surface rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-text">Fechas de Asistencia</h3>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-text-muted">
                Superadmin
              </span>
            </div>
            <p className="text-text-muted text-sm mb-4">Definir fechas predefinidas por temporada</p>
            <Link 
              to="/fechas"
              className="inline-block px-4 py-2 rounded text-white text-sm"
              style={{ backgroundColor: colors.primary }}
            >
              Gestionar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}