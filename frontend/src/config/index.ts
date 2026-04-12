export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
export const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || 'http://51.222.141.196:1011/'

export const colors = {
  school: {
    dark: '#1B3A59',
    light: '#3D7EB5',
    white: '#FFFFFF',
  },
  tng: {
    pink: '#D4007A',
    purple: '#7B2D8E',
    teal: '#00A19C',
    white: '#FFFFFF',
  },
  primary: '#1B3A59',
  secondary: '#3D7EB5',
  accent: '#D4007A',
  accentAlt: '#7B2D8E',
  teal: '#00A19C',
  success: '#38a169',
  warning: '#d69e2e',
  danger: '#e53e3e',
  surface: '#ffffff',
  background: '#f7fafc',
  text: '#1a202c',
  textMuted: '#718096',
}