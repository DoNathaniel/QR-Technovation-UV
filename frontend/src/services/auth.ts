import api from './api';
import type { LoginCredentials, LoginResponse } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async googleSession(): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/google/session');
    return response.data;
  },


  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentSeasonId');
    localStorage.removeItem('availableSeasons');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getUser(): import('../types').User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getCurrentSeasonId(): number | null {
    const seasonId = localStorage.getItem('currentSeasonId');
    return seasonId ? parseInt(seasonId, 10) : null;
  },

  setCurrentSeasonId(seasonId: number): void {
    localStorage.setItem('currentSeasonId', seasonId.toString());
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
