import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors } from '../config';

interface SeasonDate {
  ID: number;
  fecha: string;
  activa: boolean;
  seasonID?: number;
}

interface Season {
  ID: number;
  nombre: string;
}

export default function DatesPage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [dates, setDates] = useState<SeasonDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [formData, setFormData] = useState({ fecha: '' });
  const [bulkData, setBulkData] = useState({ fechaInicio: '', fechaFin: '' });

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      loadDates();
    }
  }, [selectedSeason]);

  const loadSeasons = async () => {
    try {
      const res = await api.get('/seasons');
      setSeasons(res.data);
      if (res.data.length > 0) {
        setSelectedSeason(res.data[0].ID);
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDates = async () => {
    if (!selectedSeason) return;
    try {
      const res = await api.get(`/seasons/${selectedSeason}/dates`);
      setDates(res.data);
    } catch (error) {
      console.error('Error loading dates:', error);
    }
  };

  const handleAddDate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fechaLocal = new Date(formData.fecha + 'T00:00:00');
      const fechaISO = fechaLocal.toISOString().split('T')[0];
      
      await api.post(`/seasons/${selectedSeason}/dates`, { fecha: fechaISO });
      loadDates();
      setShowForm(false);
      setFormData({ fecha: '' });
    } catch (error) {
      console.error('Error adding date:', error);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fechaInicioLocal = new Date(bulkData.fechaInicio + 'T00:00:00');
      const fechaFinLocal = new Date(bulkData.fechaFin + 'T00:00:00');
      
      const bulkPayload = {
        fechaInicio: fechaInicioLocal.toISOString().split('T')[0],
        fechaFin: fechaFinLocal.toISOString().split('T')[0]
      };
      
      await api.post(`/seasons/${selectedSeason}/dates/bulk`, bulkPayload);
      loadDates();
      setShowBulkForm(false);
      setBulkData({ fechaInicio: '', fechaFin: '' });
    } catch (error) {
      console.error('Error adding bulk dates:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta fecha?')) return;
    try {
      await api.delete(`/seasons/${selectedSeason}/dates/${id}`);
      loadDates();
    } catch (error) {
      console.error('Error deleting date:', error);
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
          <h1 className="text-2xl font-bold text-text">Fechas de Asistencia</h1>
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-text mb-2">Seleccionar Temporada</label>
        <select
          value={selectedSeason || ''}
          onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg"
        >
          {seasons.map((season) => (
            <option key={season.ID} value={season.ID}>
              {season.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded text-white text-sm"
          style={{ backgroundColor: colors.primary }}
        >
          + Agregar Fecha
        </button>
        <button
          onClick={() => setShowBulkForm(true)}
          className="px-4 py-2 rounded text-white text-sm"
          style={{ backgroundColor: colors.secondary }}
        >
          + Importar Rango
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Agregar Fecha</h2>
          <form onSubmit={handleAddDate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: colors.primary }}
              >
                Agregar
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

      {showBulkForm && (
        <div className="bg-surface rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Importar Rango de Fechas</h2>
          <form onSubmit={handleBulkAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  value={bulkData.fechaInicio}
                  onChange={(e) => setBulkData({ ...bulkData, fechaInicio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Fecha Fin</label>
                <input
                  type="date"
                  value={bulkData.fechaFin}
                  onChange={(e) => setBulkData({ ...bulkData, fechaFin: e.target.value })}
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
                Importar
              </button>
              <button
                type="button"
                onClick={() => setShowBulkForm(false)}
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
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Día</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Estado</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dates
              .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              .map((date) => {
                const dateObj = new Date(date.fecha + 'T12:00:00');
                return (
                <tr key={date.ID} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-text">
                    {dateObj.toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {dateObj.toLocaleDateString('es-CL', { weekday: 'long' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${date.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {date.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(date.ID)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )})}
            {dates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                  No hay fechas registradas para esta temporada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}