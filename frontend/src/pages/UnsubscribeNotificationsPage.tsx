import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

type PageState = 'loading' | 'ready' | 'already-unsubscribed' | 'success' | 'error';

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'No fue posible procesar este enlace.';
  }
  return 'No fue posible conectarse al sistema. Inténtalo nuevamente.';
}

export default function UnsubscribeNotificationsPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<PageState>('loading');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Este enlace de desuscripción no es válido.');
      setState('error');
      return;
    }
    api.get('/notification-preferences/unsubscribe', { params: { token } })
      .then(({ data }) => setState(data.alreadyUnsubscribed ? 'already-unsubscribed' : 'ready'))
      .catch((requestError) => {
        setError(errorMessage(requestError));
        setState('error');
      });
  }, [token]);

  const confirmUnsubscribe = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/notification-preferences/unsubscribe', { token });
      setState(data.alreadyUnsubscribed ? 'already-unsubscribed' : 'success');
    } catch (requestError) {
      setError(errorMessage(requestError));
      setState('error');
    } finally {
      setSubmitting(false);
    }
  };

  const complete = state === 'success' || state === 'already-unsubscribed';

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <section className="w-full max-w-xl rounded-2xl bg-surface p-7 sm:p-10 shadow-lg">
        <div className="text-center mb-7">
          <img src="/uv.png" alt="Universidad de Valparaíso" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary">Notificaciones de asistencia</h1>
        </div>

        {state === 'loading' && <p className="text-center text-text-muted">Verificando el enlace…</p>}

        {state === 'ready' && (
          <>
            <p className="mb-4 text-text">Recibiste estos avisos porque este correo está registrado para acompañar los registros de llegada y salida de una participante de Technovation Girls Chile en la Facultad de Ingeniería de la Universidad de Valparaíso.</p>
            <p className="mb-4 text-text">Este sistema fue desarrollado como proyecto por un estudiante de la Escuela de Ingeniería Informática de la Universidad de Valparaíso. Usamos estos correos únicamente para informar registros de asistencia.</p>
            <p className="mb-7 text-text">Gracias por haber elegido recibir estas notificaciones. Si prefieres no recibir más avisos de llegada y salida en este correo, puedes desuscribirte a continuación.</p>
            <button type="button" onClick={confirmUnsubscribe} disabled={submitting} className="w-full rounded-lg bg-primary px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Procesando…' : 'Dejar de recibir notificaciones de asistencia'}
            </button>
            <p className="mt-4 text-center text-xs text-text-muted">Esta acción no afecta otros correos necesarios del programa.</p>
          </>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="mb-3 text-4xl" aria-hidden="true">✓</div>
            <h2 className="text-xl font-bold text-primary">Desuscripción confirmada</h2>
            <p className="mt-3 text-text">Ya no recibirás avisos de llegada y salida en este correo. Esta decisión no afecta otros correos necesarios del programa.</p>
          </div>
        )}

        {state === 'already-unsubscribed' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-primary">Este correo ya está desuscrito</h2>
            <p className="mt-3 text-text">Ya no recibirás avisos de llegada y salida en este correo.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-danger">No fue posible completar la solicitud</h2>
            <p className="mt-3 text-text">{error}</p>
          </div>
        )}

        {complete && <p className="mt-7 text-center text-xs text-text-muted">Technovation Girls Chile · Universidad de Valparaíso</p>}
      </section>
    </main>
  );
}
