import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors } from '../config';
import type { Season, Team, TeamMentor } from '../types';

interface User {
  ID: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'voluntario';
  temporadas: number[];
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMentorAssignments, setTeamMentorAssignments] = useState<TeamMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'voluntario' as 'superadmin' | 'admin' | 'voluntario',
    temporadas: [] as number[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, seasonsRes, teamsRes, teamMentorsRes] = await Promise.all([
        api.get('/users'),
        api.get('/seasons'),
        api.get('/teams'),
        api.get('/teams/mentors'),
      ]);
      setUsers(usersRes.data);
      setSeasons(seasonsRes.data);
      setTeams(teamsRes.data);
      setTeamMentorAssignments(teamMentorsRes.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const seasonNameById = (seasonID: number) =>
    seasons.find((season) => season.ID === seasonID)?.nombre ?? `Temporada #${seasonID}`;

  const teamsForUser = (user: User) => {
    const allowedSeasonIds = user.rol === 'superadmin'
      ? new Set(teams.map((team) => team.seasonID))
      : new Set(user.temporadas);

    return teamMentorAssignments
      .filter((assignment) => assignment.mentorID === user.ID && allowedSeasonIds.has(assignment.seasonID))
      .map((assignment) => teams.find((team) => team.ID === assignment.teamID))
      .filter((team): team is Team => Boolean(team) && allowedSeasonIds.has(team.seasonID));
  };

  const toggleSeason = (seasonID: number) => {
    setFormData((prev) => ({
      ...prev,
      temporadas: prev.temporadas.includes(seasonID)
        ? prev.temporadas.filter((id) => id !== seasonID)
        : [...prev.temporadas, seasonID],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const updateData: any = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          rol: formData.rol,
          temporadas: formData.temporadas,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/users/${editingUser.ID}`, updateData);
      } else {
        await api.post('/users', formData);
      }
      loadData();
      setShowForm(false);
      setEditingUser(null);
      setFormData({ nombre: '', apellido: '', email: '', password: '', rol: 'voluntario', temporadas: [] });
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      password: '',
      rol: user.rol,
      temporadas: user.temporadas || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const roleLabels = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    voluntario: 'Voluntario',
  };

  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('es-CL');
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.nombre} ${user.apellido}`.toLocaleLowerCase('es-CL');
    const matchesName = !normalizedSearchTerm || fullName.includes(normalizedSearchTerm);
    const matchesSeason = !selectedSeason
      || user.rol === 'superadmin'
      || user.temporadas.includes(Number(selectedSeason));
    const matchesRole = !selectedRole || user.rol === selectedRole;

    return matchesName && matchesSeason && matchesRole;
  });

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
          <h1 className="text-2xl font-bold text-text">Gestión de Usuarios</h1>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingUser(null);
            setFormData({ nombre: '', apellido: '', email: '', password: '', rol: 'voluntario', temporadas: [] });
          }}
          className="px-4 py-2 rounded text-white text-sm"
          style={{ backgroundColor: colors.primary }}
        >
          Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-text mb-1">Apellido</label>
                <input
                  type="text"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Contraseña {editingUser && '(dejar vacío para mantener)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required={!editingUser}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Rol</label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="voluntario">Voluntario</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <label className="block text-sm font-medium text-text">Temporadas</label>
                <span className="text-xs text-text-muted">
                  {formData.rol === 'superadmin'
                    ? 'El superadmin tiene acceso a todas las temporadas'
                    : 'Selecciona una o más temporadas para este usuario'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-gray-200 p-3 max-h-56 overflow-y-auto">
                {seasons.map((season) => {
                  const checked = formData.temporadas.includes(season.ID);
                  return (
                    <label
                      key={season.ID}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                        checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSeason(season.ID)}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-text">
                          {season.nombre}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {new Date(season.fechaInicio).toLocaleDateString('es-CL')} - {new Date(season.fechaFin).toLocaleDateString('es-CL')}
                        </span>
                      </span>
                    </label>
                  );
                })}
                {seasons.length === 0 && (
                  <div className="col-span-full text-sm text-text-muted">
                    No hay temporadas disponibles para configurar.
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded text-white text-sm disabled:opacity-50"
                style={{ backgroundColor: colors.primary }}
              >
                {submitting ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear')}
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
        </div>
      )}

      <div className="bg-surface rounded-lg shadow p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div>
            <label htmlFor="user-search" className="block text-sm font-medium text-text mb-1">
              Buscar por nombre
            </label>
            <input
              id="user-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre o apellido"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="season-filter" className="block text-sm font-medium text-text mb-1">
              Temporada
            </label>
            <select
              id="season-filter"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todas las temporadas</option>
              {seasons.map((season) => (
                <option key={season.ID} value={season.ID}>{season.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-text mb-1">
              Rol
            </label>
            <select
              id="role-filter"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Todos los roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="voluntario">Voluntario</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Rol</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Temporadas</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Equipos</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.ID} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-text">
                  {user.nombre} {user.apellido}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    user.rol === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                    user.rol === 'admin' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {roleLabels[user.rol]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {user.rol === 'superadmin'
                    ? 'Todas'
                    : user.temporadas.length > 0
                      ? (
                        <div className="flex flex-wrap gap-1">
                          {user.temporadas.map((seasonID) => (
                            <span
                              key={seasonID}
                              className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700"
                            >
                              {seasonNameById(seasonID)}
                            </span>
                          ))}
                        </div>
                      )
                      : 'Sin temporadas'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {teamsForUser(user).length > 0
                    ? (
                      <div className="flex flex-wrap gap-1">
                        {teamsForUser(user).map((team) => (
                          <span
                            key={team.ID}
                            className="px-2 py-0.5 text-[11px] rounded-full bg-green-100 text-green-800"
                          >
                            {team.nombre} · {seasonNameById(team.seasonID)}
                          </span>
                        ))}
                      </div>
                    )
                    : 'Sin equipo'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(user.ID)}
                    disabled={deletingId === user.ID}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    {deletingId === user.ID ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  {users.length === 0 ? 'No hay usuarios registrados' : 'No hay usuarios que coincidan con los filtros'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
