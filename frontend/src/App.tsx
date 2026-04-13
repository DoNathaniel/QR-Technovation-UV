import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SeasonsPage from './pages/SeasonsPage';
import UsersPage from './pages/UsersPage';
import DatesPage from './pages/DatesPage';
import StudentsPage from './pages/StudentsPage';
import TeamsPage from './pages/TeamsPage';
import AttendancePage from './pages/AttendancePage';
import AttendanceReportPage from './pages/AttendanceReportPage';
import SeasonSelector from './components/SeasonSelector';
import { useState } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentSeasonId, temporadas, setCurrentSeason } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/iniciar-sesion" replace />;
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

function AppLayout() {
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
      {/* Header */}
      <header className="shadow-md sticky top-0 z-30" style={{ backgroundColor: '#1e3a5f' }}>
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
          <Route path="/informe-asistencia" element={<AttendanceReportPage />} />
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
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/iniciar-sesion" 
        element={isAuthenticated ? <Navigate to="/panel" replace /> : <Login />} 
      />
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}