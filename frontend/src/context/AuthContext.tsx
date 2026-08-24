import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth';
import type { AuthState, Season } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
  const [temporadas, setTemporadas] = useState<Season[]>(() => {
    const stored = localStorage.getItem('availableSeasons');
    if (!stored) return [];
    try {
      return JSON.parse(stored) as Season[];
    } catch {
      return [];
    }
  });

  const persistSeasons = (seasons: Season[]) => {
    setTemporadas(seasons);
    localStorage.setItem('availableSeasons', JSON.stringify(seasons));
  };

  const getValidSeasonId = (seasons: Season[], seasonId: number | null) => {
    if (seasonId && seasons.some((season) => season.ID === seasonId)) {
      return seasonId;
    }
    return seasons[0]?.ID ?? null;
  };

  useEffect(() => {
    const token = authService.getToken();
    const user = authService.getUser();
    const currentSeasonId = authService.getCurrentSeasonId();

    if (token && user) {
      const validSeasonId = getValidSeasonId(temporadas, currentSeasonId);
      setState({
        user,
        token,
        isAuthenticated: true,
        currentSeasonId: validSeasonId,
      });
      if (validSeasonId !== currentSeasonId) {
        if (validSeasonId !== null) {
          localStorage.setItem('currentSeasonId', validSeasonId.toString());
        } else {
          localStorage.removeItem('currentSeasonId');
        }
      }
    }
  }, []);

  const persistLogin = (response: Awaited<ReturnType<typeof authService.login>>) => {
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    persistSeasons(response.temporadas);

    const currentSeasonId = getValidSeasonId(response.temporadas, response.temporadas[0]?.ID ?? null);
    
    setState({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
      currentSeasonId,
    });
    
    if (currentSeasonId !== null) {
      localStorage.setItem('currentSeasonId', currentSeasonId.toString());
    } else {
      localStorage.removeItem('currentSeasonId');
    }
  };

  const login = async (email: string, password: string) => {
    persistLogin(await authService.login({ email, password }));
  };

  const loginWithGoogle = async () => {
    persistLogin(await authService.googleSession());
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
    if (temporadas.length > 0 && !temporadas.some((season) => season.ID === seasonId)) {
      return;
    }
    authService.setCurrentSeasonId(seasonId);
    setState(prev => ({ ...prev, currentSeasonId: seasonId }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithGoogle, logout, setCurrentSeason, temporadas }}>
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
