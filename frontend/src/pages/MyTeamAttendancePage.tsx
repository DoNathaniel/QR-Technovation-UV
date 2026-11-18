import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from '../App';
import OpenStreetMap from '../components/OpenStreetMap';

interface CheckInStatus {
  fecha: string;
  alreadyCheckedIn: boolean;
  configured: boolean;
  maxAccuracy?: number | null;
  venue?: { latitude: number; longitude: number; radius: number } | null;
}

interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface MyAttendance {
  ID: number;
  tipo: 'entrada' | 'salida';
  fecha: string;
  hora: string;
  esFechaPlanificada: boolean;
  metodo?: string;
  scannedBy?: { nombre: string; apellido: string };
}

function getAccuratePosition(maxAccuracy: number, timeoutMs = 20000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let watchId: number | null = null;
    let bestPosition: GeolocationPosition | null = null;
    const finish = (callback: () => void) => {
      window.clearTimeout(timeoutId);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      callback();
    };
    const timeoutId = window.setTimeout(() => {
      finish(() => reject(bestPosition
        ? new Error(`El GPS solo alcanzó ${Math.round(bestPosition.coords.accuracy)} m de precisión; se requieren ${Math.round(maxAccuracy)} m o menos. Intenta desde un lugar abierto y vuelve a probar.`)
        : new Error('No fue posible obtener una ubicación. Activa la ubicación e intenta nuevamente.')));
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(position => {
      if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) bestPosition = position;
      if (position.coords.accuracy <= maxAccuracy) finish(() => resolve(position));
    }, error => finish(() => reject(error)), {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: timeoutMs,
    });
  });
}

function getDevicePosition(timeoutMs = 20000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: timeoutMs,
    });
  });
}

function distanceInMeters(a: DevicePosition, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(a.latitude - b.latitude);
  const longitudeDelta = radians(a.longitude - b.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

function displayDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function MyTeamAttendancePage() {
  const navigate = useNavigate();
  const { currentSeasonId: seasonID, user } = useAuth();
  const canCheckIn = user?.rol === 'voluntario' || user?.rol === 'admin';
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'hoy' | 'registros'>('hoy');
  const [devicePosition, setDevicePosition] = useState<DevicePosition | null>(null);
  const [locating, setLocating] = useState(false);
  const locationRequested = useRef(false);
  const locationRequestInProgress = useRef(false);
  const [registering, setRegistering] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const requestInProgress = useRef(false);
  const currentSeason = useRef(seasonID);
  currentSeason.current = seasonID;
  const [records, setRecords] = useState<MyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ open: boolean; qrUrl: string | null }>({ open: false, qrUrl: null });

  const refresh = useCallback(async () => {
    if (!seasonID) { setLoading(false); return; }
    const requestedSeason = seasonID;
    setLoading(true);
    const [history, status] = await Promise.allSettled([
      api.get<MyAttendance[]>(`/mentor-attendance/mine?seasonID=${seasonID}`),
      canCheckIn ? api.get(`/mentor-attendance/mine/status?seasonID=${seasonID}`) : Promise.resolve(null),
    ]);
    if (currentSeason.current !== requestedSeason) return;
    if (history.status === 'fulfilled') setRecords(history.value.data);
    setCheckInStatus(status.status === 'fulfilled' ? status.value?.data || null : null);
    setStatusError(status.status === 'rejected');
    setLoading(false);
  }, [seasonID, canCheckIn]);

  useEffect(() => {
    setRecords([]);
    setCheckInStatus(null);
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    // Actualiza entradas por QR y el cambio de día mientras la pantalla sigue abierta.
    const timer = window.setInterval(onFocus, 30000);
    return () => { window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [refresh]);

  const registerEntry = async () => {
    if (requestInProgress.current || loading || !seasonID || !checkInStatus?.configured || checkInStatus.alreadyCheckedIn) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      toast.warning('La ubicación requiere HTTPS y un navegador compatible. Puedes usar tu QR.'); return;
    }
    requestInProgress.current = true;
    setRegistering(true);
    const requestedSeason = seasonID;
    try {
      const position = await getAccuratePosition(checkInStatus.maxAccuracy || 50);
      setDevicePosition({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
      if (currentSeason.current !== requestedSeason) return;
      await api.post('/mentor-attendance/mine/entry', {
        seasonID: requestedSeason,
        position: { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp },
      });
      setCheckInStatus(previous => previous ? { ...previous, alreadyCheckedIn: true } : null);
      toast.success('Tu entrada quedó registrada.');
    } catch (error: any) {
      const locationMessages: Record<number, string> = {
        1: 'Permite el acceso a tu ubicación para registrar la entrada. También puedes usar tu QR.',
        2: 'No fue posible obtener tu ubicación. Actívala e intenta nuevamente.',
        3: 'La ubicación tardó demasiado. Intenta nuevamente.',
      };
      toast.warning(error.response?.data?.message || locationMessages[error.code] || error.message || 'No fue posible registrar tu entrada.');
    } finally {
      requestInProgress.current = false;
      setRegistering(false);
      if (currentSeason.current === requestedSeason) await refresh();
    }
  };

  const locateDevice = async () => {
    if (locationRequestInProgress.current || !checkInStatus?.configured) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      toast.warning('La ubicación requiere HTTPS y un navegador compatible.');
      return;
    }
    locationRequestInProgress.current = true;
    setLocating(true);
    try {
      const position = await getDevicePosition();
      setDevicePosition({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
    } catch (error: any) {
      const locationMessages: Record<number, string> = {
        1: 'Permite el acceso a tu ubicación para mostrarla en el mapa.',
        2: 'No fue posible obtener tu ubicación. Actívala e intenta nuevamente.',
        3: 'La ubicación tardó demasiado. Intenta nuevamente.',
      };
      toast.warning(locationMessages[error.code] || error.message || 'No fue posible obtener tu ubicación.');
    } finally {
      locationRequestInProgress.current = false;
      setLocating(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'hoy' || !canCheckIn || !checkInStatus?.configured || locationRequested.current) return;
    locationRequested.current = true;
    void locateDevice();
  }, [activeTab, canCheckIn, checkInStatus?.configured]);

  const requiredAccuracy = checkInStatus?.maxAccuracy || 50;
  const distanceToVenue = devicePosition && checkInStatus?.venue
    ? distanceInMeters(devicePosition, checkInStatus.venue)
    : null;
  const locationIsPrecise = Boolean(devicePosition && devicePosition.accuracy <= requiredAccuracy);
  const locationIsInArea = Boolean(
    checkInStatus?.venue
    && devicePosition
    && locationIsPrecise
    && distanceToVenue !== null
    && distanceToVenue + devicePosition.accuracy <= checkInStatus.venue.radius,
  );
  const orderedRecords = [...records].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));

  const openQR = async () => {
    try {
      const response = await api.get<{ qrUrl: string }>('/users/me/qr');
      setQrModal({ open: true, qrUrl: response.data.qrUrl });
    } catch (error: any) {
      toast.warning(error.response?.data?.message || 'No fue posible obtener tu QR');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><button onClick={() => navigate('/panel')} className="text-sm text-text-muted hover:text-text">← Volver</button>
        <div>
          <h1 className="text-xl font-bold text-text sm:text-2xl">Mi asistencia</h1>
          <p className="text-sm text-text-muted">Tus registros como integrante del equipo</p>
        </div></div>
        <button onClick={openQR} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800">Ver mi QR</button>
      </div>

      {!seasonID ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Sin temporadas asignadas</div>
      ) : (
        <>
          <div className="flex gap-1 border-b border-gray-200" role="tablist" aria-label="Mi asistencia">
            <button type="button" role="tab" aria-selected={activeTab === 'hoy'} onClick={() => setActiveTab('hoy')} className={`border-b-2 px-4 py-2 text-sm font-medium ${activeTab === 'hoy' ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Hoy</button>
            <button type="button" role="tab" aria-selected={activeTab === 'registros'} onClick={() => setActiveTab('registros')} className={`border-b-2 px-4 py-2 text-sm font-medium ${activeTab === 'registros' ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Mis registros</button>
          </div>
          <div className={activeTab === 'hoy' ? 'space-y-5' : 'hidden'} role="tabpanel" aria-label="Hoy" aria-hidden={activeTab !== 'hoy'}>
          {canCheckIn && <section className="space-y-4 rounded-xl border border-violet-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">Entrada de hoy</h2>
            <p className="text-sm text-gray-500">La ubicación se carga al abrir esta pestaña y se usa para comprobar que estás en la sede.</p>
            {checkInStatus?.venue ? <OpenStreetMap venue={checkInStatus.venue} radius={checkInStatus.venue.radius} device={devicePosition} /> : <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">El mapa de la sede no está disponible porque falta configurar la ubicación de la sede.</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={locationIsInArea ? registerEntry : locateDevice}
                disabled={loading || registering || locating || !checkInStatus?.configured || checkInStatus.alreadyCheckedIn}
                className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-gray-300">
                {registering ? 'Verificando ubicación…' : locating ? 'Actualizando ubicación…' : checkInStatus?.alreadyCheckedIn ? 'Entrada ya registrada hoy' : locationIsInArea ? 'Registrar mi entrada' : 'Actualizar ubicación'}
              </button>
            </div>
            {locating && !devicePosition && <p className="text-sm text-gray-500" role="status">Cargando tu ubicación…</p>}
            {devicePosition && !locationIsInArea && checkInStatus?.venue && <p className="text-sm text-amber-700" role="status">
              {!locationIsPrecise
                ? `El GPS estima que estás aquí, pero tiene un margen de error de ±${Math.round(devicePosition.accuracy)} m; se requieren ${Math.round(requiredAccuracy)} m o menos.`
                : `Estás fuera del área permitida${distanceToVenue !== null ? ` (a ${Math.round(distanceToVenue)} m de la sede)` : ''}.`}
              {' '}{locationIsPrecise ? 'Acércate a la sede y actualiza tu ubicación para habilitar el registro.' : 'Prueba desde un lugar abierto y actualiza tu ubicación.'}
            </p>}
            <p className="text-xs text-gray-500" role="status">
              {statusError ? 'No pudimos consultar el estado de tu entrada.' : checkInStatus && !checkInStatus.configured ? 'El registro por ubicación aún no está habilitado. Puedes seguir usando tu QR.' : checkInStatus?.alreadyCheckedIn ? 'Ya tienes una entrada registrada para hoy en esta temporada.' : 'Debes estar dentro del área permitida y habilitar la ubicación precisa.'}
            </p>
            {statusError && <button onClick={() => void refresh()} className="mt-2 text-sm text-violet-700 underline">Volver a consultar</button>}
          </section>}
          </div>
          <div className={activeTab === 'registros' ? 'space-y-5' : 'hidden'} role="tabpanel" aria-label="Mis registros" aria-hidden={activeTab !== 'registros'}>
            <p className="text-sm text-gray-500">Historial de asistencias del semestre seleccionado.</p>
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {loading ? <p className="p-5 text-sm text-gray-500">Cargando registros…</p> : orderedRecords.length === 0 ? <p className="m-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">No tienes registros de asistencia en este semestre.</p> : (
                <ol className="divide-y divide-gray-100">
                  {orderedRecords.map((record) => (
                    <li key={record.ID} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>{record.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
                          {!record.esFechaPlanificada && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Fuera de fecha</span>}
                        </div>
                        <p className="mt-2 text-sm font-medium capitalize text-gray-800">{displayDate(record.fecha)}</p>
                        <p className="mt-0.5 text-sm text-gray-500">{record.metodo === 'ubicacion' ? 'Autorregistro por ubicación' : `Registrada por ${record.scannedBy ? `${record.scannedBy.nombre} ${record.scannedBy.apellido}` : 'un administrador'}`}</p>
                      </div>
                      <time className="text-sm font-semibold tabular-nums text-gray-700">{record.hora.slice(0, 5)}</time>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
      {qrModal.open && qrModal.qrUrl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQrModal({ open: false, qrUrl: null })}>
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-gray-800">Mi código QR</h2><p className="text-sm text-gray-500">Preséntalo para registrar tu asistencia.</p></div><button onClick={() => setQrModal({ open: false, qrUrl: null })} className="text-2xl text-gray-400 hover:text-gray-700" aria-label="Cerrar">×</button></div>
          <img src={qrModal.qrUrl} alt="Mi código QR de asistencia" className="mx-auto w-full max-w-[300px] rounded-lg" />
        </div>
      </div>}
    </div>
  );
}
