export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'voluntario';
  temporadas: number[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  currentSeasonId: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  temporadas: Season[];
}

export interface Season {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
}