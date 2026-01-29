import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import Joyride, { STATUS } from 'react-joyride';
import FileUpload from '../components/FileUpload';
import MediaGallery from '../components/MediaGallery';
import { 
  Calendar, 
  Clock, 
  Share2, 
  Save, 
  X, 
  CheckCircle,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
  Video,
  Lightbulb
} from 'lucide-react';

const Schedule = ({ user, token }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'post',
    platforms: [],
    scheduledFor: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    mediaUrls: [], // Array of media URLs to attach
    recurrence: {
      enabled: false,
      frequency: 'weekly',
      count: 1
    }
  });
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [templates, setTemplates] = useState(() => {
    try {
      const stored = localStorage.getItem('contentTemplates');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showTour, setShowTour] = useState(false);

  // Tour steps
  const steps = [
    {
      target: '.title-input',
      content: 'Enter a catchy title for your content. This will help you identify it later.',
      placement: 'bottom'
    },
    {
      target: '.content-textarea',
      content: 'Write your content here. You can include hashtags, mentions, and links.',
      placement: 'top'
    },
    {
      target: '.platforms-section',
      content: 'Select the platforms where you want to publish your content.',
      placement: 'bottom'
    },
    {
      target: '.datetime-section',
      content: 'Choose when you want your content to be published.',
      placement: 'top'
    },
    {
      target: '.submit-button',
      content: 'Click here to schedule your content!',
      placement: 'top'
    }
  ];

  useEffect(() => {
    // Show tour for new users (you can store this in localStorage)
    const hasSeenTour = localStorage.getItem('hasSeenScheduleTour');
    if (!hasSeenTour) {
      setShowTour(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('contentTemplates', JSON.stringify(templates));
  }, [templates]);

  const handleTourCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setShowTour(false);
      localStorage.setItem('hasSeenScheduleTour', 'true');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
    }
    
    if (!formData.contentType) {
      newErrors.contentType = 'Content type is required';
    }
    
    if (formData.platforms.length === 0) {
      newErrors.platforms = 'Select at least one platform';
    }
    
    if (!formData.scheduledFor) {
      newErrors.scheduledFor = 'Date is required';
    }
    
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);

    try {
      // Create date from user's local date/time selection
      const scheduledDateTime = new Date(`${formData.scheduledFor}T${formData.scheduledTime}`);
      
      // ⏱️ IMPORTANT: Always send dates as ISO string (UTC) to backend
      // Backend stores in UTC, frontend displays in user's local timezone
      const response = await apiClient.post('/content', {
        title: formData.title,
        content: formData.content,
        contentType: formData.contentType,
        platforms: formData.platforms,
        scheduledFor: scheduledDateTime.toISOString(), // Convert to UTC ISO string
        timezone: formData.timezone,
        mediaUrls: formData.mediaUrls, // Include media URLs
        recurrence: formData.recurrence
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      const createdCount = Array.isArray(response.data) ? response.data.length : 1;
      toast.success(`Content scheduled successfully! (${createdCount})`);
      
      // Suggest saving as template if form has meaningful content
      if (formData.title && formData.platforms.length > 0 && !templates.find(t => 
        t.title === formData.title && 
        JSON.stringify(t.platforms) === JSON.stringify(formData.platforms)
      )) {
        setTimeout(() => {
          toast((t) => (
            <div className="flex flex-col space-y-2">
              <p className="font-medium">💡 Do you want to save this as a template?</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setTemplateName(`${formData.title} Template`);
                    toast.dismiss(t.id);
                    setTimeout(() => {
                      handleSaveTemplate();
                    }, 100);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Save Template
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Maybe later
                </button>
              </div>
            </div>
          ), { duration: 8000 });
        }, 1000);
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error scheduling content:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to schedule content. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePlatformToggle = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
    
    if (errors.platforms) {
      setErrors(prev => ({ ...prev, platforms: '' }));
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }
    
    // Check if template with same name already exists
    if (templates.find(t => t.name.toLowerCase() === templateName.trim().toLowerCase())) {
      toast.error('A template with this name already exists');
      return;
    }
    
    const template = {
      id: Date.now(),
      name: templateName.trim(),
      title: formData.title,
      content: formData.content,
      platforms: formData.platforms,
      contentType: formData.contentType,
      scheduledTime: formData.scheduledTime
    };
    setTemplates(prev => [...prev, template]);
    setTemplateName('');
    toast.success(`Template "${template.name}" saved successfully!`);
  };

  const handleApplyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      title: template.title || '',
      content: template.content || '',
      platforms: template.platforms || [],
      contentType: template.contentType || prev.contentType,
      scheduledTime: template.scheduledTime || prev.scheduledTime
    }));
    toast.success(`Template "${template.name}" applied`);
  };

  const handleMediaSelect = (url, bucket) => {
    setFormData(prev => {
      const currentUrls = prev.mediaUrls || [];
      if (currentUrls.includes(url)) {
        // Deselect if already selected
        return {
          ...prev,
          mediaUrls: currentUrls.filter(u => u !== url)
        };
      } else {
        // Select if not selected
        return {
          ...prev,
          mediaUrls: [...currentUrls, url]
        };
      }
    });
  };

  const handleUploadComplete = (url, bucket) => {
    // Automatically add uploaded file to selected media
    setFormData(prev => ({
      ...prev,
      mediaUrls: [...(prev.mediaUrls || []), url]
    }));
    toast.success('Archivo subido y agregado al post');
  };

  const platforms = [
    { id: 'twitch', name: 'Twitch', color: 'bg-purple-500' },
    { id: 'twitter', name: 'Twitter', color: 'bg-blue-400' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
    { id: 'discord', name: 'Discord', color: 'bg-indigo-500' }
  ];

  // Common timezones for easier selection
  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Madrid',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Moscow',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];

  // Dynamic tips based on form state
  const getDynamicTip = () => {
    if (!formData.title || formData.title.trim().length < 5) {
      return '💡 Tip: Los títulos con emojis tienen más engagement';
    }
    if (!formData.content.includes('#') && !formData.content.match(/#\w+/g)) {
      return '💡 Tip: Añade 3–5 hashtags para mejorar alcance';
    }
    if (formData.platforms.length === 0) {
      return '💡 Tip: Selecciona múltiples plataformas para mayor alcance';
    }
    if (formData.platforms.length === 1) {
      return '💡 Tip: Cross-post en múltiples plataformas aumenta tu visibilidad';
    }
    // Check if scheduled time is outside typical peak hours (19-22h local)
    if (formData.scheduledTime) {
      const hour = parseInt(formData.scheduledTime.split(':')[0]);
      if (hour < 19 || hour > 22) {
        return '💡 Tip: En tu zona horaria el pico suele ser 19–22h';
      }
    }
    return '💡 Tip: Programa contenido consistente para construir audiencia';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 dark:from-gray-900 dark:to-gray-900 py-8">
      <Joyride
        steps={steps}
        run={showTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: '#3b82f6',
            zIndex: 1000,
          }
        }}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule New Content</h1>
          <p className="text-gray-600">Create and schedule your content across multiple platforms</p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="title-input">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Content Title <span className="text-red-500">*</span>
                    </label>
              <div className="relative">
                    <input
                  id="title"
                      type="text"
                      value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter a catchy title..."
                />
                {errors.title && (
                  <div className="absolute right-3 top-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
                  </div>
                  
            {/* Content */}
            <div className="content-textarea">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
                    </label>
              <div className="relative">
                    <textarea
                  id="content"
                  rows={6}
                      value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    errors.content ? 'border-red-500' : 'border-gray-300'
                  }`}
                      placeholder="Write your content here..."
                    />
                {errors.content && (
                  <div className="absolute right-3 top-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
                    </div>
              <div className="flex justify-between items-center mt-1">
                {errors.content && (
                  <p className="text-sm text-red-600">{errors.content}</p>
                )}
                <p className="text-sm text-gray-500 ml-auto">
                  {formData.content.length}/500 characters
                </p>
                    </div>
                  </div>

            {/* Media Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4" />
                    <span>Archivos e Imagenes</span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setShowMediaSection(!showMediaSection)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showMediaSection ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {showMediaSection && (
                <div className="space-y-4">
                  {/* File Upload */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Subir nuevo archivo
                    </h4>
                    <FileUpload 
                      user={user} 
                      onUploadComplete={handleUploadComplete}
                    />
                  </div>

                  {/* Media Gallery */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Archivos disponibles
                    </h4>
                    <MediaGallery 
                      user={user}
                      onSelect={handleMediaSelect}
                      selectedUrls={formData.mediaUrls || []}
                    />
                  </div>

                  {/* Selected Media Preview */}
                  {formData.mediaUrls && formData.mediaUrls.length > 0 && (
                    <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                        Archivos seleccionados ({formData.mediaUrls.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.mediaUrls.map((url, index) => (
                          <div
                            key={index}
                            className="relative group"
                          >
                            <div className="w-16 h-16 rounded border-2 border-blue-500 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                              {url.includes('images') ? (
                                <img 
                                  src={url} 
                                  alt={`Media ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Video className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleMediaSelect(url)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content Type */}
            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
                Content Type <span className="text-red-500">*</span>
              </label>
              <select
                id="contentType"
                value={formData.contentType}
                onChange={(e) => handleInputChange('contentType', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.contentType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="post">Post</option>
                <option value="stream">Stream</option>
                <option value="event">Event</option>
                <option value="reel">Reel</option>
              </select>
              {errors.contentType && (
                <p className="mt-1 text-sm text-red-600">{errors.contentType}</p>
              )}
            </div>
                  
            {/* Platforms */}
            <div className="platforms-section">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                Platforms <span className="text-red-500">*</span>
                      </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                      formData.platforms.includes(platform.id)
                        ? `${platform.color} border-transparent text-white shadow-lg transform scale-105`
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <Share2 className="w-6 h-6" />
                    <span className="text-sm font-medium">{platform.name}</span>
                    {formData.platforms.includes(platform.id) && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
              {errors.platforms && (
                <p className="mt-1 text-sm text-red-600">{errors.platforms}</p>
              )}
                    </div>
                    
            {/* Date and Time */}
            <div className="datetime-section grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                      </label>
                <div className="relative">
                      <input
                    id="scheduledFor"
                    type="date"
                    value={formData.scheduledFor}
                    onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.scheduledFor ? 'border-red-500' : 'border-gray-300'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                {errors.scheduledFor && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduledFor}</p>
                )}
              </div>

              <div>
                <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <Clock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                {errors.scheduledTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduledTime}</p>
                )}
              </div>
              </div>

              {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                <X className="w-4 h-4" />
                <span>Cancel</span>
                </button>
                <button
                  type="submit"
                disabled={loading}
                className="submit-button px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Scheduling...</span>
                  </>
                  ) : (
                    <>
                    <Save className="w-4 h-4" />
                    <span>Schedule Content</span>
                    </>
                  )}
                </button>
              </div>
          </form>
        </div>

        {/* Additional Options Section */}
        <div className="mt-8 space-y-6">
          {/* Timezone */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {commonTimezones.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
              {!commonTimezones.includes(formData.timezone) && (
                <option value={formData.timezone}>{formData.timezone.replace(/_/g, ' ')}</option>
              )}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              All scheduled times will be shown in this timezone.
            </p>
          </div>

          {/* Recurring Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recurring schedule</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Schedule content to repeat automatically (perfect for regular streams)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.recurrence.enabled}
                  onChange={(e) => handleInputChange('recurrence', {
                    ...formData.recurrence,
                    enabled: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {formData.recurrence.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Frequency</label>
                  <select
                    value={formData.recurrence.frequency}
                    onChange={(e) => handleInputChange('recurrence', {
                      ...formData.recurrence,
                      frequency: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Occurrences</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.recurrence.count}
                    onChange={(e) => handleInputChange('recurrence', {
                      ...formData.recurrence,
                      count: Number(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Templates */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Templates</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Save reusable schedules (title, platforms, time) to speed up your workflow.
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 mb-3">
              <input
                type="text"
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700"
              />
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Template
              </button>
            </div>
            {templates.length === 0 ? (
              <div className="text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No templates yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Fill out the form above and save it as a template for quick reuse.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {templates.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleApplyTemplate(template)}
                    className="px-3 py-1 border rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                  Tip profesional
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {getDynamicTip()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule; 
