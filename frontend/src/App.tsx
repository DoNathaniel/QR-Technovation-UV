import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SeasonsPage from './pages/SeasonsPage';
import UsersPage from './pages/UsersPage';
import DatesPage from './pages/DatesPage';
import SeasonSelector from './components/SeasonSelector';
import { colors } from './config';
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
  const { logout, temporadas, currentSeasonId, setCurrentSeason } = useAuth();
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

  return (
    <div className="min-h-screen bg-background">
      <header className="shadow-md" style={{ backgroundColor: colors.primary }}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <img src="/technovationgirls-chile.png" alt="Technovation" className="h-10 w-auto" />
            <div className="flex items-center gap-3">
              {temporadas.length > 1 && currentSeason && (
                <button 
                  onClick={() => setShowSeasonModal(true)}
                  className="text-white text-sm px-3 py-1 rounded"
                  style={{ backgroundColor: colors.secondary }}
                >
                  {currentSeason.nombre}
                </button>
              )}
              <button 
                onClick={handleLogout}
                className="text-white text-sm hover:opacity-80"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Routes>
          <Route path="/panel" element={<Dashboard />} />
          <Route path="/temporadas" element={<SeasonsPage />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/fechas" element={<DatesPage />} />
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