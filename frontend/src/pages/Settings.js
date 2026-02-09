import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient, createCheckout, verifyPaymentSession, getLicenseStatus, getAvailableLicenses, getPaymentConfigStatus, createSubscription, getSubscriptionStatus, cancelSubscription, getPaymentHistory, getConnectedAccounts, startDiscordLink, startGoogleLink, startTwitchLink, startTwitterLink, disconnectGoogle, disconnectTwitch, disconnectTwitter, disconnectDiscord } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import { applyAccentColor } from '../utils/themeUtils';
import { getPlatformColors, setPlatformColors, resetPlatformColors, PLATFORM_IDS, DEFAULT_PLATFORM_COLORS } from '../utils/platformColors';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Download, 
  Save, 
  Globe,
  Lock,
  Key,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { handleUpload } from '../utils/uploadHelper';

const Settings = ({ user, token, setUser }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [availableLicenses, setAvailableLicenses] = useState({ monthly: true, quarterly: false, lifetime: false, temporary: false });
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState(null);
  const [connectedAccountsLoading, setConnectedAccountsLoading] = useState(false);
  const [disconnectingKey, setDisconnectingKey] = useState(null);
  const [connectingKey, setConnectingKey] = useState(null);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: '',
    timezone: 'UTC',
    language: 'en',
    merchandisingLink: user?.merchandisingLink || '',
    profileImageUrl: user?.profileImageUrl || '',
    dashboardShowTwitchSubs: user?.dashboardShowTwitchSubs !== false,
    dashboardShowTwitchBits: user?.dashboardShowTwitchBits !== false,
    dashboardShowTwitchDonations: user?.dashboardShowTwitchDonations === true
  });
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    scheduledReminders: true,
    platformUpdates: false,
    weeklyReports: true
  });

  // Security settings
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  const [platformColors, setPlatformColorsState] = useState(() => getPlatformColors());

  // Theme settings (accentColor persisted and applied in themeUtils)
  const [themeSettings, setThemeSettings] = useState({
    theme: localStorage.getItem('theme') || 'light',
    accentColor: (() => {
      try {
        const stored = localStorage.getItem('accentColor');
        return ['blue', 'purple', 'green', 'red', 'orange'].includes(stored) ? stored : 'blue';
      } catch {
        return 'blue';
      }
    })(),
    compactMode: false
  });

  const tabs = [
    { id: 'profile', name: t('settings.profile'), icon: User },
    { id: 'notifications', name: t('settings.notifications'), icon: Bell },
    { id: 'platforms', name: t('settings.platforms'), icon: Globe },
    { id: 'security', name: t('settings.security'), icon: Shield },
    { id: 'appearance', name: t('settings.appearance'), icon: Palette },
    { id: 'billing', name: t('settings.licensesBilling'), icon: Key },
    { id: 'data', name: t('settings.dataExport'), icon: Download }
  ];

  const timezones = [
    'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 
    'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ];

  const themes = [
    { id: 'light', name: t('settings.themeLight'), preview: 'bg-white border-gray-300' },
    { id: 'dark', name: t('settings.themeDark'), preview: 'bg-gray-900 border-gray-600' },
    { id: 'auto', name: t('settings.themeAuto'), preview: 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-400' }
  ];

  const accentColors = [
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'red', name: 'Red', color: 'bg-red-500' },
    { id: 'orange', name: 'Orange', color: 'bg-orange-500' }
  ];

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        merchandisingLink: user.merchandisingLink || '',
        profileImageUrl: user.profileImageUrl || '',
        dashboardShowTwitchSubs: user.dashboardShowTwitchSubs !== false,
        dashboardShowTwitchBits: user.dashboardShowTwitchBits !== false,
        dashboardShowTwitchDonations: user.dashboardShowTwitchDonations === true
      }));
    }
  }, [user]);

  useEffect(() => {
    const applyTheme = (theme) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'auto') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    };

    applyTheme(themeSettings.theme);
  }, [themeSettings.theme]);

  // Apply accent color when selection changes and persist
  useEffect(() => {
    applyAccentColor(themeSettings.accentColor);
  }, [themeSettings.accentColor]);

  useEffect(() => {
    if (token) {
      fetchLicenseStatus();
      fetchSubscriptionStatus();
      fetchPaymentHistory();
      fetchConnectedAccounts();
    }
    fetchAvailableLicenses();
    fetchPaymentConfig();
  }, [token]);

  const fetchConnectedAccounts = async () => {
    if (!token) return;
    setConnectedAccountsLoading(true);
    try {
      const data = await getConnectedAccounts();
      setConnectedAccounts(data);
    } catch (err) {
      console.error('Error fetching connected accounts:', err);
      setConnectedAccounts({ google: false, twitch: false, discord: false, twitter: false, email: false });
    } finally {
      setConnectedAccountsLoading(false);
    }
  };

  // Handle ?linked= and ?error= from OAuth link callbacks
  useEffect(() => {
    const linked = searchParams.get('linked');
    const errorParam = searchParams.get('error');
    if (linked) {
      setActiveTab('platforms');
      toast.success(t(`settings.linked${linked.charAt(0).toUpperCase() + linked.slice(1)}`) || `Linked ${linked}`);
      setSearchParams({}, { replace: true });
      if (token) fetchConnectedAccounts();
    }
    if (errorParam) {
      setActiveTab('platforms');
      const reason = searchParams.get('reason');
      const key = `settings.error_${errorParam.replace(/-/g, '_')}`;
      let msg = t(key) || t('settings.linkFailed');
      if (reason && typeof reason === 'string') {
        const decoded = decodeURIComponent(reason);
        const reasonKey = `settings.reason_${decoded.replace(/\s+/g, '_')}`;
        const translated = t(reasonKey);
        const reasonText = (translated && translated !== reasonKey) ? translated : decoded;
        msg = `${msg} ${t('settings.reason') || 'Reason'}: ${reasonText}`;
      }
      toast.error(msg);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const fetchPaymentConfig = async () => {
    try {
      const res = await getPaymentConfigStatus();
      setPaymentConfig(res.data);
    } catch (error) {
      setPaymentConfig({ 
        paymentEnabled: false, 
        automaticProcessingEnabled: false,
        manualVerificationRequired: false 
      });
    }
  };

  const fetchAvailableLicenses = async () => {
    try {
      const res = await getAvailableLicenses();
      setAvailableLicenses(res.data.availableLicenseTypes || { monthly: true, quarterly: false, lifetime: false, temporary: false });
    } catch (error) {
    }
  };

  const fetchLicenseStatus = async () => {
    try {
      const res = await getLicenseStatus(token);
      setLicenseInfo(res.data);
    } catch (error) {
      setLicenseInfo(null);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await getSubscriptionStatus(token);
      setSubscriptionStatus(res.data);
    } catch (error) {
      setSubscriptionStatus(null);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await getPaymentHistory(token);
      setPaymentHistory(res.data.payments || []);
    } catch (error) {
      setPaymentHistory([]);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm(t('settings.cancelSubscriptionConfirm'))) {
      return;
    }

    setLoadingSubscription(true);
    try {
      await cancelSubscription(token);
      toast.success(t('settings.subscriptionCancelScheduled'));
      await fetchSubscriptionStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || t('settings.subscriptionCancelFailed'));
    } finally {
      setLoadingSubscription(false);
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.username.trim()) {
      newErrors.username = t('common.usernameRequired');
    } else if (profileData.username.length < 3) {
      newErrors.username = t('common.usernameMinLength');
    }
    
    if (!profileData.email.trim()) {
      newErrors.email = t('login.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = t('admin.invalidEmail');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSave = async () => {
    if (!validateProfile()) {
      toast.error(t('settings.fixErrorsBeforeSaving'));
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.put('/user/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      // Actualizar el estado del usuario en App.js
      if (setUser && response.data.user) {
        const updatedUser = { ...user, ...response.data.user };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
      toast.success(t('settings.profileUpdated'));
    } catch (error) {
      toast.error(t('settings.profileUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSave = async () => {
    setLoading(true);
    try {
      await apiClient.put('/user/notifications', notificationSettings, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success(t('settings.notificationsSaved'));
    } catch (error) {
      toast.error(t('settings.notificationsSaveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error(t('settings.passwordsDoNotMatch') || 'New passwords do not match');
      return;
    }

    if (securityData.newPassword.length < 8) {
      toast.error(t('settings.passwordMinLength') || 'Password must be at least 8 characters');
      return;
    }
    const hasUpper = /[A-Z]/.test(securityData.newPassword);
    const hasLower = /[a-z]/.test(securityData.newPassword);
    const hasNumber = /[0-9]/.test(securityData.newPassword);
    if (!hasUpper || !hasLower || !hasNumber) {
      toast.error(t('settings.passwordRequirements') || 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    setLoading(true);
    try {
      await apiClient.put('/user/password', {
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success(t('settings.passwordChangedSuccess') || 'Password changed successfully!');
      setSecurityData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      const data = error.response?.data;
      const message = data?.details?.[0]?.message || data?.error || error.message || (t('settings.passwordChangeFailed') || 'Failed to change password');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/user/export', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user-data-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(t('settings.dataExported'));
    } catch (error) {
      toast.error(t('settings.dataExportFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (window.confirm(t('settings.deleteAccountConfirm'))) {
      setLoading(true);
      try {
        await apiClient.delete('/user/account', {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        toast.success(t('settings.accountDeleted'));
        navigate('/login');
      } catch (error) {
        toast.error(t('settings.accountDeleteFailed'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePurchase = async (licenseType) => {
    // Use subscription for monthly/quarterly, one-time payment for lifetime
    const useSubscription = licenseType === 'monthly' || licenseType === 'quarterly';
    
    setBillingLoading(true);
    try {
      let response;
      if (useSubscription) {
        response = await createSubscription({ licenseType, token });
      } else {
        response = await createCheckout({ licenseType, token });
      }
      
      if (response.data.url) {
        // Show warning if webhook is not configured (only for one-time payments)
        if (!useSubscription && response.data.warning) {
          toast.success(t('settings.redirectingToPayment'), {
            duration: 3000,
            icon: '⚠️'
          });
          setTimeout(() => {
            toast(response.data.warning, {
              duration: 6000,
              icon: 'ℹ️'
            });
          }, 1000);
        }
        window.location.href = response.data.url;
      } else {
        toast.error(t('settings.checkoutFailed'));
        setBillingLoading(false);
      }
    } catch (error) {
      const data = error.response?.data;
      const status = error.response?.status;
      if (process.env.NODE_ENV === 'development' && data) {
        console.error('Payment/Subscription error:', status, data);
      }
      const errorMessage = data?.error || t('settings.paymentFailedRetry');
      const rawDetails = data?.details;
      const errorDetails = Array.isArray(rawDetails)
        ? rawDetails.map((d) => (typeof d === 'object' && d?.message ? d.message : String(d))).join('. ')
        : typeof rawDetails === 'object' && rawDetails !== null && !Array.isArray(rawDetails)
          ? (rawDetails.message || JSON.stringify(rawDetails))
          : rawDetails;
      if (errorDetails && String(errorDetails) !== 'undefined') {
        toast.error(errorMessage, {
          duration: 6000,
          description: typeof errorDetails === 'string' ? errorDetails : String(errorDetails),
        });
      } else {
        toast.error(errorMessage, { duration: 6000 });
      }
      setBillingLoading(false);
    }
  };

  // Check for payment/subscription success on component mount
  useEffect(() => {
    const checkPaymentStatus = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const subscriptionStatus = urlParams.get('subscription');
      const sessionId = urlParams.get('session_id');

      if ((paymentStatus === 'success' || subscriptionStatus === 'success') && sessionId && token) {
        try {
          const result = await verifyPaymentSession({ sessionId, token });
          if (result.data.status === 'paid') {
            toast.success(subscriptionStatus === 'success' 
              ? t('settings.subscriptionActivated') 
              : t('settings.paymentCompleted'));
            await fetchLicenseStatus();
            await fetchSubscriptionStatus();
            await fetchPaymentHistory();
            // Clean URL
            window.history.replaceState({}, document.title, '/settings');
          }
        } catch (error) {
          toast.error(t('settings.verifyPaymentFailed'));
        }
      } else if (paymentStatus === 'cancelled' || subscriptionStatus === 'cancelled') {
        toast.error(t('settings.paymentCancelled'));
        window.history.replaceState({}, document.title, '/settings');
      }
    };

    if (token) {
      checkPaymentStatus();
    }
  }, [token]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
    return (
          <div className="space-y-6">
            {/* Profile photo */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {profileData.profileImageUrl ? (
                  <img
                    src={profileData.profileImageUrl}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {profileData.username?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 p-2 rounded-full shadow cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={profilePhotoUploading}
                    onChange={async (e) => {
                      const file = e.target?.files?.[0];
                      if (!file || !file.type.startsWith('image/')) return;
                      e.target.value = '';
                      setProfilePhotoUploading(true);
                      const { url, error } = await handleUpload({ file, bucket: 'images', userId: user?.id });
                      if (error || !url) {
                        setProfilePhotoUploading(false);
                        return;
                      }
                      try {
                        const response = await apiClient.put('/user/profile', { ...profileData, profileImageUrl: url }, {
                          headers: { Authorization: `Bearer ${token}` },
                          withCredentials: true
                        });
                        if (setUser && response.data.user) {
                          const updatedUser = { ...user, ...response.data.user };
                          setUser(updatedUser);
                          localStorage.setItem('auth_user', JSON.stringify(updatedUser));
                        }
                        setProfileData(prev => ({ ...prev, profileImageUrl: url }));
                        toast.success(t('settings.profilePhotoUpdated'));
                      } catch (_) {
                        toast.error(t('settings.profileUpdateFailed'));
                      } finally {
                        setProfilePhotoUploading(false);
                      }
                    }}
                  />
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.profilePhoto')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.profilePhotoHint')}</p>
                {profilePhotoUploading && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{t('settings.uploading')}</p>}
                {profileData.profileImageUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await apiClient.put('/user/profile', { ...profileData, profileImageUrl: '' }, {
                          headers: { Authorization: `Bearer ${token}` },
                          withCredentials: true
                        });
                        if (setUser && response.data.user) {
                          const updatedUser = { ...user, ...response.data.user };
                          setUser(updatedUser);
                          localStorage.setItem('auth_user', JSON.stringify(updatedUser));
                        }
                        setProfileData(prev => ({ ...prev, profileImageUrl: '' }));
                        toast.success(t('settings.profilePhotoRemoved'));
                      } catch (_) {
                        toast.error(t('settings.profileUpdateFailed'));
                      }
                    }}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
                  >
                    {t('settings.removePhoto')}
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.username && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
                </div>
              </div>
              
              <div className="mt-6">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="mt-6">
                <label htmlFor="merchandisingLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Link de Página de Merchandising
                </label>
                <input
                  id="merchandisingLink"
                  type="url"
                  value={profileData.merchandisingLink}
                  onChange={(e) => setProfileData(prev => ({ ...prev, merchandisingLink: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://ejemplo.com/tienda"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Agrega el link de tu página de merchandising</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    value={profileData.timezone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    id="language"
                    value={profileData.language}
                    onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Qué ver en el dashboard (Twitch) */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('settings.dashboardVisibility') || 'Qué ver en el dashboard'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('settings.dashboardVisibilityDescription') || 'Activa o desactiva qué datos de Twitch se muestran en el dashboard (suscripciones, bits, donaciones).'}
                </p>
                <div className="space-y-4">
                  {[
                    { key: 'dashboardShowTwitchSubs', label: t('settings.dashboardTwitchSubs') || 'Suscripciones de Twitch', desc: t('settings.dashboardTwitchSubsDesc') || 'Mostrar suscripciones al canal' },
                    { key: 'dashboardShowTwitchBits', label: t('settings.dashboardTwitchBits') || 'Bits de Twitch', desc: t('settings.dashboardTwitchBitsDesc') || 'Mostrar bits/cheers recibidos' },
                    { key: 'dashboardShowTwitchDonations', label: t('settings.dashboardTwitchDonations') || 'Donaciones de Twitch', desc: t('settings.dashboardTwitchDonationsDesc') || 'Mostrar donaciones (si están conectadas)' }
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={profileData[key]}
                        onClick={() => setProfileData(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          profileData[key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition translate-x-1 ${
                            profileData[key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
      </div>
    );

      case 'notifications':
  return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Notification Preferences</h3>
            
            <div className="space-y-4">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Receive notifications for {key.toLowerCase().replace(/([A-Z])/g, ' $1')}
                      </p>
                    </div>
                  </div>
            <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !value }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
            </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'platforms':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.platformsConnectTitle') || 'Connect platforms'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.connectedAccountsDescription') || 'Link sign-in methods to this account. Connect each platform to use it for login; if already connected, it will show as connected.'}
            </p>
            {connectedAccountsLoading ? (
              <p className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</p>
            ) : connectedAccounts ? (
              <div className="space-y-4">
                {[
                  { key: 'google', label: 'Google', connected: connectedAccounts.google, connect: () => startGoogleLink(), disconnect: () => disconnectGoogle() },
                  { key: 'twitch', label: 'Twitch', connected: connectedAccounts.twitch, connect: () => startTwitchLink(), disconnect: () => disconnectTwitch() },
                  { key: 'discord', label: 'Discord', connected: connectedAccounts.discord, connect: () => startDiscordLink(token), disconnect: () => disconnectDiscord() },
                  { key: 'twitter', label: 'X (Twitter)', connected: connectedAccounts.twitter, connect: () => startTwitterLink(token), disconnect: () => disconnectTwitter() },
                  { key: 'email', label: t('settings.emailPassword') || 'Email & password', connected: connectedAccounts.email, connect: null, disconnect: null },
                ].map(({ key, label, connected, connect, disconnect }) => {
                  const username = connectedAccounts.usernames?.[key];
                  return (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
                        {connected && username && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            ({username})
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded flex-shrink-0 ${connected ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {connected ? (t('settings.connected') || 'Connected') : (t('settings.notConnected') || 'Not connected')}
                        </span>
                      </div>
                    </div>
                    {connect && !connected && (
                      <button
                        type="button"
                        onClick={connect}
                        disabled={connectingKey === key}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait"
                      >
                        {connectingKey === key ? (t('common.loading') || '...') : (t('settings.connect') || 'Connect')}
                      </button>
                    )}
                    {disconnect && connected && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(t('settings.disconnectConfirm') || 'Disconnect this platform? You can reconnect later.')) return;
                          setDisconnectingKey(key);
                          // Optimistic update: show as disconnected immediately so UI switches to Connect
                          setConnectedAccounts((prev) => (prev ? { ...prev, [key]: false } : prev));
                          try {
                            await disconnect();
                            toast.success(t('settings.disconnected') || 'Disconnected');
                          } catch (err) {
                            toast.error(err.response?.data?.error || err.message || t('settings.linkFailed'));
                            // Revert optimistic update on failure by refetching real state
                            if (token) fetchConnectedAccounts();
                            setDisconnectingKey(null);
                            return;
                          } finally {
                            setDisconnectingKey(null);
                          }
                          // Always refetch to keep server and UI in sync after success
                          if (token) await fetchConnectedAccounts();
                        }}
                        disabled={disconnectingKey !== null}
                        className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                      >
                        {disconnectingKey === key ? (t('common.loading') || '...') : (t('settings.disconnect') || 'Disconnect')}
                      </button>
                    )}
                    {key === 'email' && !connected && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.setPasswordInSecurity') || 'Set a password in Security tab.'}
                      </p>
                    )}
                    {key === 'twitter' && connected && connectedAccounts.twitterTokenMissing && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex-1 basis-full">
                        {t('settings.twitterReconnectToPublish') || 'Access token missing. Disconnect and reconnect X (Twitter) to enable publishing.'}
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('settings.couldNotLoadAccounts') || 'Could not load connected accounts.'}</p>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Security Settings</h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Change Password</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={securityData.confirmPassword}
                        onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePasswordChange}
                    disabled={loading || !securityData.currentPassword || !securityData.newPassword || !securityData.confirmPassword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t('settings.changing') : t('settings.changePassword')}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable 2FA</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security to your account</p>
                        </div>
                  </div>
                  <button
                    onClick={() => setSecurityData(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securityData.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        securityData.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
          </div>
        </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Appearance Settings</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Theme</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setThemeSettings(prev => ({ ...prev, theme: theme.id }))}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        themeSettings.theme === theme.id
                          ? 'border-accent bg-gray-50 dark:bg-gray-800'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className={`w-full h-16 rounded ${theme.preview} mb-2`}></div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{theme.name}</p>
                    </button>
                  ))}
                </div>
            </div>
            
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Accent Color</h4>
                <div className="flex space-x-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setThemeSettings(prev => ({ ...prev, accentColor: color.id }))}
                      className={`w-10 h-10 rounded-full ${color.color} border-2 transition-all ${
                        themeSettings.accentColor === color.id
                          ? 'border-accent ring-2 ring-accent ring-offset-2 dark:ring-offset-gray-800 scale-110'
                          : 'border-white dark:border-gray-700 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Compact Mode</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reduce spacing for more content</p>
                  </div>
                </div>
                <button
                  onClick={() => setThemeSettings(prev => ({ ...prev, compactMode: !prev.compactMode }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    themeSettings.compactMode ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      themeSettings.compactMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
              </button>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('settings.platformColors') || 'Platform colors'}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('settings.platformColorsHelp') || 'Colors used to identify each platform in the calendar and content list. YouTube: red, Discord: violet, Instagram: black, Twitter: light blue by default.'}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {PLATFORM_IDS.map((id) => (
                    <div key={id} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={platformColors[id] || DEFAULT_PLATFORM_COLORS[id]}
                        onChange={(e) => {
                          const hex = e.target.value;
                          const next = setPlatformColors({ [id]: hex });
                          setPlatformColorsState(next);
                        }}
                        className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{id}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = resetPlatformColors();
                    setPlatformColorsState(next);
                    toast.success(t('settings.platformColorsReset') || 'Platform colors reset to defaults');
                  }}
                  className="mt-3 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('settings.resetPlatformColors') || 'Reset to defaults'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Data & Export</h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Export Your Data</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                      Download all your content, settings, and account data in JSON format.
                    </p>
                    <button
                      onClick={handleDataExport}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? t('settings.exporting') : t('settings.exportData')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                    <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">Danger Zone</h4>
                    <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                      onClick={handleAccountDeletion}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? t('settings.deleting') : t('settings.deleteAccount')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Licenses & Billing</h3>

            {/* Payment Configuration Status */}
            {paymentConfig && (
              <div className={`p-4 rounded-lg ${
                paymentConfig.paymentEnabled 
                  ? (paymentConfig.automaticProcessingEnabled 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800')
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    paymentConfig.paymentEnabled 
                      ? (paymentConfig.automaticProcessingEnabled ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400')
                      : 'text-red-600 dark:text-red-400'
                  }`} />
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium mb-1 ${
                      paymentConfig.paymentEnabled 
                        ? (paymentConfig.automaticProcessingEnabled ? 'text-green-900 dark:text-green-100' : 'text-yellow-900 dark:text-yellow-100')
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {t('settings.paymentStatus')}: {paymentConfig.paymentEnabled ? t('settings.paymentEnabled') : t('settings.paymentDisabled')}
                    </h4>
                    <p className={`text-sm ${
                      paymentConfig.paymentEnabled 
                        ? (paymentConfig.automaticProcessingEnabled ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200')
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {paymentConfig.message}
                      {paymentConfig.manualVerificationRequired && (
                        <span className="block mt-1 text-xs">
                          ⚠️ Los pagos funcionarán pero requieren verificación manual después del pago.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Current License</h4>
              {licenseInfo ? (
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    Tipo:{' '}
                    {licenseInfo.licenseType === 'lifetime' && 'De por vida'}
                    {licenseInfo.licenseType === 'monthly' && 'Mensual'}
                    {licenseInfo.licenseType === 'quarterly' && 'Cada 3 meses'}
                    {licenseInfo.licenseType === 'trial' && 'Prueba 7 días'}
                    {licenseInfo.licenseType === 'temporary' && 'Temporal 30 días'}
                    {!licenseInfo.licenseType && 'Sin licencia'}
                  </p>
                  <p>Expira: {licenseInfo.licenseExpiresAt ? new Date(licenseInfo.licenseExpiresAt).toLocaleDateString() : '—'}</p>
                  {licenseInfo.licenseAlert === '7_days' && (
                    <p className="text-yellow-700 dark:text-yellow-400 font-medium">Alerta: tu licencia vence en 7 días.</p>
                  )}
                  {licenseInfo.licenseAlert === '3_days' && (
                    <p className="text-red-700 dark:text-red-400 font-medium">Alerta: tu licencia vence en 3 días.</p>
                  )}
                  {licenseInfo.licenseAlert === 'expired' && (
                    <p className="text-red-700 dark:text-red-400 font-medium">Tu licencia está vencida.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">No se pudo cargar el estado de la licencia.</p>
              )}
            </div>

            {/* Subscription Status */}
            {subscriptionStatus?.hasSubscription && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Active Subscription</h4>
                    <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <p>
                        Status: <span className="font-medium capitalize">{subscriptionStatus.subscription.status}</span>
                      </p>
                      <p>
                        Current Period: {new Date(subscriptionStatus.subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscriptionStatus.subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                      {subscriptionStatus.subscription.cancelAtPeriodEnd && (
                        <p className="text-yellow-700 dark:text-yellow-400 font-medium">
                          ⚠️ Subscription will cancel at end of period
                        </p>
                      )}
                    </div>
                  </div>
                  {subscriptionStatus.subscription.status === 'active' && !subscriptionStatus.subscription.cancelAtPeriodEnd && (
                    <button
                      onClick={handleCancelSubscription}
                      disabled={loadingSubscription}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {loadingSubscription ? t('settings.processing') : t('settings.cancelSubscription')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Payment History</h4>
              {paymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{payment.licenseType}</span>
                          {payment.isRecurring && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded">Recurring</span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                            payment.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' :
                            payment.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' :
                            payment.status === 'failed' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {payment.currency} ${payment.amount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">No payment history available</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableLicenses.monthly && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Monthly Subscription</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Recurring monthly license with automatic renewal.</p>
                  <button
                    onClick={() => handlePurchase('monthly')}
                    disabled={billingLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full"
                  >
                    {billingLoading ? t('settings.processing') : t('settings.subscribeMonthly')}
                  </button>
                </div>
              )}
              {availableLicenses.quarterly && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Quarterly Subscription</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Recurring every 3 months: $4.66/month (total $13.98).</p>
                  <button
                    onClick={() => handlePurchase('quarterly')}
                    disabled={billingLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 w-full"
                  >
                    {billingLoading ? t('settings.processing') : t('settings.subscribeQuarterly')}
                  </button>
                </div>
              )}
              {availableLicenses.lifetime && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Lifetime License</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">One-time payment for unlimited access.</p>
                  <button
                    onClick={() => handlePurchase('lifetime')}
                    disabled={billingLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 w-full"
                  >
                    {billingLoading ? t('settings.processing') : t('settings.purchaseLifetime')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="flex flex-col md:grid md:grid-cols-4">
            {/* Tabs: horizontal scroll on mobile, sidebar on desktop */}
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-1 p-2 md:p-4 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600" style={{ scrollbarWidth: 'thin' }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 md:w-full flex items-center gap-2 md:space-x-3 px-3 py-2.5 md:px-4 md:py-3 text-left rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-blue-100 dark:bg-gray-800 text-blue-700 dark:text-blue-400 md:border-r-2 md:border-blue-700'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="md:col-span-3 p-4 sm:p-6 min-w-0 overflow-x-hidden">
              {renderTabContent()}
              
              {/* Save buttons for applicable tabs */}
              {['profile', 'notifications'].includes(activeTab) && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={
                      activeTab === 'profile' ? handleProfileSave :
                      handleNotificationSave
                    }
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? t('settings.saving') : t('settings.saveChanges')}</span>
              </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 
