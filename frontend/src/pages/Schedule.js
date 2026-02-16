import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Joyride, { STATUS } from 'react-joyride';
import toast from 'react-hot-toast';
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
  Lightbulb,
  Twitch,
  Twitter,
  Instagram,
  Server,
  Hash,
  ClipboardPaste,
  Plus,
  Trash2
} from 'lucide-react';
import { apiClient, getDiscordGuilds, getDiscordChannels, getDiscordInviteUrl, getEnabledPlatforms } from '../api';
import FileUpload from '../components/FileUpload';
import MediaGallery from '../components/MediaGallery';
import { useLanguage } from '../contexts/LanguageContext';
import { getPlatformColors } from '../utils/platformColors';
import { parsePastedPost } from '../utils/copyPastePost';
import { TWITTER_MAX_CHARS, DISCORD_ICON_URL } from '../constants/platforms';

const Schedule = ({ user, token }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'post',
    platforms: [],
    scheduledFor: '',
    scheduledTime: '',
    eventEndDate: '',
    eventEndTime: '',
    eventDates: [], // Array of { date: string, time: string, endDate?: string, endTime?: string } for events
    hashtags: '',
    mentions: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    mediaItems: [], // Array of { url, fileName?, type?, durationSeconds? }
    recurrence: {
      enabled: false,
      frequency: 'weekly',
      count: 1
    },
    discordGuildId: '',
    discordChannelId: ''
  });
  const [discordGuilds, setDiscordGuilds] = useState([]);
  const [discordChannels, setDiscordChannels] = useState([]);
  const [loadingDiscordGuilds, setLoadingDiscordGuilds] = useState(false);
  const [loadingDiscordChannels, setLoadingDiscordChannels] = useState(false);
  /** When true, last guilds load failed (e.g. Discord not connected). When false and guilds empty, bot not in any server. */
  const [discordGuildsError, setDiscordGuildsError] = useState(false);
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
  const [enabledPlatforms, setEnabledPlatforms] = useState([]);

  /** Ensure we never render an object as React child (API may return { field, message }). */
  const errStr = (v) => (typeof v === 'string' ? v : (v && typeof v.message === 'string' ? v.message : ''));

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
    
    // Load enabled platforms
    const loadEnabledPlatforms = async () => {
      try {
        const res = await getEnabledPlatforms();
        setEnabledPlatforms(res.data.platforms || []);
      } catch (err) {
        // Fallback to all platforms if error
        setEnabledPlatforms(['twitch', 'twitter', 'instagram', 'discord', 'youtube']);
      }
    };
    loadEnabledPlatforms();
  }, []);

  useEffect(() => {
    localStorage.setItem('contentTemplates', JSON.stringify(templates));
  }, [templates]);

  // Load Discord guilds when Discord platform is selected
  const hasDiscordSelected = Array.isArray(formData.platforms) && formData.platforms.includes('discord');
  useEffect(() => {
    if (!hasDiscordSelected) {
      setDiscordGuilds([]);
      setDiscordChannels([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingDiscordGuilds(true);
      setDiscordGuildsError(false);
      try {
        const data = await getDiscordGuilds();
        if (!cancelled) {
          setDiscordGuilds(data.guilds || []);
          setDiscordGuildsError(false);
        }
      } catch (err) {
        if (!cancelled) {
          const data = err.response?.data || {};
          const details = data.details || data.error || err.message;
          if (err.response?.status === 400) {
            toast.error(details || (t('schedule.discordConnectFirst') || 'Connect or reconnect Discord in Settings to list servers.'));
          } else {
            toast.error(details || 'Failed to load Discord servers');
          }
          setDiscordGuilds([]);
          setDiscordGuildsError(true);
        }
      } finally {
        if (!cancelled) setLoadingDiscordGuilds(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [hasDiscordSelected, t]);

  // Load Discord channels when guild is selected
  useEffect(() => {
    if (!formData.discordGuildId) {
      setDiscordChannels([]);
      return;
    }
    let cancelled = false;
    const guildId = formData.discordGuildId;
    setLoadingDiscordChannels(true);
    setDiscordChannels([]);
    getDiscordChannels(guildId)
      .then((data) => {
        if (!cancelled) setDiscordChannels(data.channels || []);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err.response?.data?.error || err.message || 'Failed to load channels');
          setDiscordChannels([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDiscordChannels(false);
      });
    return () => { cancelled = true; };
  }, [formData.discordGuildId]);

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
      newErrors.title = t('schedule.validationTitleRequired');
    } else if (formData.title.length < 3) {
      newErrors.title = t('schedule.validationTitleMin');
    }
    
    if (!formData.content.trim()) {
      newErrors.content = t('schedule.validationContentRequired');
    } else if (formData.content.length < 10) {
      newErrors.content = t('schedule.validationContentMin');
    }
    if (formData.platforms.includes('twitter') && formData.content.length > TWITTER_MAX_CHARS) {
      newErrors.content = t('schedule.validationTwitterMaxLength');
    }
    
    if (!formData.contentType) {
      newErrors.contentType = t('schedule.validationContentTypeRequired');
    }
    
    if (formData.platforms.length === 0) {
      newErrors.platforms = t('schedule.validationPlatformsRequired');
    }
    
    // Validate event dates for events
    if (formData.contentType === 'event') {
      if (formData.eventDates.length === 0) {
        newErrors.eventDates = t('schedule.validationEventDatesRequired') || 'At least one event date is required';
      } else {
        // Validate each event date
        formData.eventDates.forEach((eventDate, index) => {
          if (!eventDate.date?.trim()) {
            newErrors[`eventDate_${index}`] = t('schedule.validationDateRequired') || 'Date is required';
          }
          if (!eventDate.time?.trim()) {
            newErrors[`eventTime_${index}`] = t('schedule.validationTimeRequired') || 'Time is required';
          }
          // Validate end time is after start time if both are provided
          if (eventDate.endDate && eventDate.endTime && eventDate.date && eventDate.time) {
            const startDateTime = new Date(`${eventDate.date}T${eventDate.time}`);
            const endDateTime = new Date(`${eventDate.endDate}T${eventDate.endTime}`);
            if (endDateTime <= startDateTime) {
              newErrors[`eventEndTime_${index}`] = t('schedule.eventEndTimeAfterStart') || 'End time must be after start time';
            }
          }
        });
      }
    } else {
      // Date and time are optional for non-events: if omitted, content is scheduled for the next minute (confirmed in handleSubmit)
    }

    if (formData.platforms.includes('discord') && !formData.discordChannelId?.trim()) {
      newErrors.discordChannel = t('schedule.discordChannelRequired') || 'Select a Discord server and channel';
    }
    
    // For events and streams in Discord, guildId is required
    if ((formData.contentType === 'event' || formData.contentType === 'stream') && 
        formData.platforms.includes('discord') && 
        !formData.discordGuildId?.trim()) {
      newErrors.discordChannel = 'Discord server is required for events and streams';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error(t('schedule.fixErrors'));
      return;
    }

    let scheduledDateTime;
    const hasDate = !!formData.scheduledFor?.trim();
    const hasTime = !!formData.scheduledTime?.trim();
    if (hasDate && hasTime) {
      scheduledDateTime = new Date(`${formData.scheduledFor}T${formData.scheduledTime}`);
    } else {
      const nextMinute = new Date(Date.now() + 60 * 1000);
      const confirmed = window.confirm(t('schedule.confirmPublishNextMinute'));
      if (!confirmed) return;
      scheduledDateTime = nextMinute;
    }

    // Handle event end time for events
    let eventEndDateTime = null;
    if (formData.contentType === 'event') {
      const hasEndDate = !!formData.eventEndDate?.trim();
      const hasEndTime = !!formData.eventEndTime?.trim();
      if (hasEndDate && hasEndTime) {
        eventEndDateTime = new Date(`${formData.eventEndDate}T${formData.eventEndTime}`);
        // Validate end time is after start time
        if (eventEndDateTime <= scheduledDateTime) {
          toast.error(t('schedule.eventEndTimeAfterStart') || 'Event end time must be after start time');
          return;
        }
      }
    }

    setLoading(true);

    try {
      // For events with multiple dates, send all dates in a single payload
      // For other content types or single date events, use the standard flow
      let scheduledDateTime;
      const hasDate = !!formData.scheduledFor?.trim();
      const hasTime = !!formData.scheduledTime?.trim();
      
      if (formData.contentType === 'event' && formData.eventDates.length > 0) {
        // Use first event date as scheduledFor for the content
        const firstDate = formData.eventDates[0];
        scheduledDateTime = new Date(`${firstDate.date}T${firstDate.time}`);
      } else if (hasDate && hasTime) {
        scheduledDateTime = new Date(`${formData.scheduledFor}T${formData.scheduledTime}`);
      } else {
        const nextMinute = new Date(Date.now() + 60 * 1000);
        const confirmed = window.confirm(t('schedule.confirmPublishNextMinute'));
        if (!confirmed) {
          setLoading(false);
          return;
        }
        scheduledDateTime = nextMinute;
      }

      // Handle event end time for single date events
      let eventEndDateTime = null;
      if (formData.contentType === 'event' && formData.eventDates.length === 0) {
        const hasEndDate = !!formData.eventEndDate?.trim();
        const hasEndTime = !!formData.eventEndTime?.trim();
        if (hasEndDate && hasEndTime) {
          eventEndDateTime = new Date(`${formData.eventEndDate}T${formData.eventEndTime}`);
          // Validate end time is after start time
          if (eventEndDateTime <= scheduledDateTime) {
            toast.error(t('schedule.eventEndTimeAfterStart') || 'Event end time must be after start time');
            setLoading(false);
            return;
          }
        }
      }

      // ⏱️ IMPORTANT: Always send dates as ISO string (UTC) to backend
      // Backend stores in UTC, frontend displays in user's local timezone
      const payload = {
        title: formData.title,
        content: formData.content,
        contentType: formData.contentType,
        platforms: formData.platforms,
        scheduledFor: scheduledDateTime.toISOString(), // Convert to UTC ISO string
        timezone: formData.timezone,
        mediaItems: normalizeMediaItems(formData.mediaItems), // Include media with metadata
        recurrence: formData.recurrence
      };
      
      // Add hashtags and mentions if provided
      if (formData.hashtags?.trim()) {
        payload.hashtags = formData.hashtags.trim();
      }
      if (formData.mentions?.trim()) {
        payload.mentions = formData.mentions.trim();
      }
      
      // Add event end time if provided (for single date events)
      if (eventEndDateTime) {
        payload.eventEndTime = eventEndDateTime.toISOString();
      }
      
      // Add eventDates array if multiple dates provided
      if (formData.contentType === 'event' && formData.eventDates && formData.eventDates.length > 0) {
        // Validate and filter valid dates
        const validDates = formData.eventDates
          .filter(eventDate => {
            if (!eventDate || !eventDate.date || !eventDate.time) return false;
            try {
              const testDate = new Date(`${eventDate.date}T${eventDate.time}`);
              return !isNaN(testDate.getTime());
            } catch {
              return false;
            }
          })
          .map(eventDate => ({
            date: eventDate.date.trim(),
            time: eventDate.time.trim(),
            endDate: (eventDate.endDate && eventDate.endDate.trim()) || null,
            endTime: (eventDate.endTime && eventDate.endTime.trim()) || null
          }));
        
        if (validDates.length > 0) {
          payload.eventDates = validDates;
        }
      }
      
      if (formData.platforms.includes('discord') && formData.discordChannelId) {
        payload.discordGuildId = formData.discordGuildId || null;
        payload.discordChannelId = formData.discordChannelId;
      }

      const response = await apiClient.post('/content', payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
        timeout: 30000, // 30s - content creation can take time with recurrence
      }).catch((error) => {
        const data = error.response?.data;
        if (error.response?.status === 400 && data?.details) {
          const validationErrors = Array.isArray(data.details)
            ? data.details.map((e) => `${e.field}: ${e.message}`).join('\n')
            : String(data.details);
          toast.error(`Validation error:\n${validationErrors}`, { duration: 8000 });
        } else {
          toast.error(data?.error || error.message || t('schedule.scheduleError'));
        }
        throw error;
      });

      const createdCount = Array.isArray(response.data) ? response.data.length : 1;
      toast.success(t('schedule.scheduledSuccess', { count: createdCount }));
      
      // Suggest saving as template if form has meaningful content
      if (formData.title && formData.platforms.length > 0 && !templates.find(t => 
        t.title === formData.title && 
        JSON.stringify(t.platforms) === JSON.stringify(formData.platforms)
      )) {
        setTimeout(() => {
          toast((toastInstance) => (
            <div className="flex flex-col space-y-2">
              <p className="font-medium">💡 {t('schedule.saveTemplatePrompt')}</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setTemplateName(`${formData.title} Template`);
                    toast.dismiss(toastInstance.id);
                    setTimeout(() => {
                      handleSaveTemplate();
                    }, 100);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  {t('schedule.saveTemplateButton')}
                </button>
                <button
                  onClick={() => toast.dismiss(toastInstance.id)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  {t('schedule.maybeLater')}
                </button>
              </div>
            </div>
          ), { duration: 8000 });
        }, 1000);
      }
      
      navigate('/dashboard');
    } catch (error) {
      // Error handling is now done in the catch block above
      // This catch block handles other errors
      
      // Handle timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error(t('schedule.timeoutError') || 'La solicitud tardó demasiado. Por favor, intenta con menos ocurrencias de recurrencia o verifica tu conexión.');
      } else if (!error.response) {
        // Network error or other non-HTTP errors
        toast.error(error.message || t('schedule.networkError') || 'Error de conexión. Verifica tu internet e intenta de nuevo.');
      }
      // Validation errors are already handled in the catch block above
      
      // Handle network errors
      if (error.code === 'ERR_NETWORK' || !error.response) {
        toast.error(t('schedule.networkError') || 'Error de conexión. Verifica tu internet e intenta de nuevo.');
        return;
      }
      
      const data = error.response?.data;
      const details = data?.details;
      let errorMessage = data?.error || error.message || t('schedule.scheduleError');
      
      if (Array.isArray(details) && details.length > 0) {
        const messages = details.map((d) => (d && typeof d.message === 'string' ? d.message : (d?.field ? `${d.field}: invalid` : '')).trim()).filter(Boolean);
        if (messages.length > 0) errorMessage = messages.join('. ');
        const errs = {};
        details.forEach((d) => {
          if (d && d.field && typeof d.message === 'string') errs[d.field] = d.message;
        });
        if (Object.keys(errs).length > 0) setErrors((prev) => ({ ...prev, ...errs }));
      } else if (details && typeof details === 'string') {
        errorMessage = details;
      }
      
      // Handle specific HTTP status codes
      if (error.response?.status === 400) {
        errorMessage = errorMessage || t('schedule.validationError') || 'Datos inválidos. Por favor, revisa el formulario.';
      } else if (error.response?.status === 401) {
        errorMessage = t('schedule.authError') || 'Sesión expirada. Por favor, inicia sesión de nuevo.';
      } else if (error.response?.status === 403) {
        const data = error.response?.data;
        errorMessage = data?.message || data?.error || t('schedule.licenseRequired') || 'Necesitas una licencia válida para programar contenido. Ve a Configuración para activar un trial o comprar una licencia.';
        // Always show license/settings hint for 403 when scheduling (backend may send code or just error)
        const isLicenseError = !data?.code || data?.code === 'LICENSE_EXPIRED' || data?.code === 'LICENSE_INVALID' || (data?.error && /license|licencia/i.test(String(data.error)));
        if (isLicenseError) {
          toast.error(
            (toastId) => (
              <div className="flex flex-col gap-2">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/settings');
                    toast.dismiss(toastId);
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  {t('schedule.goToSettings') || 'Ir a Configuración'}
                </button>
              </div>
            ),
            { duration: 10000 }
          );
          return;
        }
      } else if (error.response?.status === 429) {
        errorMessage = t('schedule.rateLimitError') || 'Demasiadas solicitudes. Por favor, espera un momento.';
      }
      
      toast.error(typeof errorMessage === 'string' ? errorMessage : t('schedule.scheduleError'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // When contentType changes to 'event', initialize eventDates if empty
      // Also initialize with scheduledFor/scheduledTime if they exist
      if (field === 'contentType' && value === 'event' && prev.eventDates.length === 0) {
        newData.eventDates = [{ 
          date: prev.scheduledFor || '', 
          time: prev.scheduledTime || '', 
          endDate: prev.eventEndDate || '', 
          endTime: prev.eventEndTime || '' 
        }];
      }
      
      // When contentType changes away from 'event', clear eventDates
      if (field === 'contentType' && value !== 'event') {
        newData.eventDates = [];
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePlatformToggle = (platform) => {
    setFormData(prev => {
      const nextPlatforms = prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform];
      const next = { ...prev, platforms: nextPlatforms };
      if (platform === 'discord' && !nextPlatforms.includes('discord')) {
        next.discordGuildId = '';
        next.discordChannelId = '';
      }
      return next;
    });
    if (errors.platforms) setErrors(prev => ({ ...prev, platforms: '' }));
    if (errors.discordChannel) setErrors(prev => ({ ...prev, discordChannel: '' }));
  };

  const handlePastePost = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parsePastedPost(text);
      if (parsed) {
        setFormData((prev) => ({
          ...prev,
          title: parsed.title,
          content: parsed.content,
          platforms: parsed.platforms,
          contentType: parsed.contentType,
        }));
        toast.success(t('schedule.postPasted') || 'Post pasted.');
      } else {
        toast.error(t('schedule.noCopiedPost') || 'No copied post found. Copy a post from the Dashboard first.');
      }
    } catch (err) {
      toast.error(t('schedule.pasteFailed') || 'Could not read clipboard. Check permissions.');
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error(t('schedule.templateNameRequired'));
      return;
    }
    
    // Check if template with same name already exists
    if (templates.find(tmpl => tmpl.name.toLowerCase() === templateName.trim().toLowerCase())) {
      toast.error(t('schedule.templateExists'));
      return;
    }
    
    const template = {
      id: Date.now(),
      name: templateName.trim(),
      title: formData.title,
      content: formData.content,
      platforms: formData.platforms,
      contentType: formData.contentType,
      scheduledFor: formData.scheduledFor,
      scheduledTime: formData.scheduledTime,
      eventEndDate: formData.eventEndDate,
      eventEndTime: formData.eventEndTime,
      eventDates: formData.eventDates.length > 0 ? formData.eventDates : null,
      hashtags: formData.hashtags || '',
      mentions: formData.mentions || '',
      mediaItems: formData.mediaItems.length > 0 ? formData.mediaItems : null,
      recurrence: formData.recurrence,
      timezone: formData.timezone,
      discordGuildId: formData.discordGuildId || null,
      discordChannelId: formData.discordChannelId || null
    };
    setTemplates(prev => [...prev, template]);
    setTemplateName('');
    toast.success(t('schedule.templateSaved', { name: template.name }));
  };

  const handleApplyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      title: template.title || '',
      content: template.content || '',
      platforms: template.platforms || [],
      contentType: template.contentType || prev.contentType,
      scheduledFor: template.scheduledFor || prev.scheduledFor,
      scheduledTime: template.scheduledTime || prev.scheduledTime,
      eventEndDate: template.eventEndDate || prev.eventEndDate,
      eventEndTime: template.eventEndTime || prev.eventEndTime,
      eventDates: template.eventDates || prev.eventDates,
      hashtags: template.hashtags || prev.hashtags,
      mentions: template.mentions || prev.mentions,
      mediaItems: template.mediaItems || prev.mediaItems,
      recurrence: template.recurrence || prev.recurrence,
      timezone: template.timezone || prev.timezone,
      discordGuildId: template.discordGuildId || prev.discordGuildId,
      discordChannelId: template.discordChannelId || prev.discordChannelId
    }));
    toast.success(t('schedule.templateApplied', { name: template.name }));
  };

  const normalizeMediaItems = (items) => {
    if (!items || !items.length) return [];
    return items.map((item) => {
      if (typeof item === 'string') return { url: item };
      return {
        url: item.url,
        ...(item.fileName && { fileName: item.fileName }),
        ...(item.type && { type: item.type }),
        ...(item.durationSeconds !== undefined && { durationSeconds: item.durationSeconds }),
        ...(item.file_path && { file_path: item.file_path })
      };
    });
  };

  const handleMediaSelect = (url, bucket, extra = {}) => {
    setFormData(prev => {
      const items = prev.mediaItems || [];
      const exists = items.some((item) => (typeof item === 'string' ? item : item.url) === url);
      if (exists) {
        return {
          ...prev,
          mediaItems: items.filter((item) => (typeof item === 'string' ? item : item.url) !== url)
        };
      }
      return {
        ...prev,
        mediaItems: [...items, { url, type: bucket === 'videos' ? 'video' : 'image', ...(extra?.file_path && { file_path: extra.file_path }), ...(extra?.fileName && { fileName: extra.fileName }) }]
      };
    });
  };

  const handleUploadComplete = (url, bucket, meta) => {
    const item = {
      url,
      type: meta?.type || (bucket === 'videos' ? 'video' : 'image'),
      ...(meta?.fileName && { fileName: meta.fileName }),
      ...(meta?.durationSeconds !== undefined && { durationSeconds: meta.durationSeconds }),
      ...(meta?.file_path && { file_path: meta.file_path })
    };
    setFormData(prev => ({
      ...prev,
      mediaItems: [...(prev.mediaItems || []), item]
    }));
    toast.success(t('schedule.fileAdded'));
  };

  const getPlatformIcon = (platformId, discordSelected = false) => {
    switch (platformId) {
      case 'twitch': return <Twitch className="w-6 h-6" />;
      case 'twitter': return <Twitter className="w-6 h-6" />;
      case 'instagram': return <Instagram className="w-6 h-6" />;
      case 'discord':
        return (
          <img
            src={DISCORD_ICON_URL}
            alt="Discord"
            className={`w-6 h-6 object-contain ${discordSelected ? 'invert' : ''}`}
          />
        );
      case 'youtube': return <Video className="w-6 h-6" />;
      default: return <Share2 className="w-6 h-6" />;
    }
  };

  const platformColorsMap = getPlatformColors();
  
  // Platform labels mapping
  const platformLabels = {
    twitch: 'Twitch',
    twitter: 'Twitter',
    instagram: 'Instagram',
    discord: 'Discord',
    youtube: 'YouTube'
  };
  
  // Filter platforms to only show enabled ones
  const platforms = enabledPlatforms.length > 0
    ? enabledPlatforms.map(id => ({ id, name: platformLabels[id] || id.charAt(0).toUpperCase() + id.slice(1) }))
    : [
        { id: 'twitch', name: 'Twitch' },
        { id: 'twitter', name: 'Twitter' },
        { id: 'instagram', name: 'Instagram' },
        { id: 'discord', name: 'Discord' },
        { id: 'youtube', name: 'YouTube' }
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
      return `💡 ${t('schedule.tipTitleShort')}`;
    }
    if (!formData.content.includes('#') && !formData.content.match(/#\w+/g)) {
      return `💡 ${t('schedule.tipHashtags')}`;
    }
    if (formData.platforms.length === 0) {
      return `💡 ${t('schedule.tipPlatforms')}`;
    }
    if (formData.platforms.length === 1) {
      return `💡 ${t('schedule.tipCrossPost')}`;
    }
    // Check if scheduled time is outside typical peak hours (19-22h local)
    if (formData.scheduledTime) {
      const hour = parseInt(formData.scheduledTime.split(':')[0]);
      if (hour < 19 || hour > 22) {
        return `💡 ${t('schedule.tipPeakHours')}`;
      }
    }
    return `💡 ${t('schedule.tipConsistent')}`;
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
      
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
      {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('schedule.scheduleTitle')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2">{t('schedule.scheduleSubtitle')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/templates')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('schedule.createFromTemplate') || 'Create from template'}
            </button>
            <span className="text-gray-400">·</span>
            <button
              type="button"
              onClick={handlePastePost}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ClipboardPaste className="w-4 h-4" />
              {t('schedule.pastePost') || 'Paste post'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="title-input">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {formData.contentType === 'event' 
                  ? (formData.platforms.includes('discord') ? t('schedule.eventName') : t('schedule.contentTitle'))
                  : t('schedule.contentTitle')} <span className="text-red-500">*</span>
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
                  placeholder={formData.contentType === 'event' 
                    ? (formData.platforms.includes('discord') ? t('schedule.eventNamePlaceholder') : t('schedule.contentPlaceholder'))
                    : t('schedule.contentPlaceholder')}
                />
                {errors.title && (
                  <div className="absolute right-3 top-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errStr(errors.title)}</p>
              )}
                  </div>
                  
            {/* Content */}
            <div className="content-textarea">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {formData.contentType === 'event' 
                  ? (formData.platforms.includes('discord') ? t('schedule.eventDescription') : t('schedule.contentLabel'))
                  : t('schedule.contentLabel')} <span className="text-red-500">*</span>
                    </label>
              <div className="relative">
                    <textarea
                  id="content"
                  rows={formData.contentType === 'event' ? 4 : 6}
                  maxLength={formData.platforms.includes('twitter') ? TWITTER_MAX_CHARS : undefined}
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    errors.content ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={formData.contentType === 'event' && formData.platforms.includes('discord')
                    ? t('schedule.eventDescriptionPlaceholder')
                    : t('schedule.contentPlaceholderText')}
                />
                {errors.content && (
                  <div className="absolute right-3 top-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
                    </div>
              <div className="flex justify-between items-center mt-1">
                {errors.content && (
                  <p className="text-sm text-red-600">{errStr(errors.content)}</p>
                )}
                <p className={`text-sm ml-auto ${formData.platforms.includes('twitter') && formData.content.length > TWITTER_MAX_CHARS ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                  {formData.content.length}/{formData.platforms.includes('twitter') ? TWITTER_MAX_CHARS : 500} {t('schedule.characters')}
                  {formData.platforms.includes('twitter') && formData.platforms.length > 1 && (
                    <span className="text-gray-400 dark:text-gray-500 font-normal"> (max {TWITTER_MAX_CHARS} for X)</span>
                  )}
                </p>
              </div>
              {/* Format preview for all content types */}
              {formData.title && formData.contentType && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('schedule.formatPreviewByPlatform')}</p>
                  <div className="space-y-2 text-sm">
                    {formData.platforms.includes('twitter') && (
                      <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Twitter:</span>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                          {formData.contentType === 'stream' && '🔴 '}
                          {formData.contentType === 'event' && '📅 '}
                          {formData.contentType === 'reel' && '🎬 '}
                          {formData.contentType === 'post' && '📝 '}
                          {formData.title}
                          {formData.content && (
                            <>
                              <br /><br />
                              {formData.content}
                            </>
                          )}
                        </p>
                      </div>
                    )}
                    {formData.platforms.includes('discord') && (
                      <div className="p-2 bg-gray-900 text-white rounded border border-gray-700">
                        <span className="text-xs font-medium text-gray-400">Discord:</span>
                        <p className="mt-1">
                          {formData.contentType === 'stream' && '🔴 '}
                          {formData.contentType === 'event' && '📅 '}
                          {formData.contentType === 'reel' && '🎬 '}
                          <strong>{formData.title}</strong>
                          {formData.content && (
                            <>
                              <br /><br />
                              {formData.content}
                            </>
                          )}
                        </p>
                        {(formData.contentType === 'event' || formData.contentType === 'stream') && (
                          <p className="text-xs text-gray-400 mt-1">+ Scheduled Event will be created</p>
                        )}
                      </div>
                    )}
                    {formData.platforms.includes('instagram') && (
                      <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Instagram:</span>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                          {formData.contentType === 'stream' && '🔴 '}
                          {formData.contentType === 'event' && '📅 '}
                          {formData.contentType === 'reel' && '🎬 '}
                          {formData.title}
                          {formData.content && (
                            <>
                              <br />
                              {formData.content}
                            </>
                          )}
                        </p>
                      </div>
                    )}
                    {formData.platforms.includes('twitch') && (
                      <div className="p-2 bg-purple-900 text-white rounded border border-purple-700">
                        <span className="text-xs font-medium text-purple-300">Twitch:</span>
                        <p className="mt-1">
                          {formData.contentType === 'stream' && '🔴 LIVE: '}
                          {formData.contentType === 'event' && '📅 '}
                          {formData.contentType === 'reel' && '🎬 '}
                          {formData.title}
                          {formData.content && (
                            <>
                              <br /><br />
                              {formData.content}
                            </>
                          )}
                        </p>
                      </div>
                    )}
                    {formData.platforms.includes('youtube') && (
                      <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">YouTube:</span>
                        <p className="mt-1">
                          <strong className="text-gray-900 dark:text-gray-100">
                            {formData.contentType === 'stream' && '🔴 LIVE: '}
                            {formData.contentType === 'event' && '📅 '}
                            {formData.contentType === 'reel' && '🎬 '}
                            {formData.title}
                          </strong>
                          {formData.content && (
                            <>
                              <br />
                              <span className="text-sm text-gray-600 dark:text-gray-400">{formData.content}</span>
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
                  </div>

            {/* Media Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4" />
                    <span>{t('schedule.mediaFiles')}</span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setShowMediaSection(!showMediaSection)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showMediaSection ? t('schedule.hide') : t('schedule.show')}
                </button>
              </div>

              {showMediaSection && (
                <div className="space-y-4">
                  {/* File Upload */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {t('schedule.uploadNewFile')}
                    </h4>
                    <FileUpload 
                      user={user} 
                      onUploadComplete={handleUploadComplete}
                    />
                  </div>

                  {/* Media Gallery */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t('schedule.availableFiles')}
                    </h4>
                    <MediaGallery 
                      user={user}
                      onSelect={handleMediaSelect}
                      selectedUrls={(formData.mediaItems || []).map((m) => (typeof m === 'string' ? m : m.url))}
                    />
                  </div>

                  {/* Selected Media Preview */}
                  {formData.mediaItems && formData.mediaItems.length > 0 && (
                    <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                        {t('schedule.selectedMedia')} ({formData.mediaItems.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.mediaItems.map((item, index) => {
                          const url = typeof item === 'string' ? item : item.url;
                          const isVideo = typeof item === 'object' && item.type === 'video';
                          return (
                          <div
                            key={index}
                            className="relative group"
                          >
                            <div className="w-16 h-16 rounded border-2 border-blue-500 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                              {!isVideo && (url.includes('images') || (typeof item === 'object' && item.type === 'image')) ? (
                                <img 
                                  src={url} 
                                  alt={typeof item === 'object' && item.fileName ? item.fileName : `Media ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Video className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleMediaSelect(url, isVideo || url.includes('videos') ? 'videos' : 'images')}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content Type */}
            <div>
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                <option value="post">📝 Post</option>
                <option value="stream">🔴 Stream</option>
                <option value="event">📅 Event</option>
                <option value="reel">🎬 Reel</option>
              </select>
              {errors.contentType && (
                <p className="mt-1 text-sm text-red-600">{errStr(errors.contentType)}</p>
              )}
              {/* Info message for Event type */}
              {formData.contentType === 'event' && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>📅 {t('schedule.event')}:</strong> {formData.platforms.includes('discord') 
                      ? t('schedule.eventInfoDiscord')
                      : t('schedule.eventInfoDiscordGeneral')}
                  </p>
                </div>
              )}
              {/* Info message for Stream type */}
              {formData.contentType === 'stream' && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>🔴 {t('schedule.stream')}:</strong> {formData.platforms.includes('discord') 
                      ? t('schedule.streamInfoDiscord')
                      : t('schedule.streamInfoDiscordGeneral')}
                  </p>
                </div>
              )}
              {/* Info message for Reel type */}
              {formData.contentType === 'reel' && (
                <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    <strong>🎬 Reel:</strong> Formato optimizado para contenido de video corto. Asegúrate de incluir un archivo de video.
                  </p>
                </div>
              )}
            </div>
                  
            {/* Platforms */}
            <div className="platforms-section">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                Platforms <span className="text-red-500">*</span>
                      </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {platforms.map((platform) => {
                  const isSelected = formData.platforms.includes(platform.id);
                  const bgColor = platformColorsMap[platform.id] || platformColorsMap.twitch;
                  return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
                      isSelected
                        ? 'border-transparent text-white shadow-lg transform scale-105'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    style={isSelected ? { backgroundColor: bgColor } : undefined}
                  >
                    {getPlatformIcon(platform.id, isSelected)}
                    <span className="text-sm font-medium">{platform.name}</span>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </button>
                  );
                })}
              </div>
              {errors.platforms && (
                <p className="mt-1 text-sm text-red-600">{errStr(errors.platforms)}</p>
              )}
              {formData.platforms.includes('discord') && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  {/* Event-specific info for Discord */}
                  {(formData.contentType === 'event' || formData.contentType === 'stream') && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                        📅 {formData.contentType === 'event' ? t('schedule.discordEventTitle') : `🔴 ${t('schedule.discordStreamEventTitle')}`}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {formData.contentType === 'event' 
                          ? t('schedule.discordEventDescription')
                          : t('schedule.discordStreamEventDescription')}
                      </p>
                    </div>
                  )}
                  {!loadingDiscordGuilds && discordGuilds.length === 0 && !discordGuildsError && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">{t('discord.addBotTitle')}</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">{t('discord.addBotText')}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { inviteUrl } = await getDiscordInviteUrl();
                            if (inviteUrl) window.open(inviteUrl, '_blank', 'noopener,noreferrer');
                            else toast.error(t('discord.errorLoadingGuilds'));
                          } catch (e) {
                            toast.error(e.response?.data?.error || e.message || t('discord.errorLoadingGuilds'));
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-[#5865F2] text-white text-sm rounded-lg hover:bg-[#4752C4] transition"
                      >
                        <Server className="w-4 h-4" />
                        {t('discord.addBotButton')}
                      </button>
                    </div>
                  )}
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Server className="w-4 h-4 inline mr-1" />
                    {t('schedule.discordServer') || 'Discord server'} {(formData.contentType === 'event' || formData.contentType === 'stream') && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.discordGuildId}
                    onChange={(e) => setFormData(prev => ({ ...prev, discordGuildId: e.target.value, discordChannelId: '' }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 mb-4"
                  >
                    <option value="">{loadingDiscordGuilds ? (t('common.loading') || 'Loading...') : (t('schedule.discordChooseServer') || 'Choose server')}</option>
                    {discordGuilds.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Hash className="w-4 h-4 inline mr-1" />
                    {t('schedule.discordChannel') || 'Discord channel'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.discordChannelId}
                    onChange={(e) => setFormData(prev => ({ ...prev, discordChannelId: e.target.value }))}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 ${errors.discordChannel ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    disabled={!formData.discordGuildId || loadingDiscordChannels}
                  >
                    <option value="">{loadingDiscordChannels ? (t('common.loading') || 'Loading...') : (t('schedule.discordChooseChannel') || 'Choose channel')}</option>
                    {discordChannels.filter((c) => c.type === 0).map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                  {errors.discordChannel && (
                    <p className="mt-1 text-sm text-red-600">{errStr(errors.discordChannel)}</p>
                  )}
                </div>
              )}
                    </div>
                    
            {/* Date and Time */}
            {formData.contentType === 'event' ? (
              // Multiple dates interface for events
              <div className="datetime-section space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                  {t('schedule.timezoneHint')} {formData.timezone && (
                    <span className="font-medium">{formData.timezone.replace(/_/g, ' ')}</span>
                  )}
                </p>
                
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('schedule.eventDates') || 'Event Dates & Times'} <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        eventDates: [...prev.eventDates, { date: '', time: '', endDate: '', endTime: '' }]
                      }));
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t('schedule.addEventDate') || 'Add Date'}
                  </button>
                </div>

                {/* Show date/time fields when eventDates is empty - auto-initialize on input */}
                {formData.eventDates.length === 0 ? (
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-4">
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('schedule.eventDate') || 'Event'} #1
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('schedule.date')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.scheduledFor || ''}
                            onChange={(e) => {
                              const dateValue = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                scheduledFor: dateValue,
                                eventDates: [{ date: dateValue, time: prev.scheduledTime || '', endDate: '', endTime: '' }]
                              }));
                            }}
                            className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                          />
                          <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('schedule.time')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            value={formData.scheduledTime || ''}
                            onChange={(e) => {
                              const timeValue = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                scheduledTime: timeValue,
                                eventDates: [{ date: prev.scheduledFor || '', time: timeValue, endDate: '', endTime: '' }]
                              }));
                            }}
                            className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                          />
                          <Clock className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {formData.eventDates.map((eventDate, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('schedule.eventDate') || 'Event'} #{index + 1}
                      </span>
                      {formData.eventDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              eventDates: prev.eventDates.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('schedule.date')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={eventDate.date}
                            onChange={(e) => {
                              const newDates = [...formData.eventDates];
                              newDates[index].date = e.target.value;
                              setFormData(prev => ({ ...prev, eventDates: newDates }));
                            }}
                            className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                          />
                          <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('schedule.time')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            value={eventDate.time}
                            onChange={(e) => {
                              const newDates = [...formData.eventDates];
                              newDates[index].time = e.target.value;
                              setFormData(prev => ({ ...prev, eventDates: newDates }));
                            }}
                            className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                          />
                          <Clock className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('schedule.eventEndDate')} <span className="text-gray-400 text-xs">({t('schedule.optional')})</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={eventDate.endDate || ''}
                            onChange={(e) => {
                              const newDates = [...formData.eventDates];
                              newDates[index].endDate = e.target.value;
                              setFormData(prev => ({ ...prev, eventDates: newDates }));
                            }}
                            min={eventDate.date || undefined}
                            className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                          />
                          <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('schedule.eventEndTime')} <span className="text-gray-400 text-xs">({t('schedule.optional')})</span>
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            value={eventDate.endTime || ''}
                            onChange={(e) => {
                              const newDates = [...formData.eventDates];
                              newDates[index].endTime = e.target.value;
                              setFormData(prev => ({ ...prev, eventDates: newDates }));
                            }}
                            disabled={!eventDate.endDate}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 ${
                              !eventDate.endDate ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          />
                          <Clock className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    
                    {formData.platforms.includes('discord') && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('schedule.eventEndTimeHint')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Single date/time interface for non-events
              <div className="datetime-section grid grid-cols-1 md:grid-cols-2 gap-6">
                <p className="col-span-full text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                  {t('schedule.timezoneHint')} {formData.timezone && (
                    <span className="font-medium">{formData.timezone.replace(/_/g, ' ')}</span>
                  )}
                </p>
                <div>
                  <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('schedule.date')} <span className="text-red-500">*</span>
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
                    />
                    <Calendar className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                  </div>
                  {errors.scheduledFor && (
                    <p className="mt-1 text-sm text-red-600">{errStr(errors.scheduledFor)}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('schedule.time')} <span className="text-red-500">*</span>
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
                    <p className="mt-1 text-sm text-red-600">{errStr(errors.scheduledTime)}</p>
                  )}
                </div>
              </div>
            )}

              {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 w-full sm:w-auto"
                >
                <X className="w-4 h-4 flex-shrink-0" />
                <span>{t('schedule.cancel')}</span>
                </button>
                <button
                  type="submit"
                disabled={loading}
                className="submit-button px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto min-h-[44px]"
                >
                  {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    <span>{t('schedule.scheduling')}</span>
                  </>
                  ) : (
                    <>
                    <Save className="w-4 h-4 flex-shrink-0" />
                    <span>{t('schedule.scheduleContent')}</span>
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
              {t('schedule.timezone')}
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
              {t('schedule.timezoneDescription')}
            </p>
          </div>

          {/* Recurring Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('schedule.recurringSchedule')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('schedule.recurringDescription')}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('schedule.frequency')}</label>
                  <select
                    value={formData.recurrence.frequency}
                    onChange={(e) => handleInputChange('recurrence', {
                      ...formData.recurrence,
                      frequency: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                  >
                    <option value="daily">{t('schedule.daily')}</option>
                    <option value="weekly">{t('schedule.weekly')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('schedule.occurrences')}</label>
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
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{t('schedule.templates')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('schedule.templatesDescription')}
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 mb-3">
              <input
                type="text"
                placeholder={t('schedule.templateName')}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-700"
              />
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('schedule.saveTemplate')}
              </button>
            </div>
            {templates.length === 0 ? (
              <div className="text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('schedule.noTemplates')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('schedule.noTemplatesHelp')}
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
                  {t('schedule.professionalTip')}
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
