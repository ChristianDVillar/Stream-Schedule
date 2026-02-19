import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, User, Bell, Globe, Shield, Palette, Key, MessageSquare, Download } from 'lucide-react';
import {
  apiClient,
  createCheckout,
  verifyPaymentSession,
  getLicenseStatus,
  getAvailableLicenses,
  getPaymentConfigStatus,
  createSubscription,
  getSubscriptionStatus,
  cancelSubscription,
  getPaymentHistory,
  getConnectedAccounts,
  startDiscordLink,
  startGoogleLink,
  startTwitchLink,
  startTwitterLink,
  disconnectGoogle,
  disconnectTwitch,
  disconnectTwitter,
  disconnectDiscord,
} from '../../api';
import { useLanguage } from '../../contexts/LanguageContext';
import { applyAccentColor, THEME_CHANGE_EVENT, getCustomColorConfig, setCustomColorConfig, applyCustomColors } from '../../utils/themeUtils';
import { getPlatformColors } from '../../utils/platformColors';
import { BANNER_CONFIG_KEY, getBannersFromEnv } from '../../components/HeaderBanners';
import { handleUpload, getUploadStats } from '../../utils/uploadHelper';
import { getPublicImageUrl } from '../../utils/supabaseClient';

import SettingsProfileTab from './SettingsProfileTab';
import SettingsNotificationsTab from './SettingsNotificationsTab';
import SettingsPlatformsTab from './SettingsPlatformsTab';
import SettingsSecurityTab from './SettingsSecurityTab';
import SettingsAppearanceTab from './SettingsAppearanceTab';
import SettingsBillingTab from './SettingsBillingTab';
import SettingsSupportTab from './SettingsSupportTab';
import SettingsDataTab from './SettingsDataTab';

const getTabsConfig = (t) => [
  { id: 'profile', name: t('settings.profile'), Icon: User },
  { id: 'notifications', name: t('settings.notifications'), Icon: Bell },
  { id: 'platforms', name: t('settings.platforms'), Icon: Globe },
  { id: 'security', name: t('settings.security'), Icon: Shield },
  { id: 'appearance', name: t('settings.appearance'), Icon: Palette },
  { id: 'billing', name: t('settings.licensesBilling'), Icon: Key },
  { id: 'support', name: t('settings.support') || 'Support', Icon: MessageSquare },
  { id: 'data', name: t('settings.dataExport'), Icon: Download },
];

export default function Settings({ user, token, setUser }) {
  const { t, language } = useLanguage();
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
    dashboardShowTwitchDonations: user?.dashboardShowTwitchDonations === true,
  });
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    scheduledReminders: true,
    platformUpdates: false,
    weeklyReports: true,
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
  });

  const [platformColors, setPlatformColorsState] = useState(() => getPlatformColors());

  const [bannerConfig, setBannerConfig] = useState(() => {
    try {
      const raw = localStorage.getItem(BANNER_CONFIG_KEY);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return getBannersFromEnv().length ? getBannersFromEnv() : [];
  });
  const [bannerMediaPickerFor, setBannerMediaPickerFor] = useState(null);
  const [bannerMediaList, setBannerMediaList] = useState([]);
  const [bannerUploadingFor, setBannerUploadingFor] = useState(null);
  const bannerImageInputRef = React.useRef(null);

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
    compactMode: false,
  });

  const [customColorConfig, setCustomColorConfigState] = useState(() => getCustomColorConfig());

  const themes = [
    { id: 'light', name: t('settings.themeLight'), preview: 'bg-white border-gray-300' },
    { id: 'dark', name: t('settings.themeDark'), preview: 'bg-gray-900 border-gray-600' },
    { id: 'auto', name: t('settings.themeAuto'), preview: 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-400' },
  ];
  const accentColors = [
    { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
    { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
    { id: 'green', name: 'Green', color: 'bg-green-500' },
    { id: 'red', name: 'Red', color: 'bg-red-500' },
    { id: 'orange', name: 'Orange', color: 'bg-orange-500' },
  ];

  useEffect(() => {
    if (bannerMediaPickerFor === null || !user?.id) return;
    let cancelled = false;
    (async () => {
      setBannerMediaList([]);
      try {
        const stats = await getUploadStats(user.id.toString());
        const uploads = (stats?.uploads || []).filter((u) => u?.bucket === 'images' && u?.file_path);
        const list = [];
        for (const upload of uploads) {
          try {
            const url = getPublicImageUrl(upload.file_path);
            if (url) list.push({ url, file_path: upload.file_path });
          } catch (_) {}
        }
        if (!cancelled) setBannerMediaList(list);
      } catch (_) {
        if (!cancelled) setBannerMediaList([]);
      }
    })();
    return () => { cancelled = true; };
  }, [bannerMediaPickerFor, user?.id]);

  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        merchandisingLink: user.merchandisingLink || '',
        profileImageUrl: user.profileImageUrl || '',
        dashboardShowTwitchSubs: user.dashboardShowTwitchSubs !== false,
        dashboardShowTwitchBits: user.dashboardShowTwitchBits !== false,
        dashboardShowTwitchDonations: user.dashboardShowTwitchDonations === true,
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
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
    };
    applyTheme(themeSettings.theme);
  }, [themeSettings.theme]);

  const customColorConfigRef = React.useRef(customColorConfig);
  customColorConfigRef.current = customColorConfig;

  useEffect(() => {
    const prev = customColorConfigRef.current;
    const next = { ...prev, assignments: { ...(prev.assignments || {}), accent: themeSettings.accentColor } };
    setCustomColorConfigState(next);
    setCustomColorConfig(next);
  }, [themeSettings.accentColor]);

  useEffect(() => {
    applyCustomColors(customColorConfig);
  }, [customColorConfig]);

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

  useEffect(() => {
    const linked = searchParams.get('linked');
    const errorParam = searchParams.get('error');
    if (linked) {
      setActiveTab('platforms');
      setConnectingKey(null);
      toast.success(t(`settings.linked${linked.charAt(0).toUpperCase() + linked.slice(1)}`) || `Linked ${linked}`);
      setSearchParams({}, { replace: true });
      if (token) fetchConnectedAccounts();
    }
    if (errorParam) {
      setActiveTab('platforms');
      setConnectingKey(null);
      const reason = searchParams.get('reason');
      const key = `settings.error_${errorParam.replace(/-/g, '_')}`;
      let msg = t(key) || t('settings.linkFailed');
      if (reason && typeof reason === 'string') {
        const decoded = decodeURIComponent(reason);
        const reasonKey = `settings.reason_${decoded.replace(/\s+/g, '_')}`;
        const translated = t(reasonKey);
        const reasonText = translated && translated !== reasonKey ? translated : decoded;
        msg = `${msg} ${t('settings.reason') || 'Reason'}: ${reasonText}`;
      }
      toast.error(msg);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, t]);

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

  const fetchPaymentConfig = async () => {
    try {
      const res = await getPaymentConfigStatus();
      setPaymentConfig(res.data);
    } catch {
      setPaymentConfig({ paymentEnabled: false, automaticProcessingEnabled: false, manualVerificationRequired: false });
    }
  };

  const fetchAvailableLicenses = async () => {
    try {
      const res = await getAvailableLicenses();
      setAvailableLicenses(res.data.availableLicenseTypes || { monthly: true, quarterly: false, lifetime: false, temporary: false });
    } catch (_) {}
  };

  const fetchLicenseStatus = async () => {
    try {
      const res = await getLicenseStatus(token);
      setLicenseInfo(res.data);
    } catch {
      setLicenseInfo(null);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await getSubscriptionStatus(token);
      setSubscriptionStatus(res.data);
    } catch {
      setSubscriptionStatus(null);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await getPaymentHistory(token);
      setPaymentHistory(res.data.payments || []);
    } catch {
      setPaymentHistory([]);
    }
  };

  const handleConnect = (key) => {
    setConnectingKey(key);
    if (key === 'google') startGoogleLink();
    else if (key === 'twitch') startTwitchLink();
    else if (key === 'discord') startDiscordLink(token);
    else if (key === 'twitter') startTwitterLink(token);
  };

  const handleDisconnect = async (key) => {
    setDisconnectingKey(key);
    try {
      if (key === 'google') await disconnectGoogle();
      else if (key === 'twitch') await disconnectTwitch();
      else if (key === 'discord') await disconnectDiscord();
      else if (key === 'twitter') await disconnectTwitter();
      toast.success(t('settings.disconnected') || 'Disconnected');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || t('settings.linkFailed'));
      if (token) fetchConnectedAccounts();
      throw err;
    } finally {
      setDisconnectingKey(null);
    }
    if (token) await fetchConnectedAccounts();
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm(t('settings.cancelSubscriptionConfirm'))) return;
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
    if (!profileData.username.trim()) newErrors.username = t('common.usernameRequired');
    else if (profileData.username.length < 3) newErrors.username = t('common.usernameMinLength');
    if (!profileData.email.trim()) newErrors.email = t('login.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(profileData.email)) newErrors.email = t('admin.invalidEmail');
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
        withCredentials: true,
      });
      if (setUser && response.data.user) {
        const updatedUser = { ...user, ...response.data.user };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
      toast.success(t('settings.profileUpdated'));
    } catch (error) {
      const msg = error.response?.data?.details
        ? (Array.isArray(error.response.data.details) ? error.response.data.details.map((d) => d.message).join('. ') : error.response.data.details)
        : error.response?.data?.error || t('settings.profileUpdateFailed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSave = async () => {
    setLoading(true);
    try {
      await apiClient.put('/user/notifications', notificationSettings, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success(t('settings.notificationsSaved'));
    } catch {
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
        newPassword: securityData.newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      toast.success(t('settings.passwordChangedSuccess') || 'Password changed successfully!');
      setSecurityData((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
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
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user-data-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('settings.dataExported'));
    } catch {
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
          withCredentials: true,
        });
        toast.success(t('settings.accountDeleted'));
        navigate('/login');
      } catch {
        toast.error(t('settings.accountDeleteFailed'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePurchase = async (licenseType) => {
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
        if (!useSubscription && response.data.warning) {
          toast.success(t('settings.redirectingToPayment'), { duration: 3000, icon: '⚠️' });
          setTimeout(() => {
            toast(response.data.warning, { duration: 6000, icon: 'ℹ️' });
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
      if (process.env.NODE_ENV === 'development' && data) console.error('Payment/Subscription error:', status, data);
      const errorMessage = data?.error || t('settings.paymentFailedRetry');
      const rawDetails = data?.details;
      const errorDetails = Array.isArray(rawDetails)
        ? rawDetails.map((d) => (typeof d === 'object' && d?.message ? d.message : String(d))).join('. ')
        : typeof rawDetails === 'object' && rawDetails !== null && !Array.isArray(rawDetails)
          ? (rawDetails.message || JSON.stringify(rawDetails))
          : rawDetails;
      if (errorDetails && String(errorDetails) !== 'undefined') {
        toast.error(errorMessage, { duration: 6000, description: typeof errorDetails === 'string' ? errorDetails : String(errorDetails) });
      } else {
        toast.error(errorMessage, { duration: 6000 });
      }
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const subscriptionStatusParam = urlParams.get('subscription');
      const sessionId = urlParams.get('session_id');
      if ((paymentStatus === 'success' || subscriptionStatusParam === 'success') && sessionId && token) {
        try {
          const result = await verifyPaymentSession({ sessionId, token });
          if (result.data.status === 'paid') {
            toast.success(subscriptionStatusParam === 'success' ? t('settings.subscriptionActivated') : t('settings.paymentCompleted'));
            await fetchLicenseStatus();
            await fetchSubscriptionStatus();
            await fetchPaymentHistory();
            window.history.replaceState({}, document.title, '/settings');
          }
        } catch {
          toast.error(t('settings.verifyPaymentFailed'));
        }
      } else if (paymentStatus === 'cancelled' || subscriptionStatusParam === 'cancelled') {
        toast.error(t('settings.paymentCancelled'));
        window.history.replaceState({}, document.title, '/settings');
      }
    };
    if (token) checkPaymentStatus();
  }, [token, t]);

  const handleProfilePhotoSelect = async (e) => {
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
        withCredentials: true,
      });
      if (setUser && response.data.user) {
        const updatedUser = { ...user, ...response.data.user };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
      setProfileData((prev) => ({ ...prev, profileImageUrl: url }));
      toast.success(t('settings.profilePhotoUpdated'));
    } catch (_) {
      toast.error(t('settings.profileUpdateFailed'));
    } finally {
      setProfilePhotoUploading(false);
    }
  };

  const handleProfilePhotoRemove = async () => {
    try {
      const response = await apiClient.put('/user/profile', { ...profileData, profileImageUrl: '' }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (setUser && response.data.user) {
        const updatedUser = { ...user, ...response.data.user };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
      setProfileData((prev) => ({ ...prev, profileImageUrl: '' }));
      toast.success(t('settings.profilePhotoRemoved'));
    } catch (_) {
      toast.error(t('settings.profileUpdateFailed'));
    }
  };

  const handleBannerImageUpload = async (file, index) => {
    const result = await handleUpload({ file, bucket: 'images', userId: user?.id?.toString() });
    setBannerUploadingFor(null);
    if (result?.url) setBannerConfig((prev) => prev.map((b, i) => (i === index ? { ...b, imageUrl: result.url } : b)));
  };

  const tabs = getTabsConfig(t);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <SettingsProfileTab
            user={user}
            profileData={profileData}
            setProfileData={setProfileData}
            errors={errors}
            profilePhotoUploading={profilePhotoUploading}
            onProfilePhotoSelect={handleProfilePhotoSelect}
            onProfilePhotoRemove={handleProfilePhotoRemove}
            t={t}
          />
        );
      case 'notifications':
        return (
          <SettingsNotificationsTab
            notificationSettings={notificationSettings}
            setNotificationSettings={setNotificationSettings}
            t={t}
          />
        );
      case 'platforms':
        return (
          <SettingsPlatformsTab
            connectedAccounts={connectedAccounts}
            setConnectedAccounts={setConnectedAccounts}
            connectedAccountsLoading={connectedAccountsLoading}
            disconnectingKey={disconnectingKey}
            connectingKey={connectingKey}
            token={token}
            t={t}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            fetchConnectedAccounts={fetchConnectedAccounts}
          />
        );
      case 'security':
        return (
          <SettingsSecurityTab
            securityData={securityData}
            setSecurityData={setSecurityData}
            loading={loading}
            onPasswordChange={handlePasswordChange}
            t={t}
          />
        );
      case 'appearance':
        return (
          <SettingsAppearanceTab
            themeSettings={themeSettings}
            setThemeSettings={setThemeSettings}
            themes={themes}
            accentColors={accentColors}
            platformColors={platformColors}
            setPlatformColorsState={setPlatformColorsState}
            bannerConfig={bannerConfig}
            setBannerConfig={setBannerConfig}
            bannerMediaPickerFor={bannerMediaPickerFor}
            setBannerMediaPickerFor={setBannerMediaPickerFor}
            bannerMediaList={bannerMediaList}
            bannerUploadingFor={bannerUploadingFor}
            setBannerUploadingFor={setBannerUploadingFor}
            bannerImageInputRef={bannerImageInputRef}
            user={user}
            onBannerImageUpload={handleBannerImageUpload}
            customColorConfig={customColorConfig}
            setCustomColorConfigState={setCustomColorConfigState}
            onCustomColorsApply={applyCustomColors}
            t={t}
            language={language}
          />
        );
      case 'billing':
        return (
          <SettingsBillingTab
            paymentConfig={paymentConfig}
            licenseInfo={licenseInfo}
            subscriptionStatus={subscriptionStatus}
            paymentHistory={paymentHistory}
            availableLicenses={availableLicenses}
            billingLoading={billingLoading}
            loadingSubscription={loadingSubscription}
            t={t}
            onPurchase={handlePurchase}
            onCancelSubscription={handleCancelSubscription}
          />
        );
      case 'support':
        return <SettingsSupportTab token={token} t={t} />;
      case 'data':
        return (
          <SettingsDataTab
            loading={loading}
            onExport={handleDataExport}
            onDeleteAccount={handleAccountDeletion}
            t={t}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="flex flex-col md:grid md:grid-cols-4">
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-1 p-2 md:p-4 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600" style={{ scrollbarWidth: 'thin' }}>
                {tabs.map((tab) => {
                  const Icon = tab.Icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 md:w-full flex items-center gap-2 md:space-x-3 px-3 py-2.5 md:px-4 md:py-3 text-left rounded-lg transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-color-sidebar dark:bg-gray-800 text-color-sidebar md:border-r-2 md:border-color-sidebar'
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

            <div className="md:col-span-3 p-4 sm:p-6 min-w-0 overflow-x-hidden">
              {renderTabContent()}
              {['profile', 'notifications'].includes(activeTab) && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={activeTab === 'profile' ? handleProfileSave : handleNotificationSave}
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
}
