/**
 * Content Templates - list, create, edit, delete, create content from template
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, createContentFromTemplate } from '../api-templates';
import { getEnabledPlatforms } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { FileText, Plus, Pencil, Trash2, Calendar, X } from 'lucide-react';
import { getPlatformColor } from '../utils/platformColors';

const CONTENT_TYPES = [
  { id: 'post', name: 'Post' },
  { id: 'stream', name: 'Stream' },
  { id: 'event', name: 'Event' },
  { id: 'reel', name: 'Reel' },
];

const ALL_PLATFORM_IDS = ['twitch', 'twitter', 'instagram', 'discord', 'youtube'];

const LOCAL_TEMPLATES_KEY = 'contentTemplates';

/** Read templates saved from Schedule (New post) - stored in localStorage */
function getLocalTemplates() {
  try {
    const stored = localStorage.getItem(LOCAL_TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

/** Persist local templates after removing one */
function removeLocalTemplateById(id) {
  try {
    const list = getLocalTemplates();
    const next = list.filter((t) => String(t.id) !== String(id));
    localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    return getLocalTemplates();
  }
}

export default function Templates({ user, token }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [useTemplateId, setUseTemplateId] = useState(null);
  const [useTemplateSource, setUseTemplateSource] = useState(null); // 'api' | 'local'
  const [useDate, setUseDate] = useState('');
  const [useTime, setUseTime] = useState('12:00');
  const [enabledPlatforms, setEnabledPlatforms] = useState(ALL_PLATFORM_IDS);
  const [form, setForm] = useState({
    name: '',
    title: '',
    content: '',
    contentType: 'post',
    platforms: [],
    hashtags: '',
    mentions: '',
    isPublic: false,
  });

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const apiList = await getTemplates().catch(() => []);
      const apiTemplates = Array.isArray(apiList) ? apiList : [];
      const localTemplates = getLocalTemplates();
      const fromApi = apiTemplates.map((t) => ({ ...t, _source: 'api' }));
      const fromLocal = localTemplates.map((t) => ({ ...t, _source: 'local' }));
      setTemplates([...fromApi, ...fromLocal]);
    } catch (err) {
      toast.error(err.response?.data?.error || t('templates.errorLoad') || 'Failed to load templates');
      const localOnly = getLocalTemplates().map((t) => ({ ...t, _source: 'local' }));
      setTemplates(localOnly);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTemplates();

    const loadEnabledPlatforms = async () => {
      try {
        const res = await getEnabledPlatforms();
        setEnabledPlatforms(res.data.platforms || ALL_PLATFORM_IDS);
      } catch (err) {
        setEnabledPlatforms(ALL_PLATFORM_IDS);
      }
    };
    loadEnabledPlatforms();
  }, [loadTemplates]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error(t('templates.nameAndContentRequired') || 'Name and content are required');
      return;
    }
    if (form.platforms.length === 0) {
      toast.error(t('templates.selectPlatform') || 'Select at least one platform');
      return;
    }
    try {
      if (editingId) {
        await updateTemplate(editingId, form);
        toast.success(t('templates.updated') || 'Template updated');
      } else {
        await createTemplate(form);
        toast.success(t('templates.created') || 'Template created');
      }
      setEditingId(null);
      setForm({ name: '', title: '', content: '', contentType: 'post', platforms: [], hashtags: '', mentions: '', isPublic: false });
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.details || err.response?.data?.error || 'Failed to save template');
    }
  }, [editingId, form, loadTemplates, t]);

  const handleDelete = useCallback(async (template) => {
    if (!window.confirm(t('templates.confirmDelete') || 'Delete this template?')) return;
    if (template._source === 'local') {
      removeLocalTemplateById(template.id);
      setTemplates((prev) => prev.filter((x) => !(x._source === 'local' && x.id === template.id)));
      toast.success(t('templates.deleted') || 'Template deleted');
      setEditingId(prev => prev === template.id ? null : prev);
      return;
    }
    try {
      await deleteTemplate(template.id);
      toast.success(t('templates.deleted') || 'Template deleted');
      setEditingId(prev => prev === template.id ? null : prev);
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  }, [t, loadTemplates]);

  const handleUseTemplate = useCallback(async () => {
    if (!useTemplateId || !useDate) {
      toast.error(t('templates.selectDate') || 'Select a date');
      return;
    }
    const scheduledFor = new Date(`${useDate}T${useTime}:00`);
    if (isNaN(scheduledFor.getTime())) {
      toast.error(t('templates.invalidDateTime') || 'Invalid date or time');
      return;
    }
    try {
      await createContentFromTemplate(useTemplateId, scheduledFor.toISOString(), {});
      toast.success(t('templates.contentCreated') || 'Content created from template');
      setUseTemplateId(null);
      setUseTemplateSource(null);
      setUseDate('');
      setUseTime('12:00');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create content');
    }
  }, [useTemplateId, useDate, useTime, t, navigate]);

  const startEdit = useCallback((template) => {
    if (template._source === 'local') {
      navigate('/schedule', { state: { applyTemplate: template } });
      toast.success(t('templates.editInSchedule') || 'Opening Schedule to edit this template');
      return;
    }
    setEditingId(template.id);
    setForm({
      name: template.name || '',
      title: template.title || '',
      content: template.content || '',
      contentType: template.contentType || 'post',
      platforms: Array.isArray(template.platforms) ? [...template.platforms] : [],
      hashtags: template.hashtags || '',
      mentions: template.mentions || '',
      isPublic: !!template.isPublic,
    });
  }, [navigate, t]);

  const togglePlatform = useCallback((id) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter((p) => p !== id)
        : [...prev.platforms, id],
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="w-7 h-7" />
            {t('templates.title') || 'Content templates'}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/schedule')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {t('common.back')} → Schedule
            </button>
          </div>
        </div>

        {/* Create / Edit form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingId ? (t('templates.edit') || 'Edit template') : (t('templates.create') || 'New template')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('templates.name') || 'Name'}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="e.g. Stream announcement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('templates.title') || 'Title (optional)'}</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('templates.content') || 'Content'}</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Use {{variable}} for placeholders"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('templates.contentType') || 'Content type'}</label>
              <select
                value={form.contentType}
                onChange={(e) => setForm((p) => ({ ...p, contentType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.id} value={ct.id}>{ct.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('schedule.platforms') || 'Platforms'}</label>
              <div className="flex flex-wrap gap-2">
                {enabledPlatforms.map((id) => {
                  const selected = form.platforms.includes(id);
                  return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => togglePlatform(id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${selected ? 'text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    style={selected ? { backgroundColor: getPlatformColor(id) } : undefined}
                  >
                    {id}
                  </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editingId ? t('common.update') : t('common.create')}
              </button>
              {editingId && (
                <button onClick={() => { setEditingId(null); setForm({ name: '', title: '', content: '', contentType: 'post', platforms: [], hashtags: '', mentions: '', isPublic: false }); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('templates.list') || 'Your templates'}</h2>
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          ) : templates.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">{t('templates.noTemplates') || 'No templates yet. Create one above.'}</p>
          ) : (
            <ul className="space-y-3">
              {templates.map((template) => (
                <li key={template._source === 'local' ? `local-${template.id}` : template.id} className="flex flex-wrap items-center justify-between gap-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{template.name}</p>
                      {template._source === 'local' && (
                        <span className="px-2 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                          {t('templates.local') || 'Local'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{template.content?.slice(0, 80)}{(template.content?.length || 0) > 80 ? '...' : ''}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Array.isArray(template.platforms) && template.platforms.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded text-xs text-white capitalize" style={{ backgroundColor: getPlatformColor(p) }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (template._source === 'local') {
                          navigate('/schedule', { state: { applyTemplate: template } });
                          toast.success(t('templates.useInSchedule') || 'Opening Schedule');
                        } else {
                          setUseTemplateId(template.id);
                          setUseTemplateSource('api');
                        }
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      title={template._source === 'local' ? (t('templates.useInSchedule') || 'Use in Schedule') : (t('templates.useTemplate') || 'Create content from template')}
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                    <button onClick={() => startEdit(template)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(template)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal: Use template (pick date) */}
      {useTemplateId && useTemplateSource === 'api' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('templates.createContentFrom') || 'Create content from template'}</h3>
              <button onClick={() => { setUseTemplateId(null); setUseTemplateSource(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('schedule.date')}</label>
                <input type="date" value={useDate} onChange={(e) => setUseDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('schedule.time')}</label>
                <input type="time" value={useTime} onChange={(e) => setUseTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleUseTemplate} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('templates.createContent') || 'Create content'}
                </button>
                <button onClick={() => { setUseTemplateId(null); setUseTemplateSource(null); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg">{t('common.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
