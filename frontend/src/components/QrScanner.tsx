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
  | { type: 'success'; nombre: string; tipo: 'entrada' | 'salida' | 'justificado'; requiereApoderado: boolean; sisters: { nombre: string }[] }
  | { type: 'error'; message: string }
  | { type: 'scanning' }
  | { type: 'confirmApoderado'; nombre: string; studentID: number; requiereConfirmar: boolean };

const READER_ID = 'qr-reader';
const COOLDOWN_MS = 60000; // prevent duplicate scans

export default function QrScanner({ userID, connected, onReconnect, onRegistered, date }: QrScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: 'idle' });
  const [showModal, setShowModal] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const processingRef = useRef(false);

  // Show modal when there's feedback
  useEffect(() => {
    if (feedback.type !== 'idle') {
      setShowModal(true);
    }
  }, [feedback]);

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

  const audio = new Audio('/scanner.mp3');
  audio.volume = 0.7;
  const audio_success = new Audio('/success.mp3');
  audio_success.volume = 0.7;

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

      audio.play().catch(() => {});

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
        audio_success.play().catch(() => {});
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
    setFeedback({ type: "scanning" });
    
    // Registrar la salida solo cuando confirma
    try {
      const res = await api.post<Attendance>('/attendance', { studentID, userID });
      const attendance = res.data;
      const sisters = (attendance as Attendance & { sisters?: { ID: number; nombres: string; apellidos: string }[] }).sisters ?? [];
      const sistersInfo = sisters.length > 0 
        ? sisters.map(s => ({ nombre: `${s.nombres} ${s.apellidos}` })) 
        : [];
      setFeedback({ type: 'success', nombre, tipo: attendance.tipo, requiereApoderado: true, sisters: sistersInfo });
      audio_success.play().catch(() => {});
      onRegistered?.(attendance);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error al registrar salida' });
      setTimeout(() => setFeedback({ type: 'idle' }), 3000);
    }
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

      {/* Modal for feedback */}
      {showModal && feedback.type !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={feedback.type === 'scanning' ? undefined : () => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4" onClick={e => e.stopPropagation()}>
            {feedback.type === 'scanning' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-blue-800 mb-1">Procesando...</div>
                <div className="text-gray-500 text-sm">Verificando informacion del estudiante</div>
              </div>
            )}
            {feedback.type === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-green-800 mb-1">
                  {feedback.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada
                </div>
                <div className="text-gray-600 mb-3">{feedback.nombre}</div>
                {feedback.sisters.length > 0 && feedback.tipo === 'salida' && (
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                    <strong>Aviso:</strong> El apoderado de la estudiante, tambien es apoderado de: {feedback.sisters.map(s => s.nombre).join(', ')}
                  </div>
                )}
                <button
                  onClick={() => { setShowModal(false); setFeedback({ type: 'idle' }); }}
                  className="w-full bg-green-600 text-white font-semibold py-2 px-4 rounded hover:bg-green-700"
                >
                  Aceptar
                </button>
              </div>
            )}
            {feedback.type === 'error' && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-red-800 mb-1">Error</div>
                <div className="text-gray-600 mb-3">{feedback.message}</div>
                <button
                  onClick={() => { setShowModal(false); setFeedback({ type: 'idle' }); }}
                  className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded hover:bg-gray-300"
                >
                  Cerrar
                </button>
              </div>
            )}
            {feedback.type === 'confirmApoderado' && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-amber-800 mb-2">Confirmar retiro con apoderado</div>
                <div className="text-gray-600 mb-3">
                  {feedback.nombre} tiene registrado <strong>retiro con apoderado</strong>. 
                  ¿Confirmas que viste al apoderado?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowModal(false); handleConfirmApoderado(); }}
                    className="flex-1 bg-green-600 text-white font-semibold py-2 px-4 rounded hover:bg-green-700"
                  >
                    Lo vi
                  </button>
                  <button
                    onClick={() => { setShowModal(false); setFeedback({ type: 'idle' }); }}
                    className="flex-1 bg-red-100 text-red-700 font-semibold py-2 px-4 rounded hover:bg-red-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
