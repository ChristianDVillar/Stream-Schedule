import React, { useEffect, useState } from 'react';
import { getAllUsers, adminGenerateLicense } from '../api';

export default function AdminDashboard({ token, user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState({});

  useEffect(() => {
    if (user && user.isAdmin) fetchUsers();
    // eslint-disable-next-line
  }, [user]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllUsers(token);
      setUsers(res.data);
    } catch (err) {
      setError('Error loading users');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateLicense(userId) {
    setGenerating(prev => ({ ...prev, [userId]: true }));
    try {
      await adminGenerateLicense({ userId, token });
      await fetchUsers();
    } catch (err) {
      alert('Error generating license');
    } finally {
      setGenerating(prev => ({ ...prev, [userId]: false }));
    }
  }

  if (!user || !user.isAdmin) {
    return <div className="max-w-2xl mx-auto py-8 text-center text-red-600 font-bold">Access denied: Admins only</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      {loading ? (
        <p>Loading users...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <table className="min-w-full bg-white border rounded">
          <thead>
            <tr>
              <th className="px-4 py-2 border">ID</th>
              <th className="px-4 py-2 border">Username</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">License Key</th>
              <th className="px-4 py-2 border">Admin</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-4 py-2 border">{user.id}</td>
                <td className="px-4 py-2 border">{user.username}</td>
                <td className="px-4 py-2 border">{user.email}</td>
                <td className="px-4 py-2 border font-mono">{user.licenseKey || <span className="text-gray-400">None</span>}</td>
                <td className="px-4 py-2 border">{user.isAdmin ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 border">
                  {!user.licenseKey && (
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                      disabled={generating[user.id]}
                      onClick={() => handleGenerateLicense(user.id)}
                    >
                      {generating[user.id] ? 'Generating...' : 'Generate License'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 