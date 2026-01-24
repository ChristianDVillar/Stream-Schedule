import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, loginWithGoogle, loginWithTwitch } from '../api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login({ setUser, setToken }) {
  const { t } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [licenseOption, setLicenseOption] = useState('trial'); // 'trial' or 'monthly'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  // Check for OAuth error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    if (oauthError === 'oauth_failed') {
      setError(t('login.oauthFailed') || 'OAuth authentication failed. Please try again.');
      // Clean URL
      window.history.replaceState({}, document.title, '/login');
    }
  }, [t]);

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
        // Convert licenseOption to startWithTrial format for backend
        // 'trial' -> startWithTrial: true
        // 'monthly' -> startWithTrial: false, licenseOption: 'monthly' (creates monthly license directly)
        const startWithTrial = licenseOption === 'trial';
        await register({ username, email, password, startWithTrial, licenseOption });
      }
      const res = await login({ email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      const alert = res.data.user?.licenseAlert;
      const licenseType = res.data.user?.licenseType;
      
      // Show welcome message based on license type
      if (isRegister && licenseType === 'trial') {
        setNotice(t('login.trialWelcome'));
      } else if (isRegister && licenseType === 'monthly') {
        setNotice(t('login.monthlyAccountCreated'));
      } else if (isRegister && (!licenseType || licenseType === 'none')) {
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

  const handleOAuthLogin = (provider) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    
    if (provider === 'google') {
      loginWithGoogle();
    } else if (provider === 'twitch') {
      loginWithTwitch();
    }
    // Note: The OAuth flow will redirect the user to the provider
    // and then back to the app. The backend should handle the callback
    // and redirect to the dashboard with the token.
  };

  // Google Icon SVG
  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  // Twitch Icon SVG
  const TwitchIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" fill="#9146FF"/>
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">{isRegister ? t('login.createAccount') : t('login.title')}</h1>
        {error && <div className="mb-4 text-red-600 dark:text-red-400 text-center">{error}</div>}
        {notice && <div className="mb-4 text-yellow-700 dark:text-yellow-400 text-center">{notice}</div>}
        
        {/* OAuth Buttons */}
        <div className="mb-6 space-y-3">
          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            <span className="font-medium">{isRegister ? t('login.signUpWithGoogle') : t('login.signInWithGoogle')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin('twitch')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TwitchIcon />
            <span className="font-medium">{isRegister ? t('login.signUpWithTwitch') : t('login.signInWithTwitch')}</span>
          </button>
        </div>
        
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t('login.orContinueWith')}</span>
          </div>
        </div>
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
                    checked={licenseOption === 'trial'}
                    onChange={() => setLicenseOption('trial')}
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
                    value="monthly"
                    checked={licenseOption === 'monthly'}
                    onChange={() => setLicenseOption('monthly')}
                    className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('login.monthlyOption')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('login.monthlyDescription')}</div>
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
