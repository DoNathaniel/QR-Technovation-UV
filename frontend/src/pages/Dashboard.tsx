import { useState, useEffect, useRef } from 'react';
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
  const fetchedRef = useRef(false);

  const roleLabels = {
    superadmin: 'Super Administrador/a',
    admin: 'Administrador/a',
    voluntario: 'Mentora',
  };

  const canAccess = (requiredRoles: string[]) => {
    if (!user) return false;
    return requiredRoles.includes(user.rol);
  };

  useEffect(() => {
    if (!currentSeasonId || fetchedRef.current) return;
    
    fetchedRef.current = true;
    setLoading(true);
    api.get(`/attendance/stats?seasonID=${currentSeasonId}`)
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [currentSeasonId]);

  return (
    <div className="space-y-6">
      <div 
        className="rounded-xl p-8 text-white text-center"
        style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)` }}
      >
        <h2 className="text-3xl font-bold mb-2">
          Hola, {user?.nombre}! 👋
        </h2>
        <p className="opacity-90 text-lg">
          {roleLabels[user?.rol || 'voluntario']} · {currentSeason?.nombre}
        </p>
      </div>

      {currentSeasonId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl font-bold" style={{ color: colors.primary }}>
              {loading ? '...' : stats?.totalEstudiantes || 0}
            </div>
            <div className="text-sm text-gray-500 mt-2">Total Estudiantes</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl font-bold" style={{ color: colors.success }}>
              {loading ? '...' : stats?.presentesHoy || 0}
            </div>
            <div className="text-sm text-gray-500 mt-2">Presentes Hoy</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl font-bold" style={{ color: colors.secondary }}>
              {loading ? '...' : stats?.entradasHoy || 0}
            </div>
            <div className="text-sm text-gray-500 mt-2">Entradas Hoy</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md transition-shadow">
            <div className="text-4xl font-bold" style={{ color: colors.accent }}>
              {loading ? '...' : stats?.salidasHoy || 0}
            </div>
            <div className="text-sm text-gray-500 mt-2">Salidas Hoy</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Link 
          to="/asistencia" 
          className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: colors.accent + '20' }}>
              <svg className="w-7 h-7" style={{ color: colors.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">Panel de Asistencia</h3>
              <p className="text-sm text-gray-500">Escanea QR y registra asistencia</p>
            </div>
          </div>
        </Link>

        <Link 
          to="/informe-asistencia" 
          className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#6366f1' + '20' }}>
              <svg className="w-7 h-7" style={{ color: '#6366f1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">Informe de Asistencia</h3>
              <p className="text-sm text-gray-500">Ver historial completo de asistencia</p>
            </div>
          </div>
        </Link>

        {canAccess(['superadmin', 'admin']) && (
          <Link 
            to="/estudiantes" 
            className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-purple-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: colors.secondary + '20' }}>
                <svg className="w-7 h-7" style={{ color: colors.secondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-800 group-hover:text-purple-600 transition-colors">Lista de Estudiantes</h3>
                <p className="text-sm text-gray-500">Ver y gestionar estudiantes</p>
              </div>
            </div>
          </Link>
        )}

        {canAccess(['superadmin']) && (
          <>
            <Link 
              to="/equipos" 
              className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-green-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: colors.primary + '20' }}>
                  <svg className="w-7 h-7" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800 group-hover:text-green-600 transition-colors">Gestión de Equipos</h3>
                  <p className="text-sm text-gray-500">Crear equipos y mentores</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/temporadas" 
              className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-yellow-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: colors.warning + '20' }}>
                  <svg className="w-7 h-7" style={{ color: colors.warning }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800 group-hover:text-yellow-600 transition-colors">Temporadas</h3>
                  <p className="text-sm text-gray-500">Crear y editar temporadas</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/usuarios" 
              className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-pink-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: colors.primary + '20' }}>
                  <svg className="w-7 h-7" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800 group-hover:text-pink-600 transition-colors">Usuarios</h3>
                  <p className="text-sm text-gray-500">Gestionar usuarios del sistema</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/fechas" 
              className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: colors.primary + '20' }}>
                  <svg className="w-7 h-7" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors">Fechas</h3>
                  <p className="text-sm text-gray-500">Definir fechas por temporada</p>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
