import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { colors } from '../config';
import { API_URL } from '../config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordStep, setShowPasswordStep] = useState(false);
  
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleResult = params.get('google');
    const googleError = params.get('oauth_error');
    if (!googleResult && !googleError) return;

    window.history.replaceState({}, '', '/iniciar-sesion');
    if (googleError) {
      setError(googleError === 'google_not_authorized'
        ? 'Tu cuenta de Google no tiene acceso a este sistema.'
        : 'No fue posible iniciar sesión con Google. Intenta nuevamente.');
      return;
    }

    setLoading(true);
    loginWithGoogle()
      .then(() => navigate('/panel'))
      .catch(() => setError('La sesión de inicio de sesión expiró. Intenta nuevamente.'))
      .finally(() => setLoading(false));
  }, [loginWithGoogle, navigate]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowPasswordStep(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/panel');
    } catch (err) {
      setError('Credenciales inválidas. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <img 
              src="/uv.png" 
              alt="UV Logo" 
              className="w-24 h-24 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-primary">Sistema de Asistencia</h1>
            <p className="text-text-muted mt-2">Ingresa tus credenciales</p>
          </div>

          <form onSubmit={showPasswordStep ? handleSubmit : handleEmailSubmit}>
            {error && (
              <div className="bg-red-100 border border-danger text-danger px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {!showPasswordStep ? (
              <>
                <div className="mb-6">
                  <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-accent text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                  style={{ backgroundColor: colors.accent }}
                >
                  Siguiente
                </button>
              </>
            ) : (
              <>
                <p className="text-text-muted mb-4">
                  Iniciarás sesión con <span className="font-medium text-text break-all">{email}</span>
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setPassword('');
                    setShowPasswordStep(false);
                  }}
                  className="text-sm text-secondary hover:underline mb-4"
                >
                  Usar otro correo
                </button>

                <div className="mb-6">
                  <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-white py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: colors.accent }}
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </>
            )}
          </form>

          <div className="flex items-center gap-3 my-6" aria-hidden="true">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-sm text-text-muted">o</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => window.location.assign(`${API_URL}/auth/google`)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-text py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label="Iniciar sesión con Google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.51h3.14c1.84-1.7 2.91-4.2 2.91-7.28Z" />
                <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.24L15.31 17a5.8 5.8 0 0 1-8.64-3.05H3.43v2.59A9.75 9.75 0 0 0 12 21.75Z" />
                <path fill="#FBBC05" d="M6.67 13.95A5.87 5.87 0 0 1 6.35 12c0-.68.12-1.34.32-1.95V7.46H3.43a9.75 9.75 0 0 0 0 9.08l3.24-2.59Z" />
                <path fill="#EA4335" d="M12 6.25c1.52 0 2.89.52 3.97 1.55l2.98-2.98C16.83 2.84 14.63 1.75 12 1.75a9.75 9.75 0 0 0-8.57 5.71l3.24 2.59A5.8 5.8 0 0 1 12 6.25Z" />
              </svg>
              Continuar con Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
