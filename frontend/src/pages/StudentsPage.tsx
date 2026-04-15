import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors } from '../config';
import { toast } from '../App';

interface Student {
  ID: number;
  nombres: string;
  apellidos: string;
  email: string;
  fechaNac: string;
  rut: string;
  categoria: 'Beginner' | 'Junior' | 'Senior';
  seasonID: number;
  retiradoApoderado: boolean;
  datosApoderado: {
    nombres?: string;
    apellidos?: string;
    email?: string;
    telefono?: string;
    rut?: string;
  } | null;
  guardianID: number | null;
  qrUrl?: string;
}

interface Guardian {
  ID: number;
  nombres: string;
  apellidos: string;
}

function validateRUT(rut: string): boolean {
  const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$/;
  return rutRegex.test(rut);
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resendingQRId, setResendingQRId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [filterCategoria, setFilterCategoria] = useState<string>('');
  const [qrModal, setQrModal] = useState<{ show: boolean; student: Student | null; qrUrl: string | null }>({ show: false, student: null, qrUrl: null });
  const [resendQRModal, setResendQRModal] = useState<{ show: boolean; student: Student | null }>({ show: false, student: null });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    fechaNac: '',
    rut: '',
    categoria: 'Beginner' as 'Beginner' | 'Junior' | 'Senior',
    seasonID: 0,
    retiradoApoderado: false,
    datosApoderado: {
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      rut: '',
    },
    guardianID: null as number | null,
  });

  useEffect(() => {
    const seasonId = localStorage.getItem('currentSeasonId');
    if (seasonId) {
      setFormData(prev => ({ ...prev, seasonID: parseInt(seasonId) }));
    }
    loadGuardians();
    loadStudents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.student-menu') && openMenuId !== null) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const loadStudents = async () => {
    try {
      const seasonId = localStorage.getItem('currentSeasonId');
      const url = seasonId ? `/students?seasonID=${seasonId}${filterCategoria ? `&categoria=${filterCategoria}` : ''}` : '/students';
      const res = await api.get(url);
      setStudents(res.data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGuardians = async () => {
    try {
      const seasonId = localStorage.getItem('currentSeasonId');
      if (seasonId) {
        const res = await api.get(`/guardians?seasonID=${seasonId}`);
        setGuardians(res.data);
      }
    } catch (error) {
      console.error('Error loading guardians:', error);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [filterCategoria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRUT(formData.rut)) {
      toast.warning('RUT inválido. Formato: 00.000.000-0');
      return;
    }
    
    setSubmitting(true);
    try {
      const seasonId = localStorage.getItem('currentSeasonId');
      const payload = {
        ...formData,
        seasonID: seasonId ? parseInt(seasonId) : formData.seasonID,
        datosApoderado: formData.datosApoderado.nombres ? formData.datosApoderado : null,
      };
      
      if (editingStudent) {
        await api.put(`/students/${editingStudent.ID}`, payload);
      } else {
        await api.post('/students', payload);
      }
      loadStudents();
      setShowForm(false);
      setEditingStudent(null);
      resetForm();
    } catch (error) {
      console.error('Error saving student:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    const datosApoderado = {
      nombres: student.datosApoderado?.nombres || '',
      apellidos: student.datosApoderado?.apellidos || '',
      email: student.datosApoderado?.email || '',
      telefono: student.datosApoderado?.telefono || '',
      rut: student.datosApoderado?.rut || '',
    };
    setFormData({
      nombres: student.nombres,
      apellidos: student.apellidos,
      email: student.email || '',
      fechaNac: student.fechaNac || '',
      rut: student.rut,
      categoria: student.categoria,
      seasonID: student.seasonID,
      retiradoApoderado: student.retiradoApoderado,
      datosApoderado,
      guardianID: student.guardianID,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este estudiante?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/students/${id}`);
      loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    const seasonId = localStorage.getItem('currentSeasonId');
    setFormData({
      nombres: '',
      apellidos: '',
      email: '',
      fechaNac: '',
      rut: '',
      categoria: 'Beginner',
      seasonID: seasonId ? parseInt(seasonId) : 0,
      retiradoApoderado: false,
      datosApoderado: { nombres: '', apellidos: '', email: '', telefono: '', rut: '' },
      guardianID: null,
    });
  };

  const handleResendQR = async (studentId: number, destino: string = 'ambos') => {
    setResendingQRId(studentId);
    try {
      await api.post(`/students/${studentId}/resend-qr`, { destino });
      toast.success('QR reenviado correctamente');
    } catch (error) {
      console.error('Error resending QR:', error);
      toast.error('Error al reenviar QR');
    } finally {
      setResendingQRId(null);
    }
  };

  const handleViewQR = (student: Student) => {
    const qrUrl = student.qrUrl || `${import.meta.env.VITE_API_URL || ''}/students/${student.ID}/qr`;
    setQrModal({ show: true, student, qrUrl });
  };

  if (loading) return <div className="p-4">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/panel')} className="text-text-muted hover:text-text">
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-text">Lista de Estudiantes</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingStudent(null); resetForm(); }}
          className="px-4 py-2 rounded text-white text-sm"
          style={{ backgroundColor: colors.primary }}
        >
          + Nuevo Estudiante
        </button>
      </div>

      <div className="flex gap-2">
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Todas las categorías</option>
          <option value="Beginner">Beginner</option>
          <option value="Junior">Junior</option>
          <option value="Senior">Senior</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-surface rounded-lg shadow p-6 max-h-[80vh] overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">
            {editingStudent ? 'Editar Estudiante' : 'Nuevo Estudiante'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Nombres</label>
                <input
                  type="text"
                  value={formData.nombres}
                  onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Apellidos</label>
                <input
                  type="text"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={formData.fechaNac}
                  onChange={(e) => setFormData({ ...formData, fechaNac: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">RUT</label>
                <input
                  type="text"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="00000000-0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Categoría</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={formData.retiradoApoderado}
                  onChange={(e) => setFormData({ ...formData, retiradoApoderado: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-text">Se retira con apoderado</span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Buscar Apoderado</label>
                  <select
                    value={formData.guardianID || ''}
                    onChange={(e) => setFormData({ ...formData, guardianID: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    {guardians.map((g) => (
                      <option key={g.ID} value={g.ID}>{g.nombres} {g.apellidos}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Nombre Apoderado</label>
                    <input
                      type="text"
                      value={formData.datosApoderado.nombres}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        datosApoderado: { ...formData.datosApoderado, nombres: e.target.value } 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Apellido Apoderado</label>
                    <input
                      type="text"
                      value={formData.datosApoderado.apellidos}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        datosApoderado: { ...formData.datosApoderado, apellidos: e.target.value } 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Email Apoderado</label>
                    <input
                      type="email"
                      value={formData.datosApoderado.email}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        datosApoderado: { ...formData.datosApoderado, email: e.target.value } 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Teléfono Apoderado</label>
                    <input
                      type="text"
                      value={formData.datosApoderado.telefono}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        datosApoderado: { ...formData.datosApoderado, telefono: e.target.value } 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">RUT Apoderado</label>
                    <input
                      type="text"
                      value={formData.datosApoderado.rut}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        datosApoderado: { ...formData.datosApoderado, rut: e.target.value } 
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="00000000-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button 
                type="submit" 
                disabled={submitting}
                className="px-4 py-2 rounded text-white text-sm disabled:opacity-50" 
                style={{ backgroundColor: colors.primary }}
              >
                {submitting ? 'Guardando...' : (editingStudent ? 'Actualizar' : 'Crear')}
              </button>
              <button 
                type="button" 
                disabled={submitting}
                onClick={() => setShowForm(false)} 
                className="px-4 py-2 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">RUT</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Categoría</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Retiro</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.ID} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-text">
                  {student.nombres} {student.apellidos}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{student.rut}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    student.categoria === 'Beginner' ? 'bg-green-100 text-green-800' :
                    student.categoria === 'Junior' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {student.categoria}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {student.retiradoApoderado ? 'Con Apoderado' : 'Solo'}
                </td>
<td className="px-4 py-3 text-right space-x-1">
                  <button 
                    onClick={() => handleViewQR(student)}
                    className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Ver QR
                  </button>
                  <button 
                    onClick={() => setResendQRModal({ show: true, student })}
                    className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Reenviar QR
                  </button>
                  <button onClick={() => handleEdit(student)} className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors">
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(student.ID)} 
                    disabled={deletingId === student.ID}
                    className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    {deletingId === student.ID ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No hay estudiantes registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {qrModal.show && qrModal.student && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQrModal({ show: false, student: null, qrUrl: null })}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                QR de {qrModal.student.nombres} {qrModal.student.apellidos}
              </h3>
              <button 
                onClick={() => setQrModal({ show: false, student: null, qrUrl: null })}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <img src={qrModal.qrUrl || ''} alt="QR Code" className="w-48 h-48 rounded-sm" />
            </div>
            <div className="text-center text-sm text-gray-600 mb-4">
              <p>Categoría: {qrModal.student.categoria}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <a 
                href={qrModal.qrUrl || ''} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Abrir en nueva pestaña
              </a>
            </div>
          </div>
        </div>
      )}

      {resendQRModal.show && resendQRModal.student && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setResendQRModal({ show: false, student: null })}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Reenviar QR
              </h3>
              <button 
                onClick={() => setResendQRModal({ show: false, student: null })}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              ¿A quién deseas enviar el código QR de <strong>{resendQRModal.student.nombres} {resendQRModal.student.apellidos}</strong>?
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => { handleResendQR(resendQRModal.student!.ID, 'estudiante'); setResendQRModal({ show: false, student: null }); }}
                disabled={resendingQRId === resendQRModal.student.ID}
                className="px-4 py-3 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-left disabled:opacity-50"
              >
                📧 A la alumna ({resendQRModal.student.email || 'Sin email'})
              </button>
              <button 
                onClick={() => { handleResendQR(resendQRModal.student!.ID, 'apoderado'); setResendQRModal({ show: false, student: null }); }}
                disabled={resendingQRId === resendQRModal.student.ID}
                className="px-4 py-3 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-left disabled:opacity-50"
              >
                📧 Al apoderado
              </button>
              <button 
                onClick={() => { handleResendQR(resendQRModal.student!.ID, 'ambos'); setResendQRModal({ show: false, student: null }); }}
                disabled={resendingQRId === resendQRModal.student.ID}
                className="px-4 py-3 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-left disabled:opacity-50"
              >
                📧 A ambos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
