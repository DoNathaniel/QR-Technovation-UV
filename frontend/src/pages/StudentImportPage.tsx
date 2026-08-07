import { useState, type ChangeEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../App';

type PreviewRow = {
  rowNumber: number; nombres: string; apellidos: string; email: string; rut: string; fechaNac: string | null;
  categoria: string; guardianNombre: string; guardianEmail: string; guardianRut: string; retiroConApoderado: boolean | null;
  retiroOriginal: string; errors: string[]; warnings: string[];
};
type Preview = { token: string; expiresInMinutes: number; total: number; valid: number; invalid: number; rows: PreviewRow[] };

export default function StudentImportPage() {
  const { user, currentSeasonId, temporadas } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const season = temporadas.find((item) => item.ID === currentSeasonId);

  if (user?.rol !== 'superadmin') return <Navigate to="/panel" replace />;

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setPreview(null);
  };

  const buildPreview = async () => {
    if (!file || !currentSeasonId) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error('Selecciona un archivo Excel (.xlsx o .xls).');
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const response = await api.post<Preview>(`/admin/student-import/preview?seasonID=${currentSeasonId}`, buffer, {
        headers: { 'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      });
      setPreview(response.data);
      setShowAll(response.data.invalid > 0);
      toast.success(`Vista previa lista: ${response.data.valid} registros válidos.`);
    } catch (error: any) {
      setPreview(null);
      toast.error(error.response?.data?.message || 'No se pudo leer la plantilla.');
    } finally { setLoading(false); }
  };

  const commit = async () => {
    if (!preview || preview.invalid > 0) return;
    if (!window.confirm(`Se importarán ${preview.valid} estudiantes en ${season?.nombre || 'la temporada seleccionada'}. No se enviarán correos ni se generarán QR. ¿Continuar?`)) return;
    setImporting(true);
    try {
      const response = await api.post('/admin/student-import/commit', { token: preview.token });
      toast.success(`${response.data.imported} estudiantes importadas. No se enviaron correos ni QR.`);
      setPreview(null); setFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo completar la importación.');
    } finally { setImporting(false); }
  };

  const rows = showAll ? preview?.rows || [] : (preview?.rows || []).slice(0, 12);
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <button onClick={() => navigate('/panel')} className="text-text-muted hover:text-text text-sm">← Volver al panel</button>
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-800">Importar estudiantes</h1>
        <p className="text-gray-600 mt-2">Disponible solo para superadministración. Se leerá la hoja <strong>Confirmadas</strong> y podrás revisar cada registro antes de guardar.</p>
        <div className="mt-4 rounded-lg bg-blue-50 text-blue-900 p-3 text-sm">Temporada de destino: <strong>{season?.nombre || 'No seleccionada'}</strong>. Esta acción no genera QR ni envía correos.</div>
        <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
          <input type="file" accept=".xlsx,.xls" onChange={selectFile} className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <button disabled={!file || !currentSeasonId || loading} onClick={buildPreview} className="px-5 py-2.5 rounded-lg bg-blue-700 text-white disabled:opacity-50 whitespace-nowrap">{loading ? 'Leyendo…' : 'Verificar plantilla'}</button>
        </div>
      </section>

      {preview && <>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-5"><p className="text-sm text-gray-500">Registros detectados</p><p className="text-3xl font-bold text-gray-800">{preview.total}</p></div>
          <div className="bg-white rounded-xl border p-5"><p className="text-sm text-gray-500">Listos para importar</p><p className="text-3xl font-bold text-green-700">{preview.valid}</p></div>
          <div className="bg-white rounded-xl border p-5"><p className="text-sm text-gray-500">Con errores</p><p className="text-3xl font-bold text-red-700">{preview.invalid}</p></div>
        </section>
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b">
            <div><h2 className="font-semibold text-gray-800">Vista previa</h2><p className="text-sm text-gray-500">La vista previa expira en {preview.expiresInMinutes} minutos. Los campos sensibles se muestran solo para tu revisión.</p></div>
            {preview.rows.length > 12 && <button onClick={() => setShowAll(!showAll)} className="text-sm text-blue-700 hover:text-blue-900">{showAll ? 'Mostrar menos' : `Ver los ${preview.rows.length} registros`}</button>}
          </div>
          <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-gray-500"><tr><th className="p-3 text-left">Fila</th><th className="p-3 text-left">Estudiante</th><th className="p-3 text-left">Categoría</th><th className="p-3 text-left">Apoderado</th><th className="p-3 text-left">Retiro</th><th className="p-3 text-left">Estado</th></tr></thead><tbody>
            {rows.map((row) => <tr key={row.rowNumber} className="border-t align-top"><td className="p-3 text-gray-500">{row.rowNumber}</td><td className="p-3"><div className="font-medium">{row.nombres} {row.apellidos}</div><div className="text-xs text-gray-500">{row.rut} · {row.email}</div></td><td className="p-3">{row.categoria}</td><td className="p-3"><div>{row.guardianNombre}</div><div className="text-xs text-gray-500">{row.guardianRut} · {row.guardianEmail}</div></td><td className="p-3">{row.retiroConApoderado === true ? 'Con apoderado' : row.retiroConApoderado === false ? 'Sola' : 'Sin definir'}</td><td className="p-3">{row.errors.length > 0 ? <div className="text-red-700 space-y-1">{row.errors.map((item) => <div key={item}>{item}</div>)}</div> : <div className="text-green-700">Lista</div>}{row.warnings.length > 0 && <div className="text-amber-700 mt-1 space-y-1">{row.warnings.map((item) => <div key={item}>{item}</div>)}</div>}</td></tr>)}
          </tbody></table></div>
        </section>
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"><p className="text-sm text-gray-600">{preview.invalid > 0 ? 'Corrige los errores indicados y vuelve a cargar la plantilla.' : 'Al confirmar se crearán estudiantes y apoderados, sin correos ni QR.'}</p><button disabled={preview.invalid > 0 || importing} onClick={commit} className="px-5 py-2.5 rounded-lg bg-green-700 text-white disabled:opacity-50">{importing ? 'Importando…' : `Importar ${preview.valid} estudiantes`}</button></section>
      </>}
    </div>
  );
}
