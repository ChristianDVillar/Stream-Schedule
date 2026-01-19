import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import toast from 'react-hot-toast';
import Joyride, { STATUS } from 'react-joyride';
import { 
  Calendar, 
  Clock, 
  Share2, 
  Save, 
  X, 
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Schedule = ({ user, token }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    platforms: [],
    scheduledFor: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recurrence: {
      enabled: false,
      frequency: 'weekly',
      count: 1
    }
  });
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
      const scheduledDateTime = new Date(`${formData.scheduledFor}T${formData.scheduledTime}`);
      
      const response = await apiClient.post('/content', {
        title: formData.title,
        content: formData.content,
        platforms: formData.platforms,
        scheduledFor: scheduledDateTime.toISOString(),
        timezone: formData.timezone,
        recurrence: formData.recurrence
      }, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      const createdCount = Array.isArray(response.data) ? response.data.length : 1;
      toast.success(`Content scheduled successfully! (${createdCount})`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error scheduling content:', error);
      toast.error('Failed to schedule content. Please try again.');
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
    const template = {
      id: Date.now(),
      name: templateName.trim(),
      title: formData.title,
      content: formData.content,
      platforms: formData.platforms
    };
    setTemplates(prev => [...prev, template]);
    setTemplateName('');
    toast.success('Template saved');
  };

  const handleApplyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      content: template.content,
      platforms: template.platforms
    }));
  };

  const platforms = [
    { id: 'twitch', name: 'Twitch', color: 'bg-purple-500' },
    { id: 'twitter', name: 'Twitter', color: 'bg-blue-400' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
    { id: 'discord', name: 'Discord', color: 'bg-indigo-500' }
  ];

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

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for better content</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use engaging titles that capture attention</li>
                <li>• Include relevant hashtags for better discoverability</li>
                <li>• Schedule during peak hours for maximum engagement</li>
                <li>• Cross-post across multiple platforms for wider reach</li>
              </ul>
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <input
                id="timezone"
                type="text"
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Set the timezone used for this schedule.</p>
            </div>

            {/* Recurrence */}
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Recurring schedule</h3>
                <input
                  type="checkbox"
                  checked={formData.recurrence.enabled}
                  onChange={(e) => handleInputChange('recurrence', {
                    ...formData.recurrence,
                    enabled: e.target.checked
                  })}
                />
              </div>
              {formData.recurrence.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Occurrences</label>
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
            <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Templates</h3>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Template
                </button>
              </div>
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500">No templates yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleApplyTemplate(template)}
                      className="px-3 py-1 border rounded-full text-sm hover:bg-gray-100"
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule; 
