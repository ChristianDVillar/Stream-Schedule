import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
// Admin: usuarios, licencias, pagos (listado/export), modal detalle, mensajes
import { getAllUsers, adminGenerateLicense, adminChangeEmail, adminResetPassword, adminCreateUser, adminUpdateLicense, adminAssignTrial, adminDeleteUser, getPaymentStats, getLicenseConfig, updateLicenseConfig, getPasswordReminder, adminExtendTrial, getAdminMessages, getUnreadMessageCount, getAdminMessage, updateMessageStatus, replyToMessage, deleteMessage, resolveMessage, reopenMessage, getAdminPaymentsList, getAdminPaymentsExportBlob, sendNotification, getPlatformConfig, updatePlatformConfig, getFixedCosts, updateFixedCosts } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDateUTC } from '../utils/dateUtils';
import { maskEmail } from '../utils/emailUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { buildPaymentsInvoicePdf } from '../utils/paymentInvoicePdf';

const mockLogs = [
  { id: 1, action: 'User admin@example.com created', date: '2025-07-21 10:00' },
  { id: 2, action: 'License generated for user1@example.com', date: '2025-07-21 10:05' },
  { id: 3, action: 'User user2@example.com email changed', date: '2025-07-21 10:10' },
];

export default function AdminDashboard({ token, user, onLogout }) {
  const { t } = useLanguage();
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
  const [licenseConfig, setLicenseConfig] = useState({ monthly: true, quarterly: false, lifetime: false, temporary: false });
  const [passwordReminders, setPasswordReminders] = useState([]);
  const [showLicenseConfig, setShowLicenseConfig] = useState(false);
  const [extendingTrial, setExtendingTrial] = useState(null);
  const [extendTrialDays, setExtendTrialDays] = useState({});
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageFilters, setMessageFilters] = useState({ status: '', priority: '', category: '', resolved: '' });
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState([]);
  const replyFileInputRef = useRef(null);
  const [paymentsList, setPaymentsList] = useState([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsListError, setPaymentsListError] = useState(null);
  const [paymentsOffset, setPaymentsOffset] = useState(0);
  const paymentsLimit = 50;
  const [paymentListFilters, setPaymentListFilters] = useState({ status: '', from: '', to: '' });
  const [exporting, setExporting] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifBroadcast, setNotifBroadcast] = useState(true);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [platformConfig, setPlatformConfig] = useState({});
  const [platformConfigLoading, setPlatformConfigLoading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [fixedCosts, setFixedCosts] = useState([]);
  const [fixedCostsLoading, setFixedCostsLoading] = useState(false);
  const [fixedCostsSaving, setFixedCostsSaving] = useState(false);
  const [pdfUsdToEurRate, setPdfUsdToEurRate] = useState('0.92');

  useEffect(() => {
    fetchUsers();
    fetchLicenseConfig();
    fetchPasswordReminders();
    fetchMessages();
    fetchUnreadCount();
    fetchPlatformConfig();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (token) fetchPaymentsList(paymentsOffset, paymentListFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, paymentsOffset, paymentListFilters.status, paymentListFilters.from, paymentListFilters.to]);

  const fetchFixedCostsList = async () => {
    if (!token) return;
    setFixedCostsLoading(true);
    try {
      const res = await getFixedCosts(token);
      setFixedCosts(Array.isArray(res.data.fixedCosts) ? res.data.fixedCosts : []);
    } catch (err) {
      if (err.response?.status === 404) {
        setFixedCosts([{ label: 'Cursor', amount: 20, currency: 'EUR' }, { label: 'Render', amount: 7, currency: 'EUR' }]);
      } else {
        toast.error(err.response?.data?.error || t('admin.fixedCostsLoadError'));
      }
    } finally {
      setFixedCostsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchFixedCostsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when messageFilters change
  }, [messageFilters]);

  const fetchLicenseConfig = async () => {
    try {
      const res = await getLicenseConfig(token);
      setLicenseConfig(res.data.availableLicenseTypes || { monthly: true, quarterly: false, lifetime: false, temporary: false });
    } catch (err) {
    }
  };

  const fetchPlatformConfig = async () => {
    try {
      setPlatformConfigLoading(true);
      const res = await getPlatformConfig(token);
      setPlatformConfig(res.data.platforms || {});
    } catch (err) {
      toast.error('Failed to load platform configuration');
    } finally {
      setPlatformConfigLoading(false);
    }
  };

  const handleUpdatePlatformConfig = async () => {
    try {
      setPlatformConfigLoading(true);
      const enabledPlatforms = Object.entries(platformConfig)
        .filter(([_, config]) => config.enabled)
        .map(([platform, _]) => platform);
      
      await updatePlatformConfig({ platforms: enabledPlatforms, token });
      toast.success('Platform configuration updated successfully');
      // Reload config to ensure UI is in sync
      await fetchPlatformConfig();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update platform configuration');
    } finally {
      setPlatformConfigLoading(false);
    }
  };

  const fetchPasswordReminders = async () => {
    try {
      const res = await getPasswordReminder(token);
      setPasswordReminders(res.data.reminders || []);
    } catch (err) {
    }
  };

  const fetchMessages = async () => {
    if (!token) return;
    setMessagesLoading(true);
    try {
      const params = {};
      if (messageFilters.status) params.status = messageFilters.status;
      if (messageFilters.priority) params.priority = messageFilters.priority;
      if (messageFilters.category) params.category = messageFilters.category;
      if (messageFilters.resolved !== '') params.resolved = messageFilters.resolved;
      
      const res = await getAdminMessages({ ...params, token });
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await getUnreadMessageCount(token);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchPaymentsList = async (offset = paymentsOffset, filters = paymentListFilters) => {
    if (!token) return;
    setPaymentsLoading(true);
    setPaymentsListError(null);
    try {
      const res = await getAdminPaymentsList({
        token,
        limit: paymentsLimit,
        offset,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setPaymentsList(res.data.payments || []);
      setPaymentsTotal(res.data.total ?? 0);
    } catch (err) {
      console.error('Error fetching payments list:', err);
      setPaymentsList([]);
      setPaymentsTotal(0);
      setPaymentsListError(err.response?.status === 404
        ? 'Listado de pagos no disponible. Despliega la última versión del backend (stream-schedule-api) en Render.'
        : err.response?.data?.error || 'Error al cargar pagos.');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleDownloadPayments = async (format) => {
    if (!token) return;
    setExporting(true);
    try {
      const blob = await getAdminPaymentsExportBlob({
        token,
        format,
        status: paymentListFilters.status || undefined,
        from: paymentListFilters.from || undefined,
        to: paymentListFilters.to || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pagos_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err.response?.data?.error || t('admin.downloadError'));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPaymentsPdf = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const blob = await getAdminPaymentsExportBlob({
        token,
        format: 'json',
        status: paymentListFilters.status || undefined,
        from: paymentListFilters.from || undefined,
        to: paymentListFilters.to || undefined,
      });
      const text = await blob.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data) || data.length === 0) {
        window.alert(t('admin.noPaymentsMatch') || 'No hay pagos que coincidan con los filtros.');
        return;
      }
      let logoDataUrl = null;
      try {
        const base = window.location.origin + (process.env.PUBLIC_URL || '');
        const logoUrl = `${base}/Bot.png`;
        logoDataUrl = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
              } else {
                resolve(null);
              }
            } catch (e) {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = logoUrl;
        });
      } catch (_) {
        // omit logo if load fails
      }
      const pdfBlob = buildPaymentsInvoicePdf(data, {
        logoDataUrl,
        appName: t('dashboard.appTitle') || 'Streamer Scheduler',
        ownerName: 'Christian David Villar Colodro',
        ownerEmail: 'christiandvillar@gmail.com',
        colUsuario: t('admin.pdfColUsuario'),
        colTipoSuscripcion: t('admin.pdfColTipoSuscripcion'),
        colPago: t('admin.pdfColPago'),
        colMoneda: t('admin.pdfColMoneda'),
        totalLabel: t('admin.pdfTotalLabel'),
        titleLabel: t('admin.pdfTitle'),
        accountingSectionLabel: t('admin.pdfAccountingSection'),
        noteText: t('admin.pdfNote'),
        fixedCosts: (fixedCosts.length > 0 ? fixedCosts : [{ label: 'Cursor', amount: 20, currency: 'EUR' }, { label: 'Render', amount: 7, currency: 'EUR' }]).map(x => ({ label: x.label, amount: Number(x.amount) || 0, currency: (x.currency || 'EUR').toUpperCase() })),
        fixedCostsSectionLabel: t('admin.pdfFixedCostsSection'),
        revenueMinusFixedLabel: t('admin.pdfRevenueMinusFixed'),
        resultLabel: t('admin.pdfResult'),
        incomeTotalsSectionLabel: t('admin.pdfIncomeTotalsSection'),
        fixedCostsTotalLabel: t('admin.pdfFixedCostsTotalLabel'),
        netIncomeLabel: t('admin.pdfNetIncomeLabel'),
        totalIncomeHeadingLabel: t('admin.pdfTotalIncomeHeading'),
        totalIncomeSubscriptionsLabel: t('admin.pdfTotalIncomeSubscriptions'),
        finalTotalSectionLabel: t('admin.pdfFinalTotalSection'),
        conversionRateLabel: t('admin.pdfConversionRate'),
        exchangeRatesToEur: { USD: parseFloat(pdfUsdToEurRate) || 0.92 },
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_pagos_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err.response?.data?.error || err.message || t('admin.pdfGenerateError'));
    } finally {
      setExporting(false);
    }
  };

  const handleViewMessage = async (messageId) => {
    if (!token) return;
    try {
      const res = await getAdminMessage(messageId, token);
      setSelectedMessage(res.data.message);
      setShowMessageModal(true);
      setReplyText('');
      setReplyAttachments([]);
      fetchUnreadCount();
      fetchMessages();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Error loading message');
    }
  };

  const handleResolveMessage = async (messageId) => {
    if (!window.confirm('Mark this conversation as resolved?')) return;
    if (!token) return;
    try {
      await resolveMessage(messageId, token);
      fetchMessages();
      fetchUnreadCount();
      if (selectedMessage?.id === messageId) {
        const res = await getAdminMessage(messageId, token);
        setSelectedMessage(res.data.message);
      }
    } catch (err) {
      window.alert(err.response?.data?.error || 'Error resolving message');
    }
  };

  const handleReopenMessage = async (messageId) => {
    if (!token) return;
    try {
      await reopenMessage(messageId, token);
      fetchMessages();
      fetchUnreadCount();
      if (selectedMessage?.id === messageId) {
        const res = await getAdminMessage(messageId, token);
        setSelectedMessage(res.data.message);
      }
    } catch (err) {
      window.alert(err.response?.data?.error || 'Error reopening message');
    }
  };

  const handleReplyFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      window.alert('Only image files are allowed');
    }
    
    if (replyAttachments.length + imageFiles.length > 5) {
      window.alert('Maximum 5 images allowed');
      return;
    }
    
    const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      window.alert('Each image must be less than 5MB');
      return;
    }
    
    setReplyAttachments([...replyAttachments, ...imageFiles]);
    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = '';
    }
  };

  const removeReplyAttachment = (index) => {
    setReplyAttachments(replyAttachments.filter((_, i) => i !== index));
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setReplying(true);
    try {
      await replyToMessage({ 
        messageId: selectedMessage.id, 
        reply: replyText.trim(), 
        attachments: replyAttachments.length > 0 ? replyAttachments : undefined,
        token 
      });
      window.alert('Reply sent successfully!');
      setReplyText('');
      setReplyAttachments([]);
      setShowMessageModal(false);
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Error sending reply');
    } finally {
      setReplying(false);
    }
  };

  const handleUpdateStatus = async (messageId, status) => {
    if (!token) return;
    try {
      await updateMessageStatus({ messageId, status, token });
      fetchMessages();
      fetchUnreadCount();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Error updating status');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    if (!token) return;
    try {
      await deleteMessage(messageId, token);
      fetchMessages();
      fetchUnreadCount();
      if (selectedMessage?.id === messageId) {
        setShowMessageModal(false);
      }
    } catch (err) {
      window.alert(err.response?.data?.error || 'Error deleting message');
    }
  };

  const handleUpdateLicenseConfig = async () => {
    try {
      await updateLicenseConfig({ availableLicenseTypes: licenseConfig, token });
      alert(t('admin.licenseConfigUpdated'));
      setShowLicenseConfig(false);
    } catch (err) {
      alert(t('admin.licenseConfigError'));
    }
  };

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
      window.alert(t('admin.licenseGenerateError') || 'Error generating license');
    } finally {
      setGenerating(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm(t('admin.deleteUserConfirm'))) return;
    setDeletingUserId(userId);
    try {
      await adminDeleteUser({ userId, token });
      window.alert(t('admin.deleteUserSuccess'));
      await fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.error || t('admin.deleteUserError') || 'Error deleting user';
      window.alert(msg);
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleAssignTrial(userId) {
    if (!window.confirm(t('admin.assignTrialConfirm'))) {
      return;
    }
    setGenerating(prev => ({ ...prev, [userId]: true }));
    try {
      await adminAssignTrial({ userId, token });
      window.alert(t('admin.trialAssigned'));
      await fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.error || t('admin.trialError') || 'Error assigning trial';
      window.alert(errorMsg);
    } finally {
      setGenerating(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function handleExtendTrial(userId) {
    const days = extendTrialDays[userId] || 7;
    if (days < 1 || days > 7) {
      window.alert(t('admin.daysMustBe1To7'));
      return;
    }
    
    setExtendingTrial(userId);
    try {
      const response = await adminExtendTrial({ userId, days, token });
      window.alert(response.data.message || t('admin.trialExtendedSuccess'));
      setExtendTrialDays(prev => ({ ...prev, [userId]: 7 }));
      setExtendingTrial(null);
      await fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.error || t('admin.trialExtendError');
      window.alert(errorMsg);
      setExtendingTrial(null);
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
      window.alert(t('admin.emailUpdated') || 'Email updated successfully');
    } catch (err) {
      window.alert(t('admin.emailUpdateError') || 'Error updating email');
    }
  }

  async function handleResetPassword(userId) {
    setResetting(userId);
    try {
      await adminResetPassword({ userId, token });
      alert(t('admin.passwordResetSent'));
    } catch (err) {
      alert(t('admin.passwordResetError'));
    }
    setResetting(null);
  }

  async function handleCreateUser() {
    if (!createData.username || !createData.email || !createData.password) {
      window.alert(t('admin.fillAllFields') || 'Please fill username, email and password');
      return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createData.email)) {
      window.alert(t('admin.invalidEmail') || 'Please enter a valid email');
      return;
    }
    
    // Validar password mínimo
    if (createData.password.length < 6) {
      window.alert(t('admin.passwordMinLength') || 'Password must be at least 6 characters');
      return;
    }
    
    setCreating(true);
    setError(null);
    try {
      const response = await adminCreateUser({ ...createData, token });
      setCreateData({ username: '', email: '', password: '', isAdmin: false });
      await fetchUsers();
      window.alert(`${t('admin.userCreatedSuccess') || 'User created successfully!'}\n${t('common.email')}: ${maskEmail(response.data.email)}\n${t('common.username')}: ${response.data.username}`);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || (t('admin.userCreateError') || 'Error creating user');
      window.alert(`❌ ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateLicense(userId) {
    const licenseType = licenseEdits[userId];
    if (!licenseType) return;
    if (!token) {
      window.alert(t('admin.sessionExpired') || 'Session expired. Please login again.');
      return;
    }
    try {
      await adminUpdateLicense({ userId, licenseType, token });
      await fetchUsers();
      window.alert(t('admin.licenseUpdated'));
    } catch (err) {
      window.alert(t('admin.licenseUpdateError'));
    }
  }

  const stats = {
    totalUsers: users.length,
    admins: users.filter(u => u.isAdmin).length,
    licensed: users.filter(u => u.licenseKey).length,
    expiringSoon: users.filter(u => u.licenseAlert === '7_days' || u.licenseAlert === '3_days').length,
    expired: users.filter(u => u.licenseAlert === 'expired').length,
    monthlyRevenue: revenue.currentMonthAmount || 0,
    totalPaid: revenue.totalPaid ?? 0,
    recurringRevenue: revenue.recurringRevenue ?? 0,
  };

  const expiringUsers = users.filter(u => u.licenseAlert === '7_days' || u.licenseAlert === '3_days' || u.licenseAlert === 'expired');
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">{t('admin.title')}</h1>
        {onLogout && (
          <button onClick={onLogout} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded hover:from-blue-700 hover:to-purple-700 text-sm w-full sm:w-auto">{t('common.logout')}</button>
        )}
      </div>
      <main className="space-y-6">
          {section === 'overview' && (
            <>
      <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-lg shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700">
        <h2 className="text-lg sm:text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">{t('admin.welcome')}, <span className="font-bold">{user?.username}</span></h2>
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{t('admin.manageDescription') || 'Manage users, licenses and review system logs.'}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-t-4 border-blue-400">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t('admin.totalUsers')}</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-t-4 border-purple-400">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t('admin.admins')}</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.admins}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-t-4 border-green-400">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t('admin.licensed')}</p>
          <p className="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">{stats.licensed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-t-4 border-yellow-400">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t('admin.expiringSoon')}</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-700 dark:text-yellow-200">{stats.expiringSoon}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-t-4 border-red-400">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t('admin.expired')}</p>
          <p className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-200">{stats.expired}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-t-4 border-emerald-400">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t('admin.monthlyRevenue')}</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-200">
            {revenue.currency} {stats.monthlyRevenue.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-t-4 border-teal-400 col-span-2 sm:col-span-1">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t('admin.totalRevenueLabel')}</p>
          <p className="text-xl sm:text-2xl font-bold text-teal-700 dark:text-teal-200">
            {revenue.currency} {Number(stats.totalPaid).toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 border-t-4 border-cyan-400 col-span-2 sm:col-span-1">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{t('admin.recurringRevenueLabel')}</p>
          <p className="text-xl sm:text-2xl font-bold text-cyan-700 dark:text-cyan-200">
            {revenue.currency} {Number(stats.recurringRevenue).toFixed(2)}
          </p>
        </div>
      </div>
      {/* Password Reminder Alert */}
      {passwordReminders.some(r => r.needsChange) && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {t('admin.passwordReminderTitle')}
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                {passwordReminders.filter(r => r.needsChange).map((reminder, idx) => (
                  <p key={idx} className="mb-1">
                    {maskEmail(reminder.email)}: {reminder.message}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* License Configuration */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-blue-400">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300">{t('admin.licenseConfigTitle')}</h3>
          <button
            onClick={() => setShowLicenseConfig(!showLicenseConfig)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showLicenseConfig ? t('admin.hide') : t('admin.manageAvailableLicenses')}
          </button>
        </div>
        {showLicenseConfig && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.licenseConfigDescription')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={licenseConfig.monthly}
                  onChange={(e) => setLicenseConfig(prev => ({ ...prev, monthly: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('admin.monthly')}</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={licenseConfig.quarterly}
                  onChange={(e) => setLicenseConfig(prev => ({ ...prev, quarterly: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('admin.quarterly')}</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={licenseConfig.lifetime}
                  onChange={(e) => setLicenseConfig(prev => ({ ...prev, lifetime: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('admin.lifetime')}</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={licenseConfig.temporary}
                  onChange={(e) => setLicenseConfig(prev => ({ ...prev, temporary: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">{t('admin.temporary')}</span>
              </label>
            </div>
            <button
              onClick={handleUpdateLicenseConfig}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {t('admin.saveConfiguration')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Create user */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-green-400">
          <h3 className="text-lg font-bold text-green-700 mb-4">{t('admin.createUser')}</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder={t('common.username')}
              value={createData.username}
              onChange={e => setCreateData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              type="email"
              placeholder={t('common.email')}
              value={createData.email}
              onChange={e => setCreateData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              type="password"
              placeholder={t('common.password')}
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
              <span>{t('common.admin')}</span>
            </label>
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? t('admin.creating') : t('common.create')}
            </button>
          </div>
        </div>
        {/* Licencias asignadas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-blue-400">
          <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">{t('admin.assignedLicenses')}</h3>
          <ul className="space-y-2">
            {users.filter(u => u.licenseKey).length === 0 ? (
              <li className="text-gray-500 dark:text-gray-400">{t('admin.noLicenses')}</li>
            ) : (
              users.filter(u => u.licenseKey).map(u => (
                <li key={u.id} className="flex items-center justify-between bg-blue-50 dark:bg-gray-700/50 rounded px-3 py-2 group hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-mono text-blue-900 dark:text-blue-200 group-hover:dark:text-blue-100">{u.licenseKey}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 group-hover:dark:text-gray-200">
                      {u.licenseType === 'lifetime' ? t('admin.lifetime') : u.licenseType === 'trial' ? t('admin.trial') : t('admin.temporary')}
                      {u.licenseExpiresAt ? ` · ${t('admin.expiresAt')} ${formatDateUTC(u.licenseExpiresAt)}` : ''}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:dark:text-gray-100">{u.username}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        {/* Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-purple-400">
          <h3 className="text-lg font-bold text-purple-700 mb-4">{t('admin.recentLogs')}</h3>
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
        <h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-4">{t('admin.licensesToRenew')}</h3>
        {expiringUsers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('admin.noLicensesExpiringSoon')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
              <thead className="bg-yellow-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.userTableHeader')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('common.email')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.licenseTypeLabel')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.expiresLabel')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.alert')}</th>
                </tr>
              </thead>
              <tbody>
                {expiringUsers.map(u => (
                  <tr key={u.id} className="group hover:bg-yellow-50 dark:hover:bg-gray-700/80 transition-colors">
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{u.username}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white" title={u.email}>{maskEmail(u.email)}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">
                      {u.licenseType === 'lifetime' && t('admin.lifetime')}
                      {u.licenseType === 'monthly' && t('admin.monthly')}
                      {u.licenseType === 'quarterly' && t('admin.quarterly')}
                      {u.licenseType === 'temporary' && t('admin.temporary')}
                      {u.licenseType === 'trial' && t('admin.trial')}
                      {!u.licenseType && '—'}
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{u.licenseExpiresAt ? formatDateUTC(u.licenseExpiresAt) : '—'}</td>
                    <td className="px-4 py-2 border dark:border-gray-700">
                      {u.licenseAlert === 'expired' && <span className="text-red-600 dark:text-red-400 font-semibold">{t('admin.expired')}</span>}
                      {u.licenseAlert === '3_days' && <span className="text-red-600 dark:text-red-400 font-semibold">{t('admin.days3')}</span>}
                      {u.licenseAlert === '7_days' && <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{t('admin.days7')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-emerald-500 mb-8">
        <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-4">{t('admin.monthlyEarnings')}</h3>
        {revenue.monthlyTotals.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('admin.noPaymentsRegistered')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
              <thead className="bg-emerald-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.monthLabel')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.amountLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {revenue.monthlyTotals.map(row => (
                  <tr key={row.month} className="group hover:bg-emerald-50 dark:hover:bg-gray-700/80 transition-colors">
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{row.month}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">
                      {revenue.currency} {Number(row.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
            </>
          )}

          {section === 'users' && (
            <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Create user */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-green-400">
          <h3 className="text-lg font-bold text-green-700 mb-4">{t('admin.createUser')}</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder={t('common.username')}
              value={createData.username}
              onChange={e => setCreateData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              type="email"
              placeholder={t('common.email')}
              value={createData.email}
              onChange={e => setCreateData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              type="password"
              placeholder={t('common.password')}
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
              <span>{t('common.admin')}</span>
            </label>
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? t('admin.creating') : t('common.create')}
            </button>
          </div>
        </div>
        {/* Licencias asignadas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-blue-400">
          <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">{t('admin.assignedLicenses')}</h3>
          <ul className="space-y-2">
            {users.filter(u => u.licenseKey).length === 0 ? (
              <li className="text-gray-500 dark:text-gray-400">{t('admin.noLicenses')}</li>
            ) : (
              users.filter(u => u.licenseKey).map(u => (
                <li key={u.id} className="flex items-center justify-between bg-blue-50 dark:bg-gray-700/50 rounded px-3 py-2 group hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-mono text-blue-900 dark:text-blue-200 group-hover:dark:text-blue-100">{u.licenseKey}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 group-hover:dark:text-gray-200">
                      {u.licenseType === 'lifetime' ? t('admin.lifetime') : u.licenseType === 'trial' ? t('admin.trial') : t('admin.temporary')}
                      {u.licenseExpiresAt ? ` · ${t('admin.expiresAt')} ${formatDateUTC(u.licenseExpiresAt)}` : ''}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:dark:text-gray-100">{u.username}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-yellow-500 mb-8">
        <h3 className="text-lg font-bold text-yellow-700 dark:text-yellow-300 mb-4">{t('admin.licensesToRenew')}</h3>
        {expiringUsers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('admin.noLicensesExpiringSoon')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
              <thead className="bg-yellow-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.userTableHeader')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('common.email')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.licenseTypeLabel')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.expiresLabel')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.alert')}</th>
                </tr>
              </thead>
              <tbody>
                {expiringUsers.map(u => (
                  <tr key={u.id} className="group hover:bg-yellow-50 dark:hover:bg-gray-700/80 transition-colors">
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{u.username}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white" title={u.email}>{maskEmail(u.email)}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">
                      {u.licenseType === 'lifetime' && t('admin.lifetime')}
                      {u.licenseType === 'monthly' && t('admin.monthly')}
                      {u.licenseType === 'quarterly' && t('admin.quarterly')}
                      {u.licenseType === 'temporary' && t('admin.temporary')}
                      {u.licenseType === 'trial' && t('admin.trial')}
                      {!u.licenseType && '—'}
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{u.licenseExpiresAt ? formatDateUTC(u.licenseExpiresAt) : '—'}</td>
                    <td className="px-4 py-2 border dark:border-gray-700">
                      {u.licenseAlert === 'expired' && <span className="text-red-600 dark:text-red-400 font-semibold">{t('admin.expired')}</span>}
                      {u.licenseAlert === '3_days' && <span className="text-red-600 dark:text-red-400 font-semibold">{t('admin.days3')}</span>}
                      {u.licenseAlert === '7_days' && <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{t('admin.days7')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-blue-600">
        <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200 mb-4">{t('admin.users')}</h3>
        {loading ? (
          <p className="text-gray-700 dark:text-gray-300">{t('common.loading')}</p>
        ) : error ? (
          <p className="text-red-600 dark:text-red-400">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('admin.noUsersFound') || 'No users found.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
              <thead className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-700">
                <tr>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.id')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('common.username')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('common.email')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.lastUpload')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.licenseKey')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.licenseType')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.expiresAt')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.alert')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.connectedPlatforms') || 'Plataformas'}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.isAdmin')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.extendTrialShort')}</th>
                  <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="group hover:bg-blue-50 dark:hover:bg-gray-700/80 transition-colors cursor-pointer" onClick={() => { setSelectedUser(u); setShowUserModal(true); }}>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{u.id}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{u.username}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">
                      {editingEmail === u.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="email"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            className="border dark:border-gray-600 px-2 py-1 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          />
                          <button onClick={(e) => { e.stopPropagation(); handleSaveEmail(u.id); }} className="text-green-600 dark:text-green-400 font-bold">{t('admin.save')}</button>
                          <button onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }} className="text-gray-500 dark:text-gray-400">{t('common.cancel')}</button>
                        </div>
                      ) : (
                        <span title={u.email}>{maskEmail(u.email)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 group-hover:dark:text-gray-200" title={u.lastUploadAt ? formatDateUTC(u.lastUploadAt) : ''}>
                      {u.lastUploadAt ? formatDateUTC(u.lastUploadAt) : <span className="text-gray-400 dark:text-gray-500">{t('admin.never')}</span>}
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700 font-mono text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{u.licenseKey || <span className="text-gray-400 dark:text-gray-500">{t('common.none') || 'None'}</span>}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">
                      {u.licenseType === 'lifetime' && t('admin.lifetime')}
                      {u.licenseType === 'monthly' && t('admin.monthly')}
                      {u.licenseType === 'quarterly' && t('admin.quarterly')}
                      {u.licenseType === 'temporary' && t('admin.temporary')}
                      {u.licenseType === 'trial' && t('admin.trial')}
                      {!u.licenseType && '—'}
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">
                      {u.licenseExpiresAt ? formatDateUTC(u.licenseExpiresAt) : '—'}
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700">
                      {u.licenseAlert === 'expired' && <span className="text-red-600 dark:text-red-400 font-semibold">{t('admin.expired')}</span>}
                      {u.licenseAlert === '3_days' && <span className="text-red-600 dark:text-red-400 font-semibold">{t('admin.days3')}</span>}
                      {u.licenseAlert === '7_days' && <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{t('admin.days7')}</span>}
                      {(!u.licenseAlert || u.licenseAlert === 'none') && <span className="text-gray-500 dark:text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700">
                      <div className="flex flex-wrap gap-1 items-center justify-center">
                        {u.connectedPlatforms?.google && (
                          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded border border-red-300 dark:border-red-700" title="Google">
                            🔴 Google
                          </span>
                        )}
                        {u.connectedPlatforms?.twitch && (
                          <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded border border-purple-300 dark:border-purple-700" title="Twitch">
                            🟣 Twitch
                          </span>
                        )}
                        {u.connectedPlatforms?.discord && (
                          <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded border border-indigo-300 dark:border-indigo-700" title="Discord">
                            🔵 Discord
                          </span>
                        )}
                        {u.connectedPlatforms?.email && (
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600" title="Email/Password">
                            ✉️ Email
                          </span>
                        )}
                        {u.connectedPlatforms?.twitter && (
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600" title="X (Twitter)">
                            𝕏 X
                          </span>
                        )}
                        {(!u.connectedPlatforms?.google && !u.connectedPlatforms?.twitch && !u.connectedPlatforms?.discord && !u.connectedPlatforms?.twitter && !u.connectedPlatforms?.email) && (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">{u.isAdmin ? t('common.yes') : t('common.no')}</td>
                    <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 group-hover:dark:text-white">
                      {u.licenseType === 'trial' ? (
                        <span className="text-xs">
                          {u.trialExtensions || 0} / 2
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border dark:border-gray-700">
                      <div className="flex flex-wrap gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        {u.licenseType === 'trial' && u.licenseExpiresAt && (u.trialExtensions || 0) < 2 && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="7"
                              value={extendTrialDays[u.id] || 7}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 7;
                                setExtendTrialDays(prev => ({ ...prev, [u.id]: Math.min(7, Math.max(1, value)) }));
                              }}
                              className="w-12 px-1 py-1 text-xs border rounded bg-white dark:bg-gray-900"
                              title={t('admin.extendTrialDaysTitle')}
                            />
                            <button
                              className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={extendingTrial === u.id}
                              onClick={() => handleExtendTrial(u.id)}
                              title={`${t('admin.extendTrial')} (${u.trialExtensions || 0}/2)`}
                            >
                              {extendingTrial === u.id ? '...' : t('admin.extendTrial')}
                            </button>
                          </div>
                        )}
                        {!u.licenseKey && (
                          <>
                            <button
                              className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={generating[u.id] || u.hasUsedTrial}
                              onClick={() => handleAssignTrial(u.id)}
                              title={u.hasUsedTrial ? t('admin.trialUsed') : t('admin.assignTrialTooltip')}
                            >
                              {generating[u.id] ? '...' : u.hasUsedTrial ? t('admin.trialUsedLabel') : t('admin.trial7Days')}
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={generating[u.id]}
                              onClick={() => handleGenerateLicense(u.id, 'monthly')}
                              title={t('admin.generateMonthly')}
                            >
                              {generating[u.id] ? '...' : t('admin.monthly')}
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={generating[u.id]}
                              onClick={() => handleGenerateLicense(u.id, 'lifetime')}
                              title={t('admin.generateLifetime')}
                            >
                              {generating[u.id] ? '...' : t('admin.lifetime')}
                            </button>
                            <button
                              className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={generating[u.id]}
                              onClick={() => handleGenerateLicense(u.id, 'quarterly')}
                              title={t('admin.generateQuarterly')}
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
                            title={t('admin.selectLicenseType')}
                          >
                            <option value="none">{t('admin.none')}</option>
                            <option value="monthly">{t('admin.monthly')}</option>
                            <option value="quarterly">{t('admin.quarterly')}</option>
                            <option value="temporary">{t('admin.temporary')}</option>
                            <option value="lifetime">{t('admin.lifetime')}</option>
                          </select>
                          <button
                            className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800"
                            onClick={() => handleUpdateLicense(u.id)}
                            title={t('admin.updateLicense')}
                          >
                            ✓
                          </button>
                        </div>
                        <button
                          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                          onClick={(e) => { e.stopPropagation(); handleEditEmail(u); }}
                          title={t('admin.changeEmail')}
                        >
                          📧
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={resetting === u.id}
                          onClick={(e) => { e.stopPropagation(); handleResetPassword(u.id); }}
                          title={t('admin.sendPasswordResetEmail')}
                        >
                          {resetting === u.id ? '...' : '🔑'}
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={deletingUserId === u.id || u.id === user?.id}
                          onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}
                          title={u.id === user?.id ? '' : t('admin.deleteUser')}
                        >
                          {deletingUserId === u.id ? '...' : t('admin.deleteUser')}
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
            </>
          )}

          {section === 'support' && (
            <>
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {t('admin.supportMessages')} {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <select
            value={messageFilters.status}
            onChange={(e) => setMessageFilters({ ...messageFilters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">{t('admin.allStatus')}</option>
            <option value="unread">{t('admin.unread')}</option>
            <option value="read">{t('admin.read')}</option>
            <option value="replied">{t('admin.replied')}</option>
            <option value="archived">{t('admin.archived')}</option>
          </select>
          <select
            value={messageFilters.resolved || ''}
            onChange={(e) => setMessageFilters({ ...messageFilters, resolved: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">{t('common.filter')}</option>
            <option value="false">{t('admin.active')}</option>
            <option value="true">{t('admin.resolved')}</option>
          </select>
          <select
            value={messageFilters.priority}
            onChange={(e) => setMessageFilters({ ...messageFilters, priority: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">{t('admin.allPriorities')}</option>
            <option value="urgent">{t('admin.urgent')}</option>
            <option value="high">{t('admin.high')}</option>
            <option value="normal">{t('admin.normal')}</option>
            <option value="low">{t('admin.low')}</option>
          </select>
          <select
            value={messageFilters.category}
            onChange={(e) => setMessageFilters({ ...messageFilters, category: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">{t('admin.allCategories')}</option>
            <option value="support">{t('admin.support')}</option>
            <option value="bug">{t('admin.bug')}</option>
            <option value="feature">{t('admin.feature')}</option>
            <option value="billing">{t('admin.billing')}</option>
            <option value="account">{t('admin.account')}</option>
            <option value="other">{t('admin.other')}</option>
          </select>
        </div>
        {messagesLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t('admin.loadingMessages')}</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">{t('admin.noMessagesFound')}</div>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleViewMessage(msg.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  msg.resolved
                    ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-75'
                    : msg.status === 'unread'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : msg.replies && msg.replies.length > 0
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{msg.subject}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        msg.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                        msg.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                        msg.priority === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {msg.priority}
                      </span>
                      {msg.category && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded">
                          {msg.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{msg.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <span>{t('admin.from')}: {msg.user?.username || msg.user?.email || 'Unknown'}</span>
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {msg.attachments.length}
                        </span>
                      )}
                      {msg.resolved && (
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          {t('admin.resolved')}
                        </span>
                      )}
                      {msg.replies && msg.replies.length > 0 && !msg.resolved && (
                        <span className="text-green-600 dark:text-green-400">
                          {msg.replies.length === 1 ? t('admin.replyCount', { count: 1 }) : t('admin.replyCount_other', { count: msg.replies.length })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                    {msg.status !== 'archived' && (
                      <button
                        onClick={() => handleUpdateStatus(msg.id, 'archived')}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        {t('admin.archive')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="px-2 py-1 text-xs bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded hover:bg-red-300 dark:hover:bg-red-900/60"
                    >
                      {t('admin.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
            </>
          )}

          {section === 'notifications' && (
            <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-amber-400">
        <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300 mb-4">{t('admin.sendNotificationTitle')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('admin.sendNotificationDescription')}
        </p>
        <div className="space-y-3 max-w-xl">
          <input
            type="text"
            placeholder={t('admin.notificationTitlePlaceholder')}
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <textarea
            placeholder={t('admin.notificationContentPlaceholder')}
            value={notifContent}
            onChange={(e) => setNotifContent(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={notifBroadcast}
              onChange={(e) => setNotifBroadcast(e.target.checked)}
              className="rounded"
            />
            {t('admin.sendToAllUsers')}
          </label>
          <button
            onClick={async () => {
              if (!notifTitle.trim() || !notifContent.trim()) {
                window.alert(t('admin.titleAndContentRequired'));
                return;
              }
              setSendingNotif(true);
              try {
                await sendNotification({ title: notifTitle.trim(), content: notifContent.trim(), broadcast: notifBroadcast, token });
                window.alert(t('admin.notificationSent'));
                setNotifTitle('');
                setNotifContent('');
              } catch (err) {
                window.alert(err.response?.data?.error || t('common.error'));
              } finally {
                setSendingNotif(false);
              }
            }}
            disabled={sendingNotif}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {sendingNotif ? t('admin.sendingNotification') : t('admin.sendNotification')}
          </button>
        </div>
      </div>
            </>
          )}

          {section === 'platforms' && (
            <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-purple-400">
        <h3 className="text-lg font-bold text-purple-700 dark:text-purple-300 mb-4">{t('admin.platformsTitle')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('admin.platformsDescription')}
        </p>
        {platformConfigLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(platformConfig).map(([platform, config]) => (
                <div
                  key={platform}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    config.enabled
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        config.enabled ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                          {config.label || platform}
                        </h4>
                        <p className={`text-sm ${
                          config.enabled
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {config.enabled ? t('admin.platformActive') : t('admin.platformInactive')}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enabled || false}
                        onChange={(e) => setPlatformConfig(prev => ({
                          ...prev,
                          [platform]: { ...prev[platform], enabled: e.target.checked }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleUpdatePlatformConfig}
                disabled={platformConfigLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {platformConfigLoading ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t('admin.saving')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('admin.savePlatformConfig')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
            </>
          )}

          {section === 'payments' && (
            <>
      {/* Gráfico de ingresos por semana */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-emerald-500 mb-6">
        <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-4">{t('admin.revenueChartWeekly') || 'Ingresos por semana'}</h3>
        {(revenue.weeklyTotals && revenue.weeklyTotals.length > 0) ? (
          <div className="w-full" style={{ minWidth: 280, height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={revenue.weeklyTotals.map((row) => ({ week: row.week, amount: Number(row.amount) }))}
                margin={{ top: 12, right: 16, left: 8, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                <XAxis dataKey="week" tick={{ fill: 'currentColor', fontSize: 11 }} className="text-gray-600 dark:text-gray-400" tickFormatter={(v) => (v || '').slice(0, 10)} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} className="text-gray-600 dark:text-gray-400" tickFormatter={(v) => `${revenue.currency} ${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--tw-bg-opacity, 1)', border: '1px solid rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: 'inherit' }}
                  formatter={(value) => [`${revenue.currency} ${Number(value).toFixed(2)}`, t('admin.amountLabel')]}
                  labelFormatter={(label) => (label ? String(label).slice(0, 10) : '')}
                />
                <Bar dataKey="amount" fill="#10b981" name={t('admin.amountLabel')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 py-6 text-center">{t('admin.noPaymentsRegistered')}</p>
        )}
      </div>
      {/* Gráfico mensual por tipo de suscripción (torta) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-emerald-600 mb-6">
        <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-4">{t('admin.revenueChartMonthly') || 'Ingresos por tipo de suscripción'}</h3>
        {(revenue.totalsByLicenseType && revenue.totalsByLicenseType.length > 0) ? (
          <div className="w-full" style={{ minWidth: 280, height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenue.totalsByLicenseType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'currentColor' }}
                >
                  {revenue.totalsByLicenseType.map((_, index) => (
                    <Cell key={index} fill={['#059669', '#0d9488', '#0891b2', '#6366f1', '#8b5cf6'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${revenue.currency} ${Number(value).toFixed(2)}`, t('admin.amountLabel')]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 py-6 text-center">{t('admin.noPaymentsRegistered')}</p>
        )}
      </div>
      {/* Costes fijos mensuales (control) - editables */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-amber-500 mb-6">
        <h3 className="text-lg font-bold text-amber-700 dark:text-amber-300 mb-4">{t('admin.fixedCostsTitle')}</h3>
        {fixedCostsLoading ? (
          <p className="text-gray-500 dark:text-gray-400 py-2">{t('admin.loading') || 'Cargando...'}</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {fixedCosts.map((item, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => setFixedCosts(prev => prev.map((x, i) => i === index ? { ...x, label: e.target.value } : x))}
                    placeholder={t('admin.fixedCostLabelPlaceholder') || 'Concepto'}
                    className="flex-1 min-w-[100px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => setFixedCosts(prev => prev.map((x, i) => i === index ? { ...x, amount: parseFloat(e.target.value) || 0 } : x))}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <input
                    type="text"
                    value={item.currency}
                    onChange={(e) => setFixedCosts(prev => prev.map((x, i) => i === index ? { ...x, currency: (e.target.value || 'EUR').toUpperCase().slice(0, 3) } : x))}
                    placeholder="EUR"
                    className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => setFixedCosts(prev => prev.filter((_, i) => i !== index))}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title={t('admin.remove') || 'Quitar'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFixedCosts(prev => [...prev, { label: '', amount: 0, currency: 'EUR' }])}
                className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 text-sm font-medium"
              >
                {t('admin.fixedCostAdd') || 'Añadir concepto'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const toSave = fixedCosts.map(x => ({ label: (x.label || '').trim() || 'Item', amount: Number(x.amount) || 0, currency: (x.currency || 'EUR').trim().toUpperCase() || 'EUR' })).filter(x => x.label && x.amount >= 0);
                  if (toSave.length === 0) { toast.error(t('admin.fixedCostsEmpty')); return; }
                  setFixedCostsSaving(true);
                  try {
                    await updateFixedCosts({ fixedCosts: toSave, token });
                    setFixedCosts(toSave);
                    toast.success(t('admin.fixedCostsSaved'));
                  } catch (err) {
                    toast.error(err.response?.data?.error || t('admin.fixedCostsSaveError'));
                  } finally {
                    setFixedCostsSaving(false);
                  }
                }}
                disabled={fixedCostsSaving}
                className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm"
              >
                {fixedCostsSaving ? (t('admin.saving') || 'Guardando...') : (t('admin.saveFixedCosts') || 'Guardar costes fijos')}
              </button>
            </div>
            {fixedCosts.length > 0 && (() => {
              const byCurrency = {};
              fixedCosts.forEach(x => { const c = (x.currency || 'EUR').toUpperCase(); byCurrency[c] = (byCurrency[c] || 0) + (Number(x.amount) || 0); });
              return (
                <p className="pt-3 border-t border-gray-200 dark:border-gray-600 font-semibold text-amber-800 dark:text-amber-200">
                  {t('admin.fixedCostsTotalMonthly')}: {Object.entries(byCurrency).map(([c, sum]) => `${sum.toFixed(2)} ${c}`).join(', ')}
                </p>
              );
            })()}
          </>
        )}
      </div>
      {/* Listado de pagos y descarga para gestores */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-t-4 border-indigo-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{t('admin.paymentsListTitle')}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={paymentListFilters.status}
              onChange={(e) => { setPaymentListFilters(prev => ({ ...prev, status: e.target.value })); setPaymentsOffset(0); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="">{t('admin.allStatuses')}</option>
              <option value="completed">completed</option>
              <option value="pending">pending</option>
              <option value="refunded">refunded</option>
              <option value="failed">failed</option>
            </select>
            <input
              type="date"
              value={paymentListFilters.from}
              onChange={(e) => { setPaymentListFilters(prev => ({ ...prev, from: e.target.value })); setPaymentsOffset(0); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              title={t('admin.fromDate')}
            />
            <input
              type="date"
              value={paymentListFilters.to}
              onChange={(e) => { setPaymentListFilters(prev => ({ ...prev, to: e.target.value })); setPaymentsOffset(0); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              title={t('admin.toDate')}
            />
            <button
              onClick={() => handleDownloadPayments('csv')}
              disabled={exporting}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {exporting ? '...' : t('admin.downloadCsv')}
            </button>
            <button
              onClick={() => handleDownloadPayments('json')}
              disabled={exporting}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
            >
              {t('admin.downloadJson')}
            </button>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <span>USD/EUR:</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pdfUsdToEurRate}
                onChange={(e) => setPdfUsdToEurRate(e.target.value || '0.92')}
                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                title={t('admin.pdfUsdEurRateTitle') || 'Cotización del día: 1 USD = X EUR'}
              />
            </label>
            <button
              onClick={handleDownloadPaymentsPdf}
              disabled={exporting}
              className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm"
            >
              {exporting ? '...' : t('admin.downloadPdfInvoices')}
            </button>
          </div>
        </div>
        {paymentsListError ? (
          <p className="text-amber-600 dark:text-amber-400 py-4 text-sm">{paymentsListError}</p>
        ) : paymentsLoading ? (
          <p className="text-gray-500 dark:text-gray-400 py-4">{t('admin.loadingPayments')}</p>
        ) : paymentsList.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 py-4">{t('admin.noPaymentsMatch')}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
                <thead className="bg-indigo-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100 text-left">{t('admin.id')}</th>
                    <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100 text-left">{t('admin.userTableHeader')}</th>
                    <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100 text-left">{t('common.email')}</th>
                    <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100 text-left">{t('admin.licenseTypeLabel')}</th>
                    <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100 text-right">{t('admin.amountLabel')}</th>
                    <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100 text-left">{t('dashboard.status') || 'Status'}</th>
                    <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100 text-left">{t('admin.recurring')}</th>
                    <th className="px-4 py-2 border dark:border-gray-600 text-gray-900 dark:text-gray-100 text-left">{t('admin.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.map(p => (
                    <tr key={p.id} className="hover:bg-indigo-50 dark:hover:bg-gray-700/80 transition-colors">
                      <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100">{p.id}</td>
                      <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100">{p.username || '—'}</td>
                      <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100" title={p.email}>{maskEmail(p.email || '')}</td>
                      <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100">{p.licenseType || '—'}</td>
                      <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 text-right">{p.currency} {Number(p.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 border dark:border-gray-700">
                        <span className={`px-2 py-0.5 text-xs rounded ${p.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : p.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' : p.status === 'refunded' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100">{p.isRecurring ? t('common.yes') : t('common.no')}</td>
                      <td className="px-4 py-2 border dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm">{(p.paidAt || p.createdAt) ? formatDateUTC(p.paidAt || p.createdAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin.showingPayments', { count: paymentsList.length, total: paymentsTotal })}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentsOffset(Math.max(0, paymentsOffset - paymentsLimit))}
                  disabled={paymentsOffset === 0}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm disabled:opacity-50"
                >
                  {t('admin.previous')}
                </button>
                <button
                  onClick={() => setPaymentsOffset(paymentsOffset + paymentsLimit)}
                  disabled={paymentsOffset + paymentsList.length >= paymentsTotal}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm disabled:opacity-50"
                >
                  {t('admin.next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
            </>
          )}
      </main>
      {/* Message Modal */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMessageModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedMessage.subject}</h2>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">From:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{selectedMessage.user?.username || selectedMessage.user?.email}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100 capitalize">{selectedMessage.priority}</span>
                </div>
                {selectedMessage.category && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100 capitalize">{selectedMessage.category}</span>
                  </div>
                )}
              </div>

              {/* Resolved Banner */}
              {selectedMessage.resolved && (
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      This conversation is resolved.
                      {selectedMessage.resolvedByUser && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          by {selectedMessage.resolvedByUser.username} on {new Date(selectedMessage.resolvedAt).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReopenMessage(selectedMessage.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Reopen
                  </button>
                </div>
              )}

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Message:</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMessage.content}</p>
                
                {/* User attachments */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Attachments:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedMessage.attachments.map((att, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={att.url}
                            alt={att.name || `Attachment ${idx + 1}`}
                            className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80"
                            onClick={() => setViewingImage(att.url)}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{att.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Conversation Thread */}
              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Conversation:</h3>
                  {selectedMessage.replies.map((reply, idx) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-lg border ${
                        reply.isAdmin
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {reply.isAdmin ? 'Administrator' : selectedMessage.user?.username || 'User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(reply.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">{reply.content}</p>
                      
                      {/* Reply attachments */}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="mt-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {reply.attachments.map((att, attIdx) => (
                              <div key={attIdx} className="relative">
                                <img
                                  src={att.url}
                                  alt={att.name || `Attachment ${attIdx + 1}`}
                                  className="w-full h-20 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80"
                                  onClick={() => setViewingImage(att.url)}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{att.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form (only if not resolved) */}
              {!selectedMessage.resolved && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reply:</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                    placeholder="Enter your reply..."
                  />
                  
                  {/* Reply attachments */}
                  <div className="mt-2">
                    <input
                      type="file"
                      ref={replyFileInputRef}
                      onChange={handleReplyFileSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="reply-attachment-input"
                    />
                    <label
                      htmlFor="reply-attachment-input"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Add Images ({replyAttachments.length}/5)
                    </label>
                    
                    {replyAttachments.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {replyAttachments.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-600"
                            />
                            <button
                              type="button"
                              onClick={() => removeReplyAttachment(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{file.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleReply}
                      disabled={replying || !replyText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {replying ? 'Sending...' : 'Send Reply'}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedMessage.id, 'read')}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      Mark as Read
                    </button>
                    <button
                      onClick={() => handleResolveMessage(selectedMessage.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark as Resolved
          </button>
        </div>
      </div>
      )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles del usuario */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUserModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Detalles del Usuario</h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ID</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedUser.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedUser.username}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedUser.email || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Es Admin</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedUser.isAdmin ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Licencia</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {selectedUser.licenseType === 'lifetime' && 'De por vida'}
                    {selectedUser.licenseType === 'monthly' && 'Mensual'}
                    {selectedUser.licenseType === 'quarterly' && 'Trimestral'}
                    {selectedUser.licenseType === 'temporary' && 'Temporal'}
                    {selectedUser.licenseType === 'trial' && 'Prueba'}
                    {!selectedUser.licenseType && 'Sin licencia'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clave de Licencia</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg font-mono text-sm">{selectedUser.licenseKey || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expira</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {selectedUser.licenseExpiresAt ? formatDateUTC(selectedUser.licenseExpiresAt) : 'N/A'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Última Subida</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {selectedUser.lastUploadAt ? formatDateUTC(selectedUser.lastUploadAt) : 'Nunca'}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plataformas Conectadas</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.connectedPlatforms?.google && (
                    <span className="px-3 py-2 text-sm font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded border border-red-300 dark:border-red-700">
                      🔴 Google
                    </span>
                  )}
                  {selectedUser.connectedPlatforms?.twitch && (
                    <span className="px-3 py-2 text-sm font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded border border-purple-300 dark:border-purple-700">
                      🟣 Twitch
                    </span>
                  )}
                  {selectedUser.connectedPlatforms?.discord && (
                    <span className="px-3 py-2 text-sm font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded border border-indigo-300 dark:border-indigo-700">
                      🔵 Discord
                    </span>
                  )}
                  {selectedUser.connectedPlatforms?.email && (
                    <span className="px-3 py-2 text-sm font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600">
                      ✉️ Email/Password
                    </span>
                  )}
                  {selectedUser.connectedPlatforms?.twitter && (
                    <span className="px-3 py-2 text-sm font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600">
                      𝕏 X (Twitter)
                    </span>
                  )}
                  {(!selectedUser.connectedPlatforms?.google && !selectedUser.connectedPlatforms?.twitch && !selectedUser.connectedPlatforms?.discord && !selectedUser.connectedPlatforms?.twitter && !selectedUser.connectedPlatforms?.email) && (
                    <span className="text-gray-400 dark:text-gray-500 text-sm">Ninguna plataforma conectada</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowUserModal(false); handleResetPassword(selectedUser.id); }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2"
                disabled={resetting === selectedUser.id}
              >
                🔑 {resetting === selectedUser.id ? 'Enviando...' : 'Enviar correo para cambio de contraseña'}
              </button>
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={viewingImage}
            alt="Viewing"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
} 
