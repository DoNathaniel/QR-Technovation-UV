import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { sileo, Toaster } from 'sileo';
import Login from './pages/Login';

export const toast = {
  success: (message: string) => sileo.success({ title: message }),
  error: (message: string) => sileo.error({ title: message }),
  warning: (message: string) => sileo.warning({ title: message }),
  info: (message: string) => sileo.info({ title: message }),
};
import Dashboard from './pages/Dashboard';
import SeasonsPage from './pages/SeasonsPage';
import UsersPage from './pages/UsersPage';
import DatesPage from './pages/DatesPage';
import StudentsPage from './pages/StudentsPage';
import TeamsPage from './pages/TeamsPage';
import AttendancePage from './pages/AttendancePage';
import AttendanceReportPage from './pages/AttendanceReportPage';
import SensitiveDataPage from './pages/SensitiveDataPage';
import StudentImportPage from './pages/StudentImportPage';
import MentorAttendancePage from './pages/MentorAttendancePage';
import MyTeamAttendancePage from './pages/MyTeamAttendancePage';
import UnsubscribeNotificationsPage from './pages/UnsubscribeNotificationsPage';
import MailAuditPage from './pages/MailAuditPage';
import SeasonSelector from './components/SeasonSelector';
import { useEffect, useState } from 'react';
import api from './services/api';
import MaintenancePage from './pages/MaintenancePage';
import ChecklistsPage from './pages/ChecklistsPage';
import { colors } from './config';

function MaintenanceNotice({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="shadow-md" style={{ backgroundColor: '#1e3a5f' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <img src="/escuela-informatica-blanco.png" alt="Escuela de Informática" className="h-10 sm:h-12" />
          <img src="/technovationgirls-chile.png" alt="Technovation Girls Chile" className="h-9 sm:h-10" />
        </div>
      </header>
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center p-5 sm:p-8">
        <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="h-2" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accentAlt})` }} />
          <div className="p-7 text-center sm:p-10">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-primary">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l2.5 1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Sistema de Asistencia</p>
            <h1 className="mt-2 text-2xl font-bold text-primary sm:text-3xl">Estamos preparando las próximas temporadas</h1>
            <p className="mx-auto mt-4 max-w-lg leading-relaxed text-text-muted">Actualmente, la página se encuentra en mantenimiento para futuras temporadas. Vuelve a intentarlo más adelante.</p>
            <button onClick={onLogout} className="mt-7 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90" style={{ backgroundColor: colors.primary }}>Cerrar sesión</button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentSeasonId, temporadas, setCurrentSeason, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  if (user?.rol === 'voluntario' && temporadas.length === 0) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><section className="max-w-md rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold text-gray-800">Sin temporadas asignadas</h1><p className="mt-2 text-sm text-gray-600">Tu cuenta todavía no tiene una temporada asignada. Contacta a un administrador.</p><button onClick={logout} className="mt-6 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">Cerrar sesión</button></section></div>;
  }

  if (temporadas.length > 1 && !currentSeasonId) {
    return (
      <SeasonSelector 
        temporadas={temporadas} 
        onSelect={(seasonId) => {
          setCurrentSeason(seasonId);
        }}
      />
    );
  }

  return <>{children}</>;
}

function AppLayout({ maintenanceEnabled, onMaintenanceChange }: { maintenanceEnabled: boolean; onMaintenanceChange: (enabled: boolean) => void }) {
  const { user, logout, temporadas, currentSeasonId, setCurrentSeason } = useAuth();
  const navigate = useNavigate();
  const [showSeasonModal, setShowSeasonModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/iniciar-sesion');
  };

  const handleSeasonChange = (seasonId: number) => {
    setCurrentSeason(seasonId);
    setShowSeasonModal(false);
  };

  const currentSeason = temporadas.find(t => t.ID === currentSeasonId);

  const userRoleLabels: Record<string, string> = {
    superadmin: 'Super Administrador',
    admin: 'Administrador',
    voluntario: 'Voluntario',
  };

  return (
    <div className="min-h-screen bg-background">
      {maintenanceEnabled && <div className="sticky top-0 z-40 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-950" role="status">Mantenimiento activo: el acceso está limitado a administradores y superadministradores.</div>}
      {/* Header */}
      <header className={`shadow-md sticky z-30 ${maintenanceEnabled ? 'top-9' : 'top-0'}`} style={{ backgroundColor: '#1e3a5f' }}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logos */}
          <div className="flex items-center gap-3">
            <img src="/escuela-informatica-blanco.png" alt="Escuela Informatica" className="h-12" />
            <img src="/technovationgirls-chile.png" alt="Technovation" className="h-10" />
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {temporadas.length > 1 && currentSeason && (
              <button
                onClick={() => setShowSeasonModal(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-white/30 text-white hover:bg-white/10"
              >
                📅 {currentSeason.nombre}
              </button>
            )}
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                {user?.nombre} {user?.apellido}
              </div>
              <div className="text-xs text-white/70">
                {userRoleLabels[user?.rol || 'voluntario']}
              </div>
            </div>

            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="p-2 text-white/70 hover:text-white transition-colors"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="p-4 md:p-6">
        <Routes>
          <Route path="/panel" element={<Dashboard />} />
          <Route path="/temporadas" element={<SeasonsPage />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/fechas" element={<DatesPage />} />
          <Route path="/estudiantes" element={<StudentsPage />} />
          <Route path="/equipos" element={<TeamsPage />} />
          <Route path="/asistencia" element={<AttendancePage />} />
          <Route path="/asistencia-mentores" element={<MentorAttendancePage />} />
          <Route path="/yo" element={<MyTeamAttendancePage />} />
          <Route path="/administracion/checklists" element={['admin', 'superadmin'].includes(user?.rol || '') ? <ChecklistsPage mode="admin" /> : <Navigate to="/mi-checklist" replace />} />
          <Route path="/mi-checklist" element={user?.rol === 'voluntario' ? <ChecklistsPage mode="mentor" /> : <Navigate to="/administracion/checklists" replace />} />
          <Route path="/informe-asistencia" element={<AttendanceReportPage />} />
          <Route path="/administracion/cifrado-datos" element={<SensitiveDataPage />} />
          <Route path="/administracion/importar-estudiantes" element={<StudentImportPage />} />
          <Route path="/administracion/auditoria-correos" element={<MailAuditPage />} />
          <Route path="/administracion/mantenimiento" element={<MaintenancePage onStatusChange={onMaintenanceChange} />} />
          <Route path="*" element={<Navigate to="/panel" replace />} />
        </Routes>
      </main>

      {showSeasonModal && (
        <SeasonSelector 
          temporadas={temporadas} 
          onSelect={handleSeasonChange}
          onClose={() => setShowSeasonModal(false)}
        />
      )}
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, user, logout } = useAuth();
  const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setMaintenanceEnabled(false); return; }
    let active = true;
    const refreshMaintenance = async () => {
      try {
        const response = await api.get<{ enabled: boolean }>('/maintenance/status');
        if (active) setMaintenanceEnabled(Boolean(response.data.enabled));
      } catch {
        if (active) setMaintenanceEnabled(false);
      }
    };
    void refreshMaintenance();
    const timer = window.setInterval(refreshMaintenance, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isAuthenticated]);

  return (
    <Routes>
      <Route path="/notificaciones/desuscribir" element={<UnsubscribeNotificationsPage />} />
      <Route 
        path="/iniciar-sesion" 
        element={isAuthenticated ? <Navigate to="/panel" replace /> : <Login />} 
      />
      <Route 
        path="/*" 
        element={
          isAuthenticated && maintenanceEnabled === null
            ? <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Cargando estado del sistema…</div>
            : maintenanceEnabled && user?.rol === 'voluntario'
              ? <MaintenanceNotice onLogout={logout} />
              : <ProtectedRoute><AppLayout maintenanceEnabled={Boolean(maintenanceEnabled)} onMaintenanceChange={setMaintenanceEnabled} /></ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster />
      <AppRoutes />
    </AuthProvider>
  );
}
