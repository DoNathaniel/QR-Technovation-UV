import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth';
import type { AuthState, Season } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentSeason: (seasonId: number) => void;
  temporadas: Season[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    currentSeasonId: null,
  });
  const [temporadas, setTemporadas] = useState<Season[]>([]);

  useEffect(() => {
    const token = authService.getToken();
    const user = authService.getUser();
    const currentSeasonId = authService.getCurrentSeasonId();

    if (token && user) {
      setState({
        user,
        token,
        isAuthenticated: true,
        currentSeasonId,
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    setState({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
      currentSeasonId: response.temporadas[0]?.id || null,
    });
    
    setTemporadas(response.temporadas);
    
    if (response.temporadas.length > 0) {
      localStorage.setItem('currentSeasonId', response.temporadas[0].id.toString());
    }
  };

  const logout = () => {
    authService.logout();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      currentSeasonId: null,
    });
    setTemporadas([]);
  };

  const setCurrentSeason = (seasonId: number) => {
    authService.setCurrentSeasonId(seasonId);
    setState(prev => ({ ...prev, currentSeasonId: seasonId }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setCurrentSeason, temporadas }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}