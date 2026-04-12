import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors } from '../config';

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
  const [currentSeasonId, setCurrentSeasonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [filterCategoria, setFilterCategoria] = useState<string>('');
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
      setCurrentSeasonId(parseInt(seasonId));
      setFormData(prev => ({ ...prev, seasonID: parseInt(seasonId) }));
    }
    loadGuardians();
    loadStudents();
  }, []);

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
      alert('RUT inválido. Formato: 00.000.000-0');
      return;
    }
    
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
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nombres: student.nombres,
      apellidos: student.apellidos,
      email: student.email || '',
      fechaNac: student.fechaNac || '',
      rut: student.rut,
      categoria: student.categoria,
      seasonID: student.seasonID,
      retiradoApoderado: student.retiradoApoderado,
      datosApoderado: student.datosApoderado || { nombres: '', apellidos: '', email: '', telefono: '', rut: '' },
      guardianID: student.guardianID,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este estudiante?')) return;
    try {
      await api.delete(`/students/${id}`);
      loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
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

  const handleResendQR = async (studentId: number) => {
    try {
      await api.post(`/students/${studentId}/resend-qr`);
      alert('QR reenviado correctamente');
    } catch (error) {
      console.error('Error resending QR:', error);
      alert('Error al reenviar QR');
    }
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
              <button type="submit" className="px-4 py-2 rounded text-white text-sm" style={{ backgroundColor: colors.primary }}>
                {editingStudent ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded text-sm">
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
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleResendQR(student.ID)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">
                    Reenviar QR
                  </button>
                  <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(student.ID)} className="text-red-600 hover:text-red-800 text-sm">
                    Eliminar
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
    </div>
  );
}