import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import { colors } from '../config';
import type { Attendance } from '../types';

interface QrScannerProps {
  userID: number;
  connected: boolean;
  onReconnect: () => void;
  onRegistered?: (attendance: Attendance) => void;
  date?: string;
}

type FeedbackState =
  | { type: 'idle' }
  | { type: 'success'; nombre: string; tipo: 'entrada' | 'salida'; requiereApoderado: boolean; sisters: { nombre: string }[] }
  | { type: 'error'; message: string }
  | { type: 'scanning' }
  | { type: 'confirmApoderado'; nombre: string; studentID: number; requiereConfirmar: boolean };

const READER_ID = 'qr-reader';
const COOLDOWN_MS = 2500; // prevent duplicate scans

export default function QrScanner({ userID, connected, onReconnect, onRegistered, date }: QrScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: 'idle' });
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const processingRef = useRef(false);

  // Close scanner if connection drops while it's open
  useEffect(() => {
    if (!connected && isOpen) {
      setIsOpen(false);
    }
  }, [connected, isOpen]);

  // Start scanner when opened
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const startScanner = async () => {
      // Small delay to let the DOM element render
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled) return;

      const el = document.getElementById(READER_ID);
      if (!el) return;

      const html5QrCode = new Html5Qrcode(READER_ID);
      scannerRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!cancelled) handleDecode(decodedText);
          },
          () => {
            // ignore scan failures (no QR found in frame)
          },
        );
      } catch (err) {
        console.error('[QrScanner] Failed to start camera:', err);
        if (!cancelled) {
          setFeedback({
            type: 'error',
            message: 'No se pudo acceder a la camara. Verifica los permisos.',
          });
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleDecode = useCallback(
    async (text: string) => {
      // Cooldown: ignore same code scanned within COOLDOWN_MS
      const now = Date.now();
      if (text === lastScannedRef.current && now - lastScannedTimeRef.current < COOLDOWN_MS) {
        return;
      }
      if (processingRef.current) return;

      lastScannedRef.current = text;
      lastScannedTimeRef.current = now;
      processingRef.current = true;

      setFeedback({ type: 'scanning' });

      // Parse studentID from QR text
      // Support formats:
      //   1. "season_{id}/student_{id}.png" (nuevo formato T21)
      //   2. plain number "123"
      //   3. JSON with studentID field
      let studentID: number | null = null;

      const qrPathMatch = text.match(/^season_(\d+)\/student_(\d+)\.png$/);
      if (qrPathMatch) {
        studentID = parseInt(qrPathMatch[2], 10);
      } else {
        const asNumber = parseInt(text, 10);
        if (!isNaN(asNumber) && String(asNumber) === text.trim()) {
          studentID = asNumber;
        } else {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed.studentID === 'number') {
              studentID = parsed.studentID;
            }
          } catch {
            // not JSON
          }
        }
      }

      if (studentID === null) {
        setFeedback({ type: 'error', message: `QR no valido: "${text.slice(0, 30)}"` });
        processingRef.current = false;
        setTimeout(() => setFeedback({ type: 'idle' }), 2500);
        return;
      }

      try {
        // T10-4: Primero consultamos si requiere confirmacion de retiro con apoderado
        // Hacemos un GET para obtener datos del estudiante sin registrar asistencia aun
        const studentRes = await api.get<{ ID: number; nombres: string; apellidos: string; requeridoApoderado: boolean; guardianID: number | null; seasonID: number }>(`/students/${studentID}`);
        const studentData = studentRes.data;
        
        // Obtener la asistencia para la fecha seleccionada para saber si es entrada o salida
        const targetDate = date || new Date().toISOString().split('T')[0];
        const attRes = await api.get<{ tipo: string; createdAt: string }[]>(`/attendance/student/${studentID}`);
        const dateAttendances = attRes.data.filter((a: { createdAt: string }) => a.createdAt.startsWith(targetDate));
        const lastAttendance = dateAttendances[0];
        const tipoActual = lastAttendance && lastAttendance.tipo === 'entrada' ? 'salida' : 'entrada';

        // Si es salida Y tiene retiro con apoderado, pedir confirmacion antes de registrar
        // Note: API returns 'retiradoApoderado', not 'requeridoApoderado'
        const requiereApoderado = (studentData as any).retiradoApoderado ?? false;
        
        if (tipoActual === 'salida' && requiereApoderado) {
          const nombre = `${studentData.nombres} ${studentData.apellidos}`;
          setFeedback({ 
            type: 'confirmApoderado', 
            nombre, 
            studentID,
            requiereConfirmar: true
          });
          processingRef.current = false;
          return;
        }

        // Registro normal (con la fecha seleccionada)
        const res = await api.post<Attendance>('/attendance', { studentID, userID, fecha: targetDate });
        const attendance = res.data;
        const nombre = attendance.student
          ? `${attendance.student.nombres} ${attendance.student.apellidos}`
          : `Estudiante #${studentID}`;

        const sisters = (attendance as Attendance & { sisters?: { ID: number; nombres: string; apellidos: string }[] }).sisters ?? [];
        const sistersInfo = sisters.length > 0 
          ? sisters.map(s => ({ nombre: `${s.nombres} ${s.apellidos}` })) 
          : [];

        setFeedback({ type: 'success', nombre, tipo: attendance.tipo, requiereApoderado: false, sisters: sistersInfo });
        onRegistered?.(attendance);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
              'Error al registrar'
            : 'Error de red';
        setFeedback({ type: 'error', message: msg });
        setTimeout(() => setFeedback({ type: 'idle' }), 3000);
      } finally {
        processingRef.current = false;
      }
    },
    [userID, onRegistered],
  );

  const toggleOpen = () => {
    if (!connected) return; // block opening when disconnected
    setIsOpen((v) => !v);
  };

  const handleConfirmApoderado = async () => {
    if (feedback.type !== 'confirmApoderado') return;
    const { nombre, studentID } = feedback;
    
    // Registrar la salida solo cuando confirma
    try {
      const res = await api.post<Attendance>('/attendance', { studentID, userID });
      const attendance = res.data;
      const sisters = (attendance as Attendance & { sisters?: { ID: number; nombres: string; apellidos: string }[] }).sisters ?? [];
      const sistersInfo = sisters.length > 0 
        ? sisters.map(s => ({ nombre: `${s.nombres} ${s.apellidos}` })) 
        : [];
      setFeedback({ type: 'success', nombre, tipo: attendance.tipo, requiereApoderado: true, sisters: sistersInfo });
      onRegistered?.(attendance);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al registrar salida' });
      setTimeout(() => setFeedback({ type: 'idle' }), 3000);
    }
  };

  const handleDismissSuccess = () => {
    setFeedback({ type: 'idle' });
  };

  const handleCancelApoderado = () => {
    setFeedback({ type: 'idle' });
  };

  return (
    <div className="bg-surface rounded-lg shadow overflow-hidden">
      {/* Header row: toggle + connection status */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Toggle button */}
        <button
          onClick={toggleOpen}
          disabled={!connected}
          className={`flex items-center gap-2 font-semibold text-sm ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ color: colors.primary }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M8 12h8M12 8v8"
            />
          </svg>
          Escanear QR
          {connected && (
            <span className="text-xs font-normal text-text-muted">
              {isOpen ? '\u25B2' : '\u25BC'}
            </span>
          )}
        </button>

        {/* Connection status */}
        {connected ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Conectado
          </span>
        ) : (
          <button
            onClick={onReconnect}
            className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Desconectado &middot; Reconectar
          </button>
        )}
      </div>

      {/* Disconnected warning */}
      {!connected && (
        <div className="px-4 pb-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            No se puede escanear sin conexion al servidor. Presiona &quot;Reconectar&quot; para reintentar.
          </div>
        </div>
      )}

      {/* Scanner area */}
      {isOpen && connected && (
        <div className="px-4 pb-4">
          {/* Feedback banner */}
          {feedback.type === 'success' && (
            <div className="mb-3 rounded-lg bg-green-50 border border-green-300 px-3 py-2 text-sm text-green-800 animate-pulse">
              <div className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-bold">
                    {feedback.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                  </span>{' '}
                  registrada: {feedback.nombre}
                </span>
                <button
                  onClick={handleDismissSuccess}
                  className="text-green-700 hover:text-green-900 font-bold text-lg leading-none"
                >
                  ×
                </button>
              </div>
              {feedback.sisters.length > 0 && feedback.tipo === 'salida' && (
                <div className="mt-2 text-xs bg-amber-50 border border-amber-200 rounded p-1.5">
                  <strong>Aviso:</strong> Esta estudiante tiene sisters en la temporada: {feedback.sisters.map(s => s.nombre).join(', ')}
                </div>
              )}
            </div>
          )}
          {feedback.type === 'error' && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-300 px-3 py-2 text-sm text-red-800">
              {feedback.message}
            </div>
          )}
          {feedback.type === 'scanning' && (
            <div className="mb-3 rounded-lg bg-blue-50 border border-blue-300 px-3 py-2 text-sm text-blue-800 animate-pulse">
              Procesando...
            </div>
          )}
          {feedback.type === 'confirmApoderado' && (
            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-300 px-3 py-3 text-sm text-amber-900">
              <div className="font-bold mb-2">
                Confirmar retiro con apoderado
              </div>
              <div className="mb-3">
                {feedback.nombre} tiene registrado <strong>retiro con apoderado</strong>. 
                ¿Confirmas que viste al apoderado?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmApoderado}
                  className="flex-1 bg-green-600 text-white font-semibold py-1.5 px-3 rounded hover:bg-green-700 transition-colors text-xs"
                >
                  Lo vi
                </button>
                <button
                  onClick={handleCancelApoderado}
                  className="flex-1 bg-red-100 text-red-700 font-semibold py-1.5 px-3 rounded hover:bg-red-200 transition-colors text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Camera view */}
          <div
            id={READER_ID}
            className="mx-auto rounded-lg overflow-hidden"
            style={{ maxWidth: 350 }}
          />

          <p className="text-[11px] text-text-muted text-center mt-2">
            Apunta la camara al codigo QR del estudiante
          </p>
        </div>
      )}
    </div>
  );
}
