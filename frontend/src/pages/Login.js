import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, loginWithGoogle, loginWithTwitch, loginWithTwitter, loginWithDiscord, forgotPassword } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login({ setAuth }) {
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Check for OAuth error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    if (oauthError === 'oauth_failed') {
      setError(t('login.oauthFailed') || 'OAuth authentication failed. Please try again.');
    } else if (oauthError === 'discord_not_configured') {
      setError(t('login.discordNotConfigured') || 'Discord login is not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in the backend .env with the numeric Application ID from Discord Developer Portal.');
    } else if (oauthError === 'twitch_not_configured') {
      setError(t('login.twitchNotConfigured') || 'Twitch login is not configured. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in the backend .env file.');
    }
    if (oauthError) {
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
        const registerRes = await register({ username, email, password, startWithTrial, licenseOption });
        
        // If registration returns token, use it directly (no need to login again)
        if (registerRes.data.token && registerRes.data.user) {
          setAuth(registerRes.data.user, registerRes.data.token);
          const alert = registerRes.data.user?.licenseAlert;
          const licenseType = registerRes.data.user?.licenseType;
          
          // Show welcome message based on license type
          if (licenseType === 'trial') {
            setNotice(t('login.trialWelcome'));
          } else if (licenseType === 'monthly') {
            setNotice(t('login.monthlyAccountCreated'));
          } else if (!licenseType || licenseType === 'none') {
            setNotice(t('login.accountCreated'));
          }
          navigate('/dashboard');
          return;
        }
      }
      
      // Regular login flow (for existing users or if registration didn't return token)
      const res = await login({ email, password });
      setAuth(res.data.user, res.data.token);
      const alert = res.data.user?.licenseAlert;
      const licenseType = res.data.user?.licenseType;
      
      // Show welcome message (only for non-registration logins)
      if (alert === 'expired') {
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

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (provider === 'google') {
        await loginWithGoogle(isRegister);
      } else if (provider === 'twitch') {
        loginWithTwitch();
      } else if (provider === 'twitter') {
        await loginWithTwitter();
      } else if (provider === 'discord') {
        loginWithDiscord();
      }
    } catch (err) {
      setError(err?.message || err?.response?.data?.error || t('login.oauthFailed') || 'OAuth failed. Please try again.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError(t('login.emailRequired') || 'Email is required');
      return;
    }
    setResetLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await forgotPassword({ email: resetEmail });
      if (res.data.tempPassword) {
        setNotice(t('login.passwordResetSuccess') || `Password reset! Your temporary password is: ${res.data.tempPassword}. Please change it after logging in.`);
      } else {
        setNotice(t('login.passwordResetEmailSent') || 'If an account with that email exists, a password reset has been processed.');
      }
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (err) {
      setError(err.response?.data?.error || t('login.passwordResetFailed') || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
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

  // Discord Icon SVG
  const DiscordIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/>
    </svg>
  );

  // X (Twitter) Icon SVG
  const TwitterIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-lg shadow-md w-full max-w-sm min-w-0">
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
          <button
            type="button"
            onClick={() => handleOAuthLogin('twitter')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TwitterIcon />
            <span className="font-medium">{isRegister ? t('login.signUpWithTwitter') : t('login.signInWithTwitter')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin('discord')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DiscordIcon />
            <span className="font-medium">{isRegister ? t('login.signUpWithDiscord') : t('login.signInWithDiscord')}</span>
          </button>
        </div>
        
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{isRegister ? t('login.orCompleteForm') : t('login.orContinueWith')}</span>
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
              autoComplete="username"
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
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="login-password" className="block text-gray-700 dark:text-gray-300 mb-2">{t('common.password')}</label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowPassword(true);
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                setShowPassword(false);
              }}
              onMouseLeave={(e) => {
                e.preventDefault();
                setShowPassword(false);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                setShowPassword(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setShowPassword(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none select-none cursor-pointer"
              tabIndex={-1}
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        </div>
        {isRegister && (
          <>
            <div className="mb-6">
              <label htmlFor="login-confirm" className="block text-gray-700 dark:text-gray-300 mb-2">{t('common.confirmPassword')}</label>
              <div className="relative">
                <input
                  id="login-confirm"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowConfirmPassword(true);
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    setShowConfirmPassword(false);
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault();
                    setShowConfirmPassword(false);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setShowConfirmPassword(true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setShowConfirmPassword(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none select-none cursor-pointer"
                  tabIndex={-1}
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
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
        
        {!isRegister && (
          <button
            type="button"
            className="w-full mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            onClick={() => {
              setError(null);
              setShowForgotPassword(true);
            }}
          >
            {t('login.forgotPassword')}
          </button>
        )}
        
        <button
          type="button"
          className="w-full mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          onClick={() => {
            setError(null);
            setShowForgotPassword(false);
            setIsRegister(!isRegister);
          }}
        >
          {isRegister ? t('login.alreadyHaveAccount') : t('login.createUser')}
        </button>
        
        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{t('login.resetPassword')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('login.resetPasswordInstructions') || 'Enter your email address and we will reset your password.'}
              </p>
              <form onSubmit={handleForgotPassword}>
                <div className="mb-4">
                  <label htmlFor="reset-email" className="block text-gray-700 dark:text-gray-300 mb-2">{t('common.email')}</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('common.email')}
                    required
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]"
                    disabled={resetLoading}
                  >
                    {resetLoading ? t('common.loading') || 'Loading...' : t('login.resetPassword') || 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setError(null);
                    }}
                    className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </form>
    </div>
  );
} 
