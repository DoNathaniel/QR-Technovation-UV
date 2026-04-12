import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors } from '../config';

interface Season {
  ID: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

export default function SeasonsPage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
  });

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    try {
      const res = await api.get('/seasons');
      setSeasons(res.data);
    } catch (error) {
      console.error('Error loading seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSeason) {
        await api.put(`/seasons/${editingSeason.ID}`, formData);
      } else {
        await api.post('/seasons', formData);
      }
      loadSeasons();
      setShowForm(false);
      setEditingSeason(null);
      setFormData({ nombre: '', fechaInicio: '', fechaFin: '' });
    } catch (error) {
      console.error('Error saving season:', error);
    }
  };

  const handleEdit = (season: Season) => {
    setEditingSeason(season);
    setFormData({
      nombre: season.nombre,
      fechaInicio: season.fechaInicio,
      fechaFin: season.fechaFin,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta temporada?')) return;
    try {
      await api.delete(`/seasons/${id}`);
      loadSeasons();
    } catch (error) {
      console.error('Error deleting season:', error);
    }
  };

  if (loading) return <div className="p-4">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/panel')}
            className="text-text-muted hover:text-text"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-text">Gestión de Temporadas</h1>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingSeason(null);
            setFormData({ nombre: '', fechaInicio: '', fechaFin: '' });
          }}
          className="px-4 py-2 rounded text-white text-sm"
          style={{ backgroundColor: colors.primary }}
        >
          Nueva Temporada
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingSeason ? 'Editar Temporada' : 'Nueva Temporada'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Fecha Fin</label>
                <input
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: colors.primary }}
              >
                {editingSeason ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Fecha Inicio</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Fecha Fin</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Estado</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {seasons.map((season) => (
              <tr key={season.ID} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-text">{season.nombre}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {new Date(season.fechaInicio).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {new Date(season.fechaFin).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded ${season.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {season.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(season)}
                    className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(season.ID)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {seasons.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  No hay temporadas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}