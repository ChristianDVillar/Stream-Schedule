import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient, createCheckout, verifyPaymentSession, getLicenseStatus, getAvailableLicenses, getPaymentConfigStatus, createSubscription, getSubscriptionStatus, cancelSubscription, getPaymentHistory } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
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
} from 'lucide-react';

const Settings = ({ user, token, setUser }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: '',
    timezone: 'UTC',
    language: 'en',
    merchandisingLink: user?.merchandisingLink || ''
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    scheduledReminders: true,
    platformUpdates: false,
    weeklyReports: true
  });

  // Platform settings
  const [platformSettings, setPlatformSettings] = useState({
    twitch: { enabled: true, autoPost: false },
    twitter: { enabled: true, autoPost: true },
    instagram: { enabled: false, autoPost: false },
    discord: { enabled: true, autoPost: true }
  });

  // Security settings
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  // Theme settings
  const [themeSettings, setThemeSettings] = useState({
    theme: localStorage.getItem('theme') || 'light',
    accentColor: 'blue',
    compactMode: false
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'platforms', name: 'Platforms', icon: Globe },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'billing', name: 'Licenses & Billing', icon: Key },
    { id: 'data', name: 'Data & Export', icon: Download }
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
    { id: 'light', name: 'Light', preview: 'bg-white border-gray-300' },
    { id: 'dark', name: 'Dark', preview: 'bg-gray-900 border-gray-600' },
    { id: 'auto', name: 'Auto', preview: 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-400' }
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
        merchandisingLink: user.merchandisingLink || ''
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

  useEffect(() => {
    if (token) {
      fetchLicenseStatus();
      fetchSubscriptionStatus();
      fetchPaymentHistory();
    }
    fetchAvailableLicenses();
    fetchPaymentConfig();
  }, [token]);

  const fetchPaymentConfig = async () => {
    try {
      const res = await getPaymentConfigStatus();
      setPaymentConfig(res.data);
    } catch (error) {
      console.error('Error fetching payment config:', error);
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
      console.error('Error fetching available licenses:', error);
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
    if (!window.confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.')) {
      return;
    }

    setLoadingSubscription(true);
    try {
      await cancelSubscription(token);
      toast.success('Subscription cancellation scheduled');
      await fetchSubscriptionStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setLoadingSubscription(false);
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (profileData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSave = async () => {
    if (!validateProfile()) {
      toast.error('Please fix the errors before saving');
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
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
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
      toast.success('Notification settings saved!');
    } catch (error) {
      toast.error('Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformSave = async () => {
    setLoading(true);
    try {
      await apiClient.put('/user/platforms', platformSettings, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success('Platform settings saved!');
    } catch (error) {
      toast.error('Failed to save platform settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (securityData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
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
      toast.success('Password changed successfully!');
      setSecurityData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      toast.error('Failed to change password');
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
      
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setLoading(true);
      try {
        await apiClient.delete('/user/account', {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        toast.success('Account deleted successfully');
        navigate('/login');
      } catch (error) {
        toast.error('Failed to delete account');
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
          toast.success('Redirecting to payment...', {
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
        toast.error('Failed to create checkout session');
        setBillingLoading(false);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Payment failed. Please try again.';
      const errorDetails = error.response?.data?.details;
      
      if (errorDetails) {
        toast.error(errorMessage, {
          duration: 5000,
          description: errorDetails
        });
      } else {
        toast.error(errorMessage);
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
              ? 'Subscription activated successfully!' 
              : 'Payment completed and license activated!');
            await fetchLicenseStatus();
            await fetchSubscriptionStatus();
            await fetchPaymentHistory();
            // Clean URL
            window.history.replaceState({}, document.title, '/settings');
          }
        } catch (error) {
          toast.error('Failed to verify payment. Please contact support.');
        }
      } else if (paymentStatus === 'cancelled' || subscriptionStatus === 'cancelled') {
        toast.error('Payment was cancelled');
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
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
              </div>
              
              <div className="mt-6">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="mt-6">
                <label htmlFor="merchandisingLink" className="block text-sm font-medium text-gray-700 mb-2">
                  Link de Página de Merchandising
                </label>
                <input
                  id="merchandisingLink"
                  type="url"
                  value={profileData.merchandisingLink}
                  onChange={(e) => setProfileData(prev => ({ ...prev, merchandisingLink: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://ejemplo.com/tienda"
                />
                <p className="mt-1 text-sm text-gray-500">Agrega el link de tu página de merchandising</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    value={profileData.timezone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    id="language"
                    value={profileData.language}
                    onChange={(e) => setProfileData(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
      </div>
    );

      case 'notifications':
  return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
            
            <div className="space-y-4">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Receive notifications for {key.toLowerCase().replace(/([A-Z])/g, ' $1')}
                      </p>
                    </div>
                  </div>
            <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !value }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-blue-600' : 'bg-gray-200'
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Configuration</h3>
            
            <div className="space-y-4">
              {Object.entries(platformSettings).map(([platform, settings]) => (
                <div key={platform} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-gray-600" />
                      <h4 className="text-sm font-medium text-gray-900 capitalize">{platform}</h4>
                    </div>
                    <button
                      onClick={() => setPlatformSettings(prev => ({
                        ...prev,
                        [platform]: { ...prev[platform], enabled: !settings.enabled }
                      }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
        </div>
                  
                  {settings.enabled && (
                    <div className="ml-8 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Auto-post content</span>
                        <button
                          onClick={() => setPlatformSettings(prev => ({
                            ...prev,
                            [platform]: { ...prev[platform], autoPost: !settings.autoPost }
                          }))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            settings.autoPost ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              settings.autoPost ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Change Password</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={securityData.confirmPassword}
                        onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePasswordChange}
                    disabled={loading || !securityData.currentPassword || !securityData.newPassword || !securityData.confirmPassword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Enable 2FA</p>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                        </div>
                  </div>
                  <button
                    onClick={() => setSecurityData(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securityData.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200'
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance Settings</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Theme</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setThemeSettings(prev => ({ ...prev, theme: theme.id }))}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        themeSettings.theme === theme.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-full h-16 rounded ${theme.preview} mb-2`}></div>
                      <p className="text-sm font-medium text-gray-900">{theme.name}</p>
                    </button>
                  ))}
                </div>
            </div>
            
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Accent Color</h4>
                <div className="flex space-x-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setThemeSettings(prev => ({ ...prev, accentColor: color.id }))}
                      className={`w-10 h-10 rounded-full ${color.color} border-2 transition-all ${
                        themeSettings.accentColor === color.id
                          ? 'border-gray-900 scale-110'
                          : 'border-white hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Palette className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Compact Mode</p>
                    <p className="text-sm text-gray-600">Reduce spacing for more content</p>
                  </div>
                </div>
                <button
                  onClick={() => setThemeSettings(prev => ({ ...prev, compactMode: !prev.compactMode }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    themeSettings.compactMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      themeSettings.compactMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
              </button>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Data & Export</h3>
            
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Export Your Data</h4>
                    <p className="text-sm text-blue-800 mb-4">
                      Download all your content, settings, and account data in JSON format.
                    </p>
                    <button
                      onClick={handleDataExport}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Exporting...' : 'Export Data'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                    <h4 className="text-sm font-medium text-red-900 mb-2">Danger Zone</h4>
                    <p className="text-sm text-red-800 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <button
                      onClick={handleAccountDeletion}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? 'Deleting...' : 'Delete Account'}
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Licenses & Billing</h3>

            {/* Payment Configuration Status */}
            {paymentConfig && (
              <div className={`p-4 rounded-lg ${
                paymentConfig.paymentEnabled 
                  ? (paymentConfig.automaticProcessingEnabled 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-yellow-50 border border-yellow-200')
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    paymentConfig.paymentEnabled 
                      ? (paymentConfig.automaticProcessingEnabled ? 'text-green-600' : 'text-yellow-600')
                      : 'text-red-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium mb-1 ${
                      paymentConfig.paymentEnabled 
                        ? (paymentConfig.automaticProcessingEnabled ? 'text-green-900' : 'text-yellow-900')
                        : 'text-red-900'
                    }`}>
                      Estado de Pagos: {paymentConfig.paymentEnabled ? 'Habilitado' : 'Deshabilitado'}
                    </h4>
                    <p className={`text-sm ${
                      paymentConfig.paymentEnabled 
                        ? (paymentConfig.automaticProcessingEnabled ? 'text-green-800' : 'text-yellow-800')
                        : 'text-red-800'
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

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Current License</h4>
              {licenseInfo ? (
                <div className="space-y-1 text-sm text-gray-700">
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
                    <p className="text-yellow-700 font-medium">Alerta: tu licencia vence en 7 días.</p>
                  )}
                  {licenseInfo.licenseAlert === '3_days' && (
                    <p className="text-red-700 font-medium">Alerta: tu licencia vence en 3 días.</p>
                  )}
                  {licenseInfo.licenseAlert === 'expired' && (
                    <p className="text-red-700 font-medium">Tu licencia está vencida.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No se pudo cargar el estado de la licencia.</p>
              )}
            </div>

            {/* Subscription Status */}
            {subscriptionStatus?.hasSubscription && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Active Subscription</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>
                        Status: <span className="font-medium capitalize">{subscriptionStatus.subscription.status}</span>
                      </p>
                      <p>
                        Current Period: {new Date(subscriptionStatus.subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscriptionStatus.subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                      {subscriptionStatus.subscription.cancelAtPeriodEnd && (
                        <p className="text-yellow-700 font-medium">
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
                      {loadingSubscription ? 'Processing...' : 'Cancel Subscription'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="p-4 bg-white rounded-lg border">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Payment History</h4>
              {paymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">{payment.licenseType}</span>
                          {payment.isRecurring && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Recurring</span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {payment.currency} ${payment.amount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No payment history available</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availableLicenses.monthly && (
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Monthly Subscription</h4>
                  <p className="text-sm text-gray-600 mb-4">Recurring monthly license with automatic renewal.</p>
                  <button
                    onClick={() => handlePurchase('monthly')}
                    disabled={billingLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full"
                  >
                    {billingLoading ? 'Processing...' : 'Subscribe $5.99 / month'}
                  </button>
                </div>
              )}
              {availableLicenses.quarterly && (
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Quarterly Subscription</h4>
                  <p className="text-sm text-gray-600 mb-4">Recurring every 3 months: $4.66/month (total $13.98).</p>
                  <button
                    onClick={() => handlePurchase('quarterly')}
                    disabled={billingLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 w-full"
                  >
                    {billingLoading ? 'Processing...' : 'Subscribe $13.98'}
                  </button>
                </div>
              )}
              {availableLicenses.lifetime && (
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Lifetime License</h4>
                  <p className="text-sm text-gray-600 mb-4">One-time payment for unlimited access.</p>
                  <button
                    onClick={() => handlePurchase('lifetime')}
                    disabled={billingLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 w-full"
                  >
                    {billingLoading ? 'Processing...' : 'Purchase $99.00'}
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
              {['profile', 'notifications', 'platforms'].includes(activeTab) && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={
                      activeTab === 'profile' ? handleProfileSave :
                      activeTab === 'notifications' ? handleNotificationSave :
                      handlePlatformSave
                    }
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
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
