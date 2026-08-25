import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import { toast } from '../App';

interface TeamAttendance {
  ID: number;
  tipo: 'entrada' | 'salida';
  fecha: string;
  hora: string;
  seasonID: number;
  seasonDateID: number | null;
  esFechaPlanificada: boolean;
  mentorID: number;
  scannedByUserID: number;
  createdAt: string;
  emailSent: boolean;
  message?: string;
  mentor?: { nombre: string; apellido: string; rol: string };
  scannedBy?: { nombre: string; apellido: string };
}

const READER_ID = 'mentor-qr-reader';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MentorAttendancePage() {
  const navigate = useNavigate();
  const seasonID = Number(localStorage.getItem('currentSeasonId')) || null;
  const [records, setRecords] = useState<TeamAttendance[]>([]);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const loadRecords = useCallback(async () => {
    if (!seasonID) {
      setRecords([]);
      return;
    }
    try {
      const response = await api.get<TeamAttendance[]>(`/mentor-attendance?fecha=${today()}&seasonID=${seasonID}`);
      setRecords(response.data);
    } catch (error) {
      console.error('Error cargando asistencia del equipo:', error);
    }
  }, [seasonID]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setOpeningCamera(false);
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        // La cámara puede haberse detenido por el navegador.
      }
    }
  }, []);

  useEffect(() => () => { void stopCamera(); }, [stopCamera]);

  const registerCode = useCallback(async (qrContent: string) => {
    const now = Date.now();
    if (processingRef.current || (lastCodeRef.current.code === qrContent && now - lastCodeRef.current.at < 4000)) return;
    processingRef.current = true;
    lastCodeRef.current = { code: qrContent, at: now };
    setProcessing(true);
    try {
      if (!seasonID) {
        toast.warning('Debes seleccionar una temporada antes de registrar asistencia.');
        return;
      }
      const response = await api.post<TeamAttendance>('/mentor-attendance/scan', { qrContent, seasonID });
      const record = response.data;
      setRecords((current) => [record, ...current]);
      toast.success(record.message || `${record.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`);
      if (!record.emailSent) toast.warning('La asistencia se guardó, pero no se pudo enviar el correo.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo registrar la asistencia');
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }, [seasonID]);

  const openCamera = async () => {
    if (openingCamera) {
      await stopCamera();
      return;
    }
    setOpeningCamera(true);
    window.setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(READER_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decodedText) => { void registerCode(decodedText); },
          () => {},
        );
      } catch (error) {
        console.error('No se pudo iniciar la cámara:', error);
        toast.error('No se pudo acceder a la cámara. Revisa los permisos.');
        await stopCamera();
      }
    }, 100);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/panel')} className="text-sm text-text-muted hover:text-text">← Volver</button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text">Asistencia de Mentores</h1>
            <p className="text-sm text-text-muted">Registro interno del equipo · {new Date().toLocaleDateString('es-CL')}</p>
          </div>
        </div>
        <button
          onClick={openCamera}
          disabled={!seasonID}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${openingCamera ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-700 hover:bg-violet-800'}`}
        >
          <span aria-hidden="true">{openingCamera ? '■' : '▣'}</span>
          {openingCamera ? 'Cerrar cámara' : 'Escanear QR de mentor'}
        </button>
      </div>

      <section className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-100 p-2 text-violet-700">⌁</div>
          <div className="text-sm text-violet-950">
            <p className="font-semibold">Control interno de asistencia</p>
            <p className="mt-0.5 text-violet-800">Cada lectura alterna entrada y salida, deja registro de quien la realizó y envía un aviso al correo del integrante.</p>
          </div>
        </div>
        {!seasonID && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Selecciona una temporada para asociar los registros a sus fechas planificadas.</p>}
        {openingCamera && <div id={READER_ID} className="mt-4 max-w-sm overflow-hidden rounded-lg bg-black mx-auto" />}
        {processing && <p className="mt-3 text-center text-sm font-medium text-violet-800">Registrando asistencia…</p>}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="font-semibold text-gray-800">Movimientos de hoy</h2>
          <button onClick={loadRecords} className="text-sm text-violet-700 hover:text-violet-900">Actualizar</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Integrante</th><th className="px-4 py-3">Movimiento</th><th className="px-4 py-3">Horario</th><th className="px-4 py-3">Hora</th><th className="px-4 py-3">Registrada por</th><th className="px-4 py-3">Correo</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.ID} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{record.mentor ? `${record.mentor.nombre} ${record.mentor.apellido}` : `Usuario #${record.mentorID}`}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>{record.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span></td>
                  <td className="px-4 py-3">{record.esFechaPlanificada ? <span className="text-emerald-700">Planificado</span> : <span className="font-medium text-amber-700">Fuera de fecha</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{record.hora.slice(0, 5)}</td>
                  <td className="px-4 py-3 text-gray-600">{record.scannedBy ? `${record.scannedBy.nombre} ${record.scannedBy.apellido}` : `Usuario #${record.scannedByUserID}`}</td>
                  <td className="px-4 py-3">{record.emailSent === false ? <span className="text-amber-700">Pendiente</span> : <span className="text-emerald-700">Enviado</span>}</td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">Aún no hay movimientos registrados hoy.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
