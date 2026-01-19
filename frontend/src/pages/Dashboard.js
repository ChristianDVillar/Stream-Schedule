import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import AdminDashboard from './AdminDashboard';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import toast from 'react-hot-toast';
import { 
  Calendar as CalendarIcon, 
  Settings, 
  User, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Trash2,
  Twitch,
  Twitter,
  Instagram,
  MessageCircle,
  Search,
  Filter,
  Download,
  Eye,
  Copy,
  RefreshCw,
  X
} from 'lucide-react';

const Dashboard = ({ user, token, ...props }) => {
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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);
  const [showContentModal, setShowContentModal] = useState(false);

  useEffect(() => {
    if (user && !user.isAdmin) fetchContents();
    // eslint-disable-next-line
  }, [user]);

  const fetchContents = async () => {
    try {
      const response = await apiClient.get('/content', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });
      setContents(response.data);
    } catch (error) {
      setContents([]);
      toast.error('Error loading scheduled content');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'twitch':
        return <Twitch className="w-4 h-4" />;
      case 'twitter':
        return <Twitter className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'discord':
        return <MessageCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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

  const handleDuplicateContent = async (content) => {
    try {
      const newContent = {
        ...content,
        title: `${content.title} (Copy)`,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
      };
      delete newContent.id;
      
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Streamer Scheduler</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <User className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Calendario */}
          <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-400 flex flex-col items-center">
            <h3 className="text-lg font-bold text-blue-700 mb-4 flex items-center"><CalendarIcon className="w-5 h-5 mr-2" />Calendar</h3>
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              className="mb-2"
            />
            <p className="text-sm text-gray-600 mt-2">Selected: {selectedDate.toLocaleDateString()}</p>
          </div>
          
          {/* Lista de posts del día */}
          <div className="md:col-span-2 bg-white rounded-lg shadow p-6 border-t-4 border-blue-600">
            {/* Search and Filters */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                      showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>Filters</span>
                  </button>
                  <button
                    onClick={handleExportData}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={fetchContents}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
              </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="published">Published</option>
                        <option value="failed">Failed</option>
                      </select>
            </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                      <select
                        value={filters.platform}
                        onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Platforms</option>
                        <option value="twitch">Twitch</option>
                        <option value="twitter">Twitter</option>
                        <option value="instagram">Instagram</option>
                        <option value="discord">Discord</option>
                      </select>
          </div>
          
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                      <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="tomorrow">Tomorrow</option>
                        <option value="this-week">This Week</option>
                        <option value="past">Past</option>
                      </select>
              </div>
            </div>
          </div>
              )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Scheduled Content</h2>
          <button
            onClick={() => navigate('/schedule')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Content</span>
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platforms
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled for
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                      {postsForSelectedDay.map((content) => (
                    <tr key={content.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                              <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600" 
                                   onClick={() => {
                                     setSelectedContent(content);
                                     setShowContentModal(true);
                                   }}>
                                {content.title}
                              </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">{content.content}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                              {Array.isArray(content.platforms)
                                ? content.platforms.map((platform) => (
                            <div key={platform} className="p-1 bg-gray-100 rounded">
                              {getPlatformIcon(platform)}
                                    </div>
                                  ))
                                : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(content.scheduledFor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(content.status)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">{content.status}</span>
                        </div>
                      </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
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
          </div>
        </div>

        {/* Content Details Modal */}
        {showContentModal && selectedContent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">{selectedContent.title}</h2>
                <button
                  onClick={() => setShowContentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Content</h3>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedContent.content}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Platforms</h3>
                    <div className="flex space-x-2">
                      {Array.isArray(selectedContent.platforms)
                        ? selectedContent.platforms.map((platform) => (
                            <div key={platform} className="p-2 bg-gray-100 rounded-lg flex items-center space-x-2">
                              {getPlatformIcon(platform)}
                              <span className="text-sm capitalize">{platform}</span>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                    <div className="flex items-center">
                      {getStatusIcon(selectedContent.status)}
                      <span className="ml-2 text-sm capitalize">{selectedContent.status}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Scheduled For</h3>
                  <p className="text-gray-900">{formatDate(selectedContent.scheduledFor)}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => handleDuplicateContent(selectedContent)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => handleDeleteContent(selectedContent.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowContentModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
