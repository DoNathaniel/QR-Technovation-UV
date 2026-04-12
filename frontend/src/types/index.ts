export interface User {
  ID: number;
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
  ID: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa?: boolean;
}

// NUEVOS TIPOS EQUIPO
export type ODS = 'ODS1'|'ODS2'|'ODS3'|'ODS4'|'ODS5'|'ODS6'|'ODS7'|'ODS8'|'ODS9'|'ODS10'|'ODS11'|'ODS12'|'ODS13'|'ODS14'|'ODS15'|'ODS16'|'ODS17';
export type Categoria = 'Beginner' | 'Junior' | 'Senior';

export interface Team {
  ID: number;
  nombre: string;
  numeroCorrelativo: number;
  seasonID: number;
  ods: ODS;
  categoria: Categoria;
  createdAt: string;
  updatedAt: string;
}

export interface TeamStudent {
  ID: number;
  teamID: number;
  studentID: number;
  seasonID: number;
  createdAt: string;
}

export interface TeamMentor {
  ID: number;
  teamID: number;
  mentorID: number;
  seasonID: number;
  createdAt: string;
}
