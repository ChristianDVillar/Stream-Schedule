import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDiscordGuilds, getDiscordChannels, postDiscordMessage } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { MessageCircle, Server, Hash, Send, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;

export default function PublishDiscord({ user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedGuildId, setSelectedGuildId] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [content, setContent] = useState('');
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [sending, setSending] = useState(false);
  const [connectDiscordFirst, setConnectDiscordFirst] = useState(false);

  useEffect(() => {
    loadGuilds();
  }, []);

  useEffect(() => {
    if (!selectedGuildId) {
      setChannels([]);
      setSelectedChannelId('');
      return;
    }
    loadChannels(selectedGuildId);
  }, [selectedGuildId]);

  const loadGuilds = async () => {
    setLoadingGuilds(true);
    setConnectDiscordFirst(false);
    try {
      const data = await getDiscordGuilds();
      setGuilds(data.guilds || []);
      setSelectedGuildId('');
      setSelectedChannelId('');
      setChannels([]);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data || {};
      const details = data.details || data.error || err.message;
      if (status === 400) {
        setConnectDiscordFirst(true);
        setGuilds([]);
        toast.error(details || t('discord.reconnectDiscord'));
      } else {
        toast.error(details || t('discord.errorLoadingGuilds'));
        setGuilds([]);
      }
    } finally {
      setLoadingGuilds(false);
    }
  };

  const loadChannels = async (guildId) => {
    setLoadingChannels(true);
    setChannels([]);
    setSelectedChannelId('');
    try {
      const data = await getDiscordChannels(guildId);
      setChannels(data.channels || []);
    } catch (err) {
      toast.error(err.response?.data?.details || err.response?.data?.error || t('discord.errorLoadingChannels'));
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedChannelId || !content.trim()) {
      toast.error(t('discord.selectChannelAndMessage'));
      return;
    }
    setSending(true);
    try {
      await postDiscordMessage(selectedChannelId, { content: content.trim() });
      toast.success(t('discord.messageSent'));
      setContent('');
    } catch (err) {
      const status = err.response?.status;
      const details = err.response?.data?.details || err.response?.data?.error || err.message;
      if (status === 403) {
        toast.error(t('discord.botNoPermission'));
        toast(t('discord.botNoPermissionFix'), { duration: 8000, icon: 'ℹ️' });
      } else {
        toast.error(details);
      }
    } finally {
      setSending(false);
    }
  };

  if (connectDiscordFirst) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('discord.connectFirstTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('discord.connectFirstText')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`${API_BASE_URL}/user/auth/discord?returnTo=discord`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition"
            >
              <MessageCircle className="w-5 h-5" />
              {t('discord.loginWithDiscord')}
            </a>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              {t('discord.reconnectInSettings')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-sm text-gray-600 dark:text-gray-400 hover:underline"
          >
            {t('common.back')} → {t('dashboard.title')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <MessageCircle className="w-7 h-7 text-[#5865F2]" />
        {t('discord.title')}
      </h1>

      <form onSubmit={handleSend} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Server className="w-4 h-4 inline mr-1" />
            {t('discord.selectServer')}
          </label>
          <select
            value={selectedGuildId}
            onChange={(e) => setSelectedGuildId(e.target.value)}
            disabled={loadingGuilds}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#5865F2] focus:border-transparent disabled:opacity-50"
          >
            <option value="">{loadingGuilds ? t('discord.loadingServers') : t('discord.chooseServer')}</option>
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Hash className="w-4 h-4 inline mr-1" />
            {t('discord.selectChannel')}
          </label>
          <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            disabled={loadingChannels || !selectedGuildId}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#5865F2] focus:border-transparent disabled:opacity-50"
          >
            <option value="">{loadingChannels ? t('common.loading') : t('discord.chooseChannel')}</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('discord.message')}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('discord.messagePlaceholder')}
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-[#5865F2] focus:border-transparent resize-y"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{content.length} / 2000</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sending || !selectedChannelId || !content.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {sending ? t('discord.sending') : t('discord.send')}
          </button>
          <button
            type="button"
            onClick={loadGuilds}
            disabled={loadingGuilds}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {loadingGuilds ? t('common.loading') : t('discord.refreshServers')}
          </button>
          <Link
            to="/dashboard"
            className="text-gray-600 dark:text-gray-400 hover:underline text-sm"
          >
            {t('common.back')} → {t('dashboard.title')}
          </Link>
        </div>
      </form>
    </div>
  );
}
