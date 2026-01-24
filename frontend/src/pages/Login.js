import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login({ setUser, setToken }) {
  const { t } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [startWithTrial, setStartWithTrial] = useState(true); // Default to trial
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
          setError(t('login.usernameRequired') || 'Username is required');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t('login.passwordsDoNotMatch') || 'Passwords do not match');
          setLoading(false);
          return;
        }
        await register({ username, email, password, startWithTrial });
      }
      const res = await login({ email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      const alert = res.data.user?.licenseAlert;
      const licenseType = res.data.user?.licenseType;
      
      // Show trial welcome message
      if (isRegister && licenseType === 'trial') {
        setNotice(t('login.trialWelcome'));
      } else if (isRegister && !licenseType) {
        setNotice(t('login.accountCreated'));
      } else if (alert === 'expired') {
        setNotice(t('login.licenseExpired'));
      } else if (alert === '7_days') {
        setNotice(t('login.licenseExpires7Days'));
      } else if (alert === '3_days') {
        setNotice(t('login.licenseExpires3Days'));
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || (isRegister ? t('login.registerFailed') : t('login.loginFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">{isRegister ? t('login.createAccount') : t('login.title')}</h1>
        {error && <div className="mb-4 text-red-600 dark:text-red-400 text-center">{error}</div>}
        {notice && <div className="mb-4 text-yellow-700 dark:text-yellow-400 text-center">{notice}</div>}
        {isRegister && (
          <div className="mb-4">
            <label htmlFor="login-username" className="block text-gray-700 dark:text-gray-300 mb-2">{t('common.username')}</label>
            <input
              id="login-username"
              name="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="login-email" className="block text-gray-700 dark:text-gray-300 mb-2">{t('common.email')}</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="login-password" className="block text-gray-700 dark:text-gray-300 mb-2">{t('common.password')}</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        {isRegister && (
          <>
            <div className="mb-6">
              <label htmlFor="login-confirm" className="block text-gray-700 dark:text-gray-300 mb-2">{t('common.confirmPassword')}</label>
              <input
                id="login-confirm"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <label className="block text-gray-700 dark:text-gray-300 mb-3 font-semibold">{t('login.howToStart')}</label>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="registrationOption"
                    value="trial"
                    checked={startWithTrial === true}
                    onChange={() => setStartWithTrial(true)}
                    className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('login.trialOption')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('login.trialDescription')}</div>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="registrationOption"
                    value="purchase"
                    checked={startWithTrial === false}
                    onChange={() => setStartWithTrial(false)}
                    className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('login.purchaseOption')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('login.purchaseDescription')}</div>
                  </div>
                </label>
              </div>
            </div>
          </>
        )}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          {loading ? (isRegister ? t('common.creating') || 'Creating...' : t('common.loggingIn') || 'Logging in...') : (isRegister ? t('login.createAccount') : t('common.login'))}
        </button>
        <button
          type="button"
          className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          onClick={() => {
            setError(null);
            setIsRegister(!isRegister);
          }}
        >
          {isRegister ? t('login.alreadyHaveAccount') : t('login.createUser')}
        </button>
      </form>
    </div>
  );
} 
