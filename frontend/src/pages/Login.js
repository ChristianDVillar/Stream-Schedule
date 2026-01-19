import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api';

export default function Login({ setUser, setToken }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (isRegister) {
        if (!username.trim()) {
          setError('Username is required');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        await register({ username, email, password });
      }
      const res = await login({ email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      const alert = res.data.user?.licenseAlert;
      if (alert === 'expired') {
        setNotice('Tu licencia está vencida. Por favor renueva para continuar.');
      } else if (alert === '7_days') {
        setNotice('Tu licencia vence en 7 días. Te recomendamos renovarla.');
      } else if (alert === '3_days') {
        setNotice('Tu licencia vence en 3 días. Te recomendamos renovarla.');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || (isRegister ? 'Register failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">{isRegister ? 'Crear cuenta' : 'Login'}</h1>
        {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
        {notice && <div className="mb-4 text-yellow-700 text-center">{notice}</div>}
        {isRegister && (
          <div className="mb-4">
            <label htmlFor="login-username" className="block text-gray-700 mb-2">Username</label>
            <input
              id="login-username"
              name="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="login-email" className="block text-gray-700 mb-2">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="login-password" className="block text-gray-700 mb-2">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        {isRegister && (
          <div className="mb-6">
            <label htmlFor="login-confirm" className="block text-gray-700 mb-2">Confirm Password</label>
            <input
              id="login-confirm"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? (isRegister ? 'Creando...' : 'Logging in...') : (isRegister ? 'Crear cuenta' : 'Login')}
        </button>
        <button
          type="button"
          className="w-full mt-4 text-sm text-blue-600 hover:underline"
          onClick={() => {
            setError(null);
            setIsRegister(!isRegister);
          }}
        >
          {isRegister ? 'Ya tengo cuenta' : 'Crear usuario'}
        </button>
      </form>
    </div>
  );
} 
