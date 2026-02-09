import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, getTwitchDashboardStats, getTwitchSubs, getTwitchBits, getTwitchDonations } from '../api';
import AdminDashboard from './AdminDashboard';
import { useLanguage } from '../contexts/LanguageContext';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import toast from 'react-hot-toast';
import { formatDate, formatDateWithUTC } from '../utils/dateUtils';
import { getPlatformColor } from '../utils/platformColors';
import { copyPostToClipboard } from '../utils/copyPastePost';
import TrialWarning from '../components/TrialWarning';
import { SearchAdvanced } from '../components/SearchAdvanced';
import { 
  Calendar as CalendarIcon, 
  Settings, 
  User, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  X,
  Trash2,
  Twitch,
  Twitter,
  Instagram,
  Download,
  Eye,
  Copy,
  Clipboard,
  RefreshCw,
  CalendarPlus,
  Image as ImageIcon,
  Video,
  Paperclip
} from 'lucide-react';

// Discord icon - Icons8 id 30888
const DISCORD_ICON_URL = 'https://img.icons8.com/?size=100&id=30888&format=png&color=000000';

const Dashboard = ({ user, token, ...props }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    platform: 'all',
    dateRange: 'all'
  });
  const [selectedContent, setSelectedContent] = useState(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [twitchStats, setTwitchStats] = useState(null);
  const [twitchStatsLoading, setTwitchStatsLoading] = useState(false);
  const [bitsFormat, setBitsFormat] = useState('chronological'); // 'chronological' o 'total'

  const showTwitchOnDashboard = user && !user.isAdmin && (
    user.dashboardShowTwitchSubs || user.dashboardShowTwitchBits || user.dashboardShowTwitchDonations
  );

  useEffect(() => {
    if (user && !user.isAdmin) fetchContents();
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (!showTwitchOnDashboard) {
      setTwitchStats(null);
      return;
    }
    let cancelled = false;
    setTwitchStatsLoading(true);
    getTwitchDashboardStats()
      .then((data) => {
        if (!cancelled) setTwitchStats(data);
      })
      .catch(() => {
        if (!cancelled) setTwitchStats(null);
      })
      .finally(() => {
        if (!cancelled) setTwitchStatsLoading(false);
      });
    return () => { cancelled = true; };
  }, [showTwitchOnDashboard]);

  const fetchContents = async (options = {}) => {
    try {
      const response = await apiClient.get('/content', {
        params: {
          page: options.page || 1,
          limit: options.limit || 100,
          status: filters.status !== 'all' ? filters.status : undefined,
          platform: filters.platform !== 'all' ? filters.platform : undefined,
          search: searchTerm || undefined,
          dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      // Handle paginated response
      if (response.data.data) {
        setContents(response.data.data);
      } else {
        setContents(response.data);
      }
    } catch (error) {
      setContents([]);
      toast.error('Error loading scheduled content');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform, size = 'w-5 h-5') => {
    const className = `${size}`;
    switch (platform) {
      case 'twitch':
        return <Twitch className={className} />;
      case 'twitter':
        return <Twitter className={className} />;
      case 'youtube':
        return <Video className={className} />;
      case 'instagram':
        return <Instagram className={className} />;
      case 'discord':
        return (
          <img
            src={DISCORD_ICON_URL}
            alt="Discord"
            className={`${className} object-contain dark:invert`}
          />
        );
      case 'tiktok':
        return <Video className={className} />;
      default:
        return null;
    }
  };

  const getPlatformLabel = (platform) => {
    const labels = { twitch: 'Twitch', twitter: 'Twitter', youtube: 'YouTube', instagram: 'Instagram', discord: 'Discord', tiktok: 'TikTok' };
    return labels[platform] || platform;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };


  const handleDeleteContent = async (contentId) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await apiClient.delete(`/content/${contentId}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });
        toast.success('Content deleted successfully');
        fetchContents();
      } catch (error) {
        toast.error('Failed to delete content');
      }
    }
  };

  const handleCopyPostToClipboard = async (content) => {
    try {
      const text = copyPostToClipboard(content);
      await navigator.clipboard.writeText(text);
      toast.success(t('dashboard.postCopied') || 'Post copied. Paste it in Schedule.');
    } catch (err) {
      toast.error(t('dashboard.copyFailed') || 'Could not copy to clipboard');
    }
  };

  const handleDuplicateContent = async (content) => {
    try {
      const items = content.files?.items ?? (content.files?.urls ? content.files.urls.map((url) => ({ url })) : []);
      const newContent = {
        title: `${content.title} (Copy)`,
        content: content.content,
        contentType: content.contentType,
        platforms: content.platforms,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timezone: content.timezone,
        recurrence: content.recurrence,
        ...(items.length > 0 && { mediaItems: items })
      };

      await apiClient.post('/content', newContent, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success('Content duplicated successfully');
      fetchContents();
    } catch (error) {
      toast.error('Failed to duplicate content');
    }
  };

  const handleExportData = async () => {
    try {
      const response = await apiClient.get('/content/export', {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `content-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  // Función para convertir datos a CSV
  const convertToCSV = (data, headers) => {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => headers.map(header => {
      const value = row[header] || '';
      // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
      return typeof value === 'string' && (value.includes(',') || value.includes('\n'))
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    }).join(','));
    return [csvHeaders, ...csvRows].join('\n');
  };

  // Descargar lista de suscriptores
  const handleDownloadSubs = async () => {
    try {
      const data = await getTwitchSubs();
      if (!data.subscriptions || data.subscriptions.length === 0) {
        toast.error(t('dashboard.noSubsToDownload'));
        return;
      }
      
      // Formatear datos para CSV: Usuario, Fecha de suscripción, Tipo, Meses
      const csvData = data.subscriptions.map(sub => ({
        usuario: sub.user_name || sub.user_login || 'N/A',
        fecha: sub.tier || 'N/A',
        tipo: sub.tier || 'N/A',
        meses: sub.cumulative_months || 0
      }));
      
      const csv = convertToCSV(csvData, ['usuario', 'fecha', 'tipo', 'meses']);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `twitch-subs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(t('dashboard.subsDownloaded'));
    } catch (error) {
      toast.error(t('dashboard.errorDownloadingSubs'));
    }
  };

  // Descargar lista de bits
  const handleDownloadBits = async () => {
    try {
      const data = await getTwitchBits(bitsFormat);
      if (!data.bits || data.bits.length === 0) {
        toast.error(t('dashboard.noBitsToDownload'));
        return;
      }
      
      let csvData;
      if (bitsFormat === 'chronological') {
        // Orden cronológico: Usuario, Cantidad, Fecha
        csvData = data.bits.map(bit => ({
          usuario: bit.user_name || bit.user_login || 'N/A',
          cantidad: bit.amount || 0,
          fecha: bit.date || 'N/A'
        }));
      } else {
        // Total por usuario: Usuario, Total
        const totals = {};
        data.bits.forEach(bit => {
          const user = bit.user_name || bit.user_login || 'N/A';
          totals[user] = (totals[user] || 0) + (bit.amount || 0);
        });
        csvData = Object.entries(totals).map(([usuario, total]) => ({
          usuario,
          total
        }));
      }
      
      const headers = bitsFormat === 'chronological' 
        ? ['usuario', 'cantidad', 'fecha']
        : ['usuario', 'total'];
      const csv = convertToCSV(csvData, headers);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `twitch-bits-${bitsFormat}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(t('dashboard.bitsDownloaded'));
    } catch (error) {
      toast.error(t('dashboard.errorDownloadingBits'));
    }
  };

  // Descargar lista de donaciones
  const handleDownloadDonations = async () => {
    try {
      const data = await getTwitchDonations();
      if (!data.donations || data.donations.length === 0) {
        toast.error(t('dashboard.noDonationsToDownload'));
        return;
      }
      
      // Formatear datos para CSV: Usuario, Cantidad, Mensaje, Fecha
      const csvData = data.donations.map(donation => ({
        usuario: donation.name || donation.user_name || 'Anónimo',
        cantidad: donation.amount || 0,
        mensaje: donation.message || '',
        fecha: donation.created_at || donation.date || 'N/A'
      }));
      
      const csv = convertToCSV(csvData, ['usuario', 'cantidad', 'mensaje', 'fecha']);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `twitch-donations-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(t('dashboard.donationsDownloaded'));
    } catch (error) {
      toast.error(t('dashboard.errorDownloadingDonations'));
    }
  };

  // Filter and search logic
  const filteredContents = contents.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || content.status === filters.status;
    
    const matchesPlatform = filters.platform === 'all' || 
                           (Array.isArray(content.platforms) && content.platforms.includes(filters.platform));
    
    const contentDate = new Date(content.scheduledFor);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    let matchesDateRange = true;
    switch (filters.dateRange) {
      case 'today':
        matchesDateRange = contentDate.toDateString() === today.toDateString();
        break;
      case 'tomorrow':
        matchesDateRange = contentDate.toDateString() === tomorrow.toDateString();
        break;
      case 'this-week':
        matchesDateRange = contentDate >= today && contentDate <= nextWeek;
        break;
      case 'past':
        matchesDateRange = contentDate < today;
        break;
      default:
        matchesDateRange = true;
    }
    
    return matchesSearch && matchesStatus && matchesPlatform && matchesDateRange;
  });

  const DragAndDropCalendar = withDragAndDrop(BigCalendar);
  const locales = { 'en-US': require('date-fns/locale/en-US') };
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales
  });

  const calendarEvents = filteredContents.map(content => ({
    id: content.id,
    title: content.title,
    start: new Date(content.scheduledFor),
    end: new Date(new Date(content.scheduledFor).getTime() + 30 * 60 * 1000),
    resource: content
  }));

  const eventStyleGetter = (event) => {
    const color = getPlatformColor(event.resource?.platforms);
    return {
      style: {
        backgroundColor: color,
        borderLeft: `4px solid ${color}`,
        color: '#fff',
        borderRadius: '4px',
      }
    };
  };

  const handleEventDrop = async ({ event, start, end }) => {
    try {
      await apiClient.put(`/content/${event.id}`, {
        scheduledFor: start.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      toast.success('Content rescheduled');
      fetchContents();
    } catch (error) {
      toast.error('Failed to reschedule');
    }
  };

  // Si es admin, muestra el dashboard de admin
  if (user && user.isAdmin) {
    return <AdminDashboard user={user} token={token} {...props} />;
  }

  // Filtrar posts por día seleccionado
  const postsForSelectedDay = filteredContents.filter(content => {
    const contentDate = new Date(content.scheduledFor);
    return (
      contentDate.getFullYear() === selectedDate.getFullYear() &&
      contentDate.getMonth() === selectedDate.getMonth() &&
      contentDate.getDate() === selectedDate.getDate()
    );
  });

  // Dashboard de usuario normal
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Streamer Scheduler</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <User className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 min-w-0">
        {/* Trial Warning */}
        {!user?.isAdmin && <TrialWarning user={user} />}

        {/* Twitch: suscripciones, bits, donaciones (según preferencias del perfil) */}
        {showTwitchOnDashboard && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border-t-4 border-purple-500 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-400 mb-4 flex items-center">
              <Twitch className="w-5 h-5 mr-2 flex-shrink-0" />
              {t('dashboard.twitchStats') || 'Datos de Twitch'}
            </h3>
            {twitchStatsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading...'}</p>
            ) : !twitchStats?.twitchConnected ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('dashboard.twitchConnectPrompt') || 'Conecta Twitch en Ajustes para ver suscripciones, bits y donaciones aquí.'}
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="ml-2 text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {t('settings.title') || 'Ajustes'}
                </button>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {user.dashboardShowTwitchSubs && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('dashboard.statsSubscriptions')}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {twitchStats?.subscriptions?.total ?? 0}
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadSubs}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title={t('dashboard.downloadSubs')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                {user.dashboardShowTwitchBits && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('dashboard.statsBits')}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {twitchStats?.bits?.total ?? 0}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setBitsFormat('chronological')}
                            className={`text-xs px-2 py-1 rounded ${bitsFormat === 'chronological' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                          >
                            {t('dashboard.chronological')}
                          </button>
                          <button
                            onClick={() => setBitsFormat('total')}
                            className={`text-xs px-2 py-1 rounded ${bitsFormat === 'total' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                          >
                            {t('dashboard.total')}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleDownloadBits}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title={bitsFormat === 'chronological' ? t('dashboard.downloadBitsChronological') : t('dashboard.downloadBitsTotal')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                {user.dashboardShowTwitchDonations && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('dashboard.statsDonations')}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {twitchStats?.donations?.total ?? 0}
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadDonations}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                        title={t('dashboard.downloadDonations')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendario */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border-t-4 border-blue-400 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 flex-shrink-0" />Calendar</h3>
          <div className="h-[350px] sm:h-[450px] lg:h-[600px] min-h-[280px]">
            <DragAndDropCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              defaultView="week"
              views={['week', 'month', 'day']}
              onEventDrop={handleEventDrop}
              eventPropGetter={eventStyleGetter}
              selectable
              onSelectSlot={(slotInfo) => setSelectedDate(slotInfo.start)}
              onSelectEvent={(event) => {
                setSelectedContent(event.resource);
                setShowContentModal(true);
              }}
              style={{ height: '100%' }}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Selected: {selectedDate.toLocaleDateString()}</p>
        </div>

        {/* Lista de posts del día */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border-t-4 border-blue-600 overflow-hidden">
          {/* Search and Filters */}
          <div className="mb-6">
            <SearchAdvanced
              onSearch={(t) => setSearchTerm(t || '')}
              onFilterChange={(newF) => setFilters({
                status: newF.status ?? 'all',
                platform: newF.platform ?? 'all',
                dateRange: newF.dateRange ?? 'all'
              })}
              filters={filters}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={handleExportData}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
              >
                <Download className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={fetchContents}
                className="p-2 sm:px-3 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">Scheduled Content</h2>
          <button
            onClick={() => navigate('/schedule')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span>New Content</span>
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
              {loading ? (
                <div className="p-8 text-center">Loading...</div>
              ) : postsForSelectedDay.length === 0 ? (
            <div className="p-8 text-center">
                  <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled content for this day</h3>
              <p className="text-gray-600 mb-4">Start by scheduling your first content</p>
              <button
                onClick={() => navigate('/schedule')}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
              >
                Create Content
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Platforms
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                      Scheduled for
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {postsForSelectedDay.map((content) => (
                    <tr key={content.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap max-w-[120px] sm:max-w-none">
                        <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" 
                                   onClick={() => {
                                     setSelectedContent(content);
                                     setShowContentModal(true);
                                   }}>
                                {content.title}
                              </div>
                          <div className="text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">{content.content}</div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                              {Array.isArray(content.platforms)
                                ? content.platforms.map((platform) => (
                            <div key={platform} className="p-1.5 rounded inline-flex items-center text-white" style={{ backgroundColor: getPlatformColor(platform) }} title={getPlatformLabel(platform)}>
                              {getPlatformIcon(platform)}
                                    </div>
                                  ))
                                : null}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 hidden sm:table-cell" title={content.scheduledFor ? formatDateWithUTC(content.scheduledFor).utc + ' (UTC)' : ''}>
                            {formatDate(content.scheduledFor)}
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{t('dashboard.localTime') || 'hora local'}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(content.status)}
                          <span className="ml-2 text-sm text-gray-900 dark:text-gray-100 capitalize">{content.status}</span>
                        </div>
                      </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1 sm:space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedContent(content);
                                  setShowContentModal(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCopyPostToClipboard(content)}
                                className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                title={t('dashboard.copyPost') || 'Copy post (paste in Schedule)'}
                              >
                                <Clipboard className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicateContent(content)}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                          </button>
                              <button
                                onClick={() => handleDeleteContent(content.id)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                            <Trash2 className="w-4 h-4" />
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

        {/* Content Details Modal */}
        {showContentModal && selectedContent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedContent.title}</h2>
                <button
                  onClick={() => setShowContentModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</h3>
                  <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedContent.content}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platforms</h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(selectedContent.platforms)
                        ? selectedContent.platforms.map((platform) => (
                            <div key={platform} className="p-2 rounded-lg flex items-center space-x-2 text-white" style={{ backgroundColor: getPlatformColor(platform) }}>
                              {getPlatformIcon(platform, 'w-5 h-5')}
                              <span className="text-sm font-medium">{getPlatformLabel(platform)}</span>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h3>
                    <div className="flex items-center">
                      {getStatusIcon(selectedContent.status)}
                      <span className="ml-2 text-sm capitalize text-gray-900 dark:text-gray-100">{selectedContent.status}</span>
                    </div>
                    {selectedContent.status === 'published' && selectedContent.publishedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Published at: {formatDate(selectedContent.publishedAt)}
                      </p>
                    )}
                    {selectedContent.status === 'failed' && selectedContent.publishError && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1" title={selectedContent.publishError}>
                        Error: {selectedContent.publishError}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.scheduledFor')}</h3>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedContent.scheduledFor)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('dashboard.yourLocalTime') || 'Tu hora local'} · UTC: {selectedContent.scheduledFor ? formatDateWithUTC(selectedContent.scheduledFor).utc : '—'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.createdAt')}</h3>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedContent.createdAt)}</p>
                  </div>
                </div>

                {(() => {
                  const files = selectedContent.files;
                  const items = files?.items ?? (files?.urls ? files.urls.map((url) => ({ url })) : []);
                  if (!items || items.length === 0) return null;
                  const formatDuration = (sec) => {
                    if (sec == null || sec < 0) return null;
                    const m = Math.floor(sec / 60);
                    const s = Math.floor(sec % 60);
                    return `${m}:${String(s).padStart(2, '0')}`;
                  };
                  return (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        {t('dashboard.attachedFiles')}
                      </h3>
                      <ul className="space-y-2">
                        {items.map((file, idx) => {
                          const url = typeof file === 'string' ? file : file.url;
                          const type = typeof file === 'object' && file.type ? file.type : (url && url.includes('videos') ? 'video' : 'image');
                          const name = typeof file === 'object' && file.fileName ? file.fileName : (url ? url.split('/').pop() || t('dashboard.file') : t('dashboard.file'));
                          const duration = typeof file === 'object' && file.durationSeconds != null ? formatDuration(file.durationSeconds) : null;
                          return (
                            <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center gap-3 min-w-0">
                                {type === 'video' ? (
                                  <Video className="w-5 h-5 text-purple-500 flex-shrink-0" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={name}>{name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t(`dashboard.${type}`)}
                                    {type === 'video' && duration != null && ` · ${t('dashboard.duration')}: ${duration}`}
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })()}
              </div>
              
              <div className="flex flex-wrap gap-2 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleCopyPostToClipboard(selectedContent)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center gap-2"
                >
                  <Clipboard className="w-4 h-4" />
                  {t('dashboard.copyPost') || 'Copy post'}
                </button>
                <button
                  onClick={() => handleDuplicateContent(selectedContent)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDeleteContent(selectedContent.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowContentModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard; 
