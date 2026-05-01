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

// TIPOS ASISTENCIA
export interface Student {
  ID: number;
  nombres: string;
  apellidos: string;
  email: string | null;
  fechaNac: string | null;
  rut: string;
  categoria: Categoria;
  seasonID: number;
  retiradoApoderado: boolean;
  datosApoderado: Record<string, unknown> | null;
  guardianID: number | null;
  teamID?: number | null;
  teamNombre?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  ID: number;
  tipo: 'entrada' | 'salida' | 'justificado';
  hora: string;
  studentID: number;
  seasonDateID: number;
  userID: number;
  createdAt: string;
  student?: Student;
  requeridoApoderado?: boolean;
  sisters?: { ID: number; nombres: string; apellidos: string }[];
  justificacion?: string;
  retiradoApoderado?: boolean;
  fecha?: string;
}

export interface AttendanceStats {
  totalEstudiantes: number;
  presentesHoy: number;
  entradasHoy: number;
  salidasHoy: number;
}
