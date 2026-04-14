import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { colors } from '../config';

interface User {
  ID: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'voluntario';
  temporadas: string | null;
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'voluntario' as 'superadmin' | 'admin' | 'voluntario',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        const updateData: any = { nombre: formData.nombre, apellido: formData.apellido, email: formData.email, rol: formData.rol };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/users/${editingUser.ID}`, updateData);
      } else {
        await api.post('/users', formData);
      }
      loadUsers();
      setShowForm(false);
      setEditingUser(null);
      setFormData({ nombre: '', apellido: '', email: '', password: '', rol: 'voluntario' });
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
            setFormData({ nombre: '', apellido: '', email: '', password: '', rol: 'voluntario' });
          }}
          className="px-4 py-2 rounded text-white text-sm"
          style={{ backgroundColor: colors.primary }}
        >
          Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
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
            <div className="flex gap-2">
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
      )}

      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Rol</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
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
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}