import React, { useEffect, useState } from 'react';
import { getAllUsers, adminGenerateLicense, adminChangeEmail, adminResetPassword, adminCreateUser, adminUpdateLicense, getPaymentStats } from '../api';

const mockLogs = [
  { id: 1, action: 'User admin@example.com created', date: '2025-07-21 10:00' },
  { id: 2, action: 'License generated for user1@example.com', date: '2025-07-21 10:05' },
  { id: 3, action: 'User user2@example.com email changed', date: '2025-07-21 10:10' },
];

export default function AdminDashboard({ token, user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState({});
  const [editingEmail, setEditingEmail] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [resetting, setResetting] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createData, setCreateData] = useState({
    username: '',
    email: '',
    password: '',
    isAdmin: false
  });
  const [licenseEdits, setLicenseEdits] = useState({});
  const [revenue, setRevenue] = useState({
    currency: 'USD',
    currentMonthAmount: 0,
    monthlyTotals: []
  });

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllUsers(token);
      setUsers(res.data);
      const stats = await getPaymentStats(token);
      setRevenue(stats.data);
    } catch (err) {
      setError('Error loading users');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateLicense(userId, licenseType) {
    setGenerating(prev => ({ ...prev, [userId]: true }));
    try {
      await adminGenerateLicense({ userId, licenseType, token });
      await fetchUsers();
    } catch (err) {
      alert('Error generating license');
    } finally {
      setGenerating(prev => ({ ...prev, [userId]: false }));
    }
  }

  function handleEditEmail(user) {
    setEditingEmail(user.id);
    setNewEmail(user.email);
  }

  function handleCancelEdit() {
    setEditingEmail(null);
    setNewEmail('');
  }

  async function handleSaveEmail(userId) {
    try {
      await adminChangeEmail({ userId, newEmail, token });
      setEditingEmail(null);
      setNewEmail('');
      await fetchUsers();
      alert('Email updated successfully');
    } catch (err) {
      alert('Error updating email');
    }
  }

  async function handleResetPassword(userId) {
    setResetting(userId);
    try {
      await adminResetPassword({ userId, token });
      alert('Password reset to changeme123');
    } catch (err) {
      alert('Error resetting password');
    }
    setResetting(null);
  }

  async function handleCreateUser() {
    if (!createData.username || !createData.email || !createData.password) {
      alert('Por favor completa username, email y password');
      return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createData.email)) {
      alert('Por favor ingresa un email válido');
      return;
    }
    
    // Validar password mínimo
    if (createData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setCreating(true);
    setError(null);
    try {
      const response = await adminCreateUser({ ...createData, token });
      setCreateData({ username: '', email: '', password: '', isAdmin: false });
      await fetchUsers();
      alert(`✅ Usuario creado exitosamente!\nEmail: ${response.data.email}\nUsername: ${response.data.username}`);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al crear usuario';
      alert(`❌ ${errorMessage}`);
      console.error('Error creating user:', err);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateLicense(userId) {
    const licenseType = licenseEdits[userId];
    if (!licenseType) return;
    if (!token) {
      alert('Sesión expirada. Inicia sesión de nuevo.');
      return;
    }
    try {
      await adminUpdateLicense({ userId, licenseType, token });
      await fetchUsers();
      alert('License updated');
    } catch (err) {
      alert('Error updating license');
    }
  }

  const stats = {
    totalUsers: users.length,
    admins: users.filter(u => u.isAdmin).length,
    licensed: users.filter(u => u.licenseKey).length,
    expiringSoon: users.filter(u => u.licenseAlert === '7_days' || u.licenseAlert === '3_days').length,
    expired: users.filter(u => u.licenseAlert === 'expired').length,
    monthlyRevenue: revenue.currentMonthAmount || 0
  };

  const expiringUsers = users.filter(u => u.licenseAlert === '7_days' || u.licenseAlert === '3_days' || u.licenseAlert === 'expired');

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-blue-900">Admin Dashboard</h1>
        {onLogout && (
          <button onClick={onLogout} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:from-blue-700 hover:to-purple-700">Logout</button>
        )}
      </div>
      <div className="mb-8 p-6 rounded-lg shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">Bienvenido, <span className="font-bold">{user?.username}</span></h2>
        <p className="text-gray-700">Gestiona usuarios, licencias y revisa logs del sistema.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-t-4 border-blue-400">
          <p className="text-sm text-gray-500">Usuarios</p>
          <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-t-4 border-purple-400">
          <p className="text-sm text-gray-500">Admins</p>
          <p className="text-2xl font-bold text-purple-900">{stats.admins}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-t-4 border-green-400">
          <p className="text-sm text-gray-500">Con licencia</p>
          <p className="text-2xl font-bold text-green-900">{stats.licensed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-t-4 border-yellow-400">
          <p className="text-sm text-gray-500">Por vencer</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.expiringSoon}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-t-4 border-red-400">
          <p className="text-sm text-gray-500">Vencidas</p>
          <p className="text-2xl font-bold text-red-700">{stats.expired}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-t-4 border-emerald-400">
          <p className="text-sm text-gray-500">Ganancias del mes</p>
          <p className="text-2xl font-bold text-emerald-700">
            {revenue.currency} {stats.monthlyRevenue.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Create user */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-green-400">
          <h3 className="text-lg font-bold text-green-700 mb-4">Crear usuario</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Username"
              value={createData.username}
              onChange={e => setCreateData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              type="email"
              placeholder="Email"
              value={createData.email}
              onChange={e => setCreateData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              type="password"
              placeholder="Password"
              value={createData.password}
              onChange={e => setCreateData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
            />
            <label className="flex items-center space-x-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={createData.isAdmin}
                onChange={e => setCreateData(prev => ({ ...prev, isAdmin: e.target.checked }))}
              />
              <span>Admin</span>
            </label>
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
        {/* Licencias asignadas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-blue-400">
          <h3 className="text-lg font-bold text-blue-700 mb-4">Licencias asignadas</h3>
          <ul className="space-y-2">
            {users.filter(u => u.licenseKey).length === 0 ? (
              <li className="text-gray-500">No hay licencias asignadas.</li>
            ) : (
              users.filter(u => u.licenseKey).map(u => (
                <li key={u.id} className="flex items-center justify-between bg-blue-50 rounded px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-mono text-blue-900">{u.licenseKey}</span>
                    <span className="text-xs text-gray-600">
                      {u.licenseType === 'lifetime' ? 'De por vida' : 'Temporal 30 días'}
                      {u.licenseExpiresAt ? ` · vence ${new Date(u.licenseExpiresAt).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700">{u.username}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        {/* Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-purple-400">
          <h3 className="text-lg font-bold text-purple-700 mb-4">Logs recientes</h3>
          <ul className="space-y-2 text-sm">
            {mockLogs.map(log => (
              <li key={log.id} className="flex items-center justify-between">
                <span className="text-gray-700">{log.action}</span>
                <span className="text-gray-400">{log.date}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-yellow-500 mb-8">
        <h3 className="text-lg font-bold text-yellow-700 mb-4">Licencias por renovar</h3>
        {expiringUsers.length === 0 ? (
          <p className="text-gray-500">No hay licencias próximas a vencer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded">
              <thead className="bg-yellow-50">
                <tr>
                  <th className="px-4 py-2 border">Usuario</th>
                  <th className="px-4 py-2 border">Email</th>
                  <th className="px-4 py-2 border">Tipo</th>
                  <th className="px-4 py-2 border">Expira</th>
                  <th className="px-4 py-2 border">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {expiringUsers.map(u => (
                  <tr key={u.id} className="hover:bg-yellow-50">
                    <td className="px-4 py-2 border">{u.username}</td>
                    <td className="px-4 py-2 border">{u.email}</td>
                    <td className="px-4 py-2 border">
                      {u.licenseType === 'lifetime' && 'De por vida'}
                      {u.licenseType === 'monthly' && 'Mensual'}
                      {u.licenseType === 'quarterly' && 'Cada 3 meses'}
                      {u.licenseType === 'temporary' && 'Temporal 30 días'}
                      {!u.licenseType && '—'}
                    </td>
                    <td className="px-4 py-2 border">{u.licenseExpiresAt ? new Date(u.licenseExpiresAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2 border">
                      {u.licenseAlert === 'expired' && <span className="text-red-600 font-semibold">Vencida</span>}
                      {u.licenseAlert === '3_days' && <span className="text-red-600 font-semibold">3 días</span>}
                      {u.licenseAlert === '7_days' && <span className="text-yellow-600 font-semibold">7 días</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-emerald-500 mb-8">
        <h3 className="text-lg font-bold text-emerald-700 mb-4">Ganancias mensuales</h3>
        {revenue.monthlyTotals.length === 0 ? (
          <p className="text-gray-500">No hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded">
              <thead className="bg-emerald-50">
                <tr>
                  <th className="px-4 py-2 border">Mes</th>
                  <th className="px-4 py-2 border">Monto</th>
                </tr>
              </thead>
              <tbody>
                {revenue.monthlyTotals.map(row => (
                  <tr key={row.month} className="hover:bg-emerald-50">
                    <td className="px-4 py-2 border">{row.month}</td>
                    <td className="px-4 py-2 border">
                      {revenue.currency} {Number(row.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-600">
        <h3 className="text-lg font-bold text-blue-800 mb-4">Usuarios</h3>
        {loading ? (
          <p>Loading users...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded">
              <thead className="bg-gradient-to-r from-blue-100 to-purple-100">
                <tr>
                  <th className="px-4 py-2 border">ID</th>
                  <th className="px-4 py-2 border">Username</th>
                  <th className="px-4 py-2 border">Email</th>
                  <th className="px-4 py-2 border">License Key</th>
                  <th className="px-4 py-2 border">Tipo</th>
                  <th className="px-4 py-2 border">Expira</th>
                  <th className="px-4 py-2 border">Alerta</th>
                  <th className="px-4 py-2 border">Admin</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-blue-50">
                    <td className="px-4 py-2 border">{u.id}</td>
                    <td className="px-4 py-2 border">{u.username}</td>
                    <td className="px-4 py-2 border">
                      {editingEmail === u.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="email"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            className="border px-2 py-1 rounded"
                          />
                          <button onClick={() => handleSaveEmail(u.id)} className="text-green-600 font-bold">Save</button>
                          <button onClick={handleCancelEdit} className="text-gray-500">Cancel</button>
                        </div>
                      ) : (
                        <span>{u.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border font-mono">{u.licenseKey || <span className="text-gray-400">None</span>}</td>
                    <td className="px-4 py-2 border">
                      {u.licenseType === 'lifetime' && 'De por vida'}
                      {u.licenseType === 'monthly' && 'Mensual'}
                      {u.licenseType === 'quarterly' && 'Cada 3 meses'}
                      {u.licenseType === 'temporary' && 'Temporal 30 días'}
                      {!u.licenseType && '—'}
                    </td>
                    <td className="px-4 py-2 border">
                      {u.licenseExpiresAt ? new Date(u.licenseExpiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 border">
                      {u.licenseAlert === 'expired' && <span className="text-red-600 font-semibold">Vencida</span>}
                      {u.licenseAlert === '3_days' && <span className="text-red-600 font-semibold">3 días</span>}
                      {u.licenseAlert === '7_days' && <span className="text-yellow-600 font-semibold">7 días</span>}
                      {(!u.licenseAlert || u.licenseAlert === 'none') && <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-2 border">{u.isAdmin ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2 border">
                      <div className="flex flex-wrap gap-2 items-center">
                        {!u.licenseKey && (
                          <>
                            <button
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={generating[u.id]}
                              onClick={() => handleGenerateLicense(u.id, 'monthly')}
                              title="Generar licencia mensual"
                            >
                              {generating[u.id] ? '...' : 'Mensual'}
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={generating[u.id]}
                              onClick={() => handleGenerateLicense(u.id, 'lifetime')}
                              title="Generar licencia de por vida"
                            >
                              {generating[u.id] ? '...' : 'Vida'}
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={generating[u.id]}
                              onClick={() => handleGenerateLicense(u.id, 'quarterly')}
                              title="Generar licencia trimestral"
                            >
                              {generating[u.id] ? '...' : '3M'}
                            </button>
                          </>
                        )}
                        <div className="flex items-center gap-1">
                          <select
                            value={licenseEdits[u.id] || u.licenseType || 'none'}
                            onChange={e => setLicenseEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                            className="border px-2 py-1 rounded text-xs bg-white dark:bg-gray-900"
                            title="Seleccionar tipo de licencia"
                          >
                            <option value="none">Sin licencia</option>
                            <option value="monthly">Mensual</option>
                            <option value="quarterly">Cada 3 meses</option>
                            <option value="temporary">Temporal 30 días</option>
                            <option value="lifetime">De por vida</option>
                          </select>
                          <button
                            className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800"
                            onClick={() => handleUpdateLicense(u.id)}
                            title="Actualizar licencia"
                          >
                            ✓
                          </button>
                        </div>
                        <button
                          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                          onClick={() => handleEditEmail(u)}
                          title="Editar email"
                        >
                          📧
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={resetting === u.id}
                          onClick={() => handleResetPassword(u.id)}
                          title="Resetear contraseña"
                        >
                          {resetting === u.id ? '...' : '🔑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 
