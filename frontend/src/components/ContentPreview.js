/**
 * Content preview component
 * Shows how content will look on different platforms
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import React from 'react';
import { Twitter, Instagram, Twitch, MessageSquare, Video } from 'lucide-react';
import { TWITTER_MAX_CHARS } from '../constants/platforms';

const platformIcons = {
  twitter: Twitter,
  instagram: Instagram,
  twitch: Twitch,
  discord: MessageSquare,
  youtube: Video,
};

export function ContentPreview({ content, platform }) {
  const Icon = platformIcons[platform];
  const contentType = content.contentType || 'post';
  
  if (!Icon) {
    return <div className="text-gray-500">Preview not available for {platform}</div>;
  }

  // Format content based on contentType and platform
  const formatContentForPreview = (platform, contentType, title, body, hashtags, mentions) => {
    const typeEmojis = {
      post: '📝',
      stream: '🔴',
      event: '📅',
      reel: '🎬'
    };
    const emoji = typeEmojis[contentType] || '';
    
    if (platform === 'twitter') {
      const parts = [];
      if (title) parts.push(emoji ? `${emoji} ${title}` : title);
      if (body) parts.push(body);
      if (mentions) {
        const mentionList = mentions.split(',').map(m => m.trim()).filter(Boolean);
        if (mentionList.length > 0) {
          parts.push(mentionList.map(m => m.startsWith('@') ? m : `@${m}`).join(' '));
        }
      }
      if (hashtags) {
        const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
        if (hashtagList.length > 0) {
          parts.push(hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' '));
        }
      }
      return parts.join('\n\n');
    } else if (platform === 'discord') {
      const parts = [];
      if (title) {
        if (contentType === 'stream') {
          parts.push(`🔴 **${title}**`);
        } else if (contentType === 'event') {
          parts.push(`📅 **${title}**`);
        } else if (contentType === 'reel') {
          parts.push(`🎬 **${title}**`);
        } else {
          parts.push(`**${title}**`);
        }
      }
      if (body) parts.push(body);
      if (mentions) {
        const mentionList = mentions.split(',').map(m => m.trim()).filter(Boolean);
        if (mentionList.length > 0) {
          parts.push(mentionList.map(m => m.startsWith('@') ? m : `@${m}`).join(' '));
        }
      }
      if (hashtags) {
        const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
        if (hashtagList.length > 0) {
          parts.push(hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' '));
        }
      }
      return parts.join('\n\n');
    } else if (platform === 'instagram') {
      const parts = [];
      if (title) {
        if (contentType === 'stream') parts.push(`🔴 ${title}`);
        else if (contentType === 'event') parts.push(`📅 ${title}`);
        else if (contentType === 'reel') parts.push(`🎬 ${title}`);
        else parts.push(title);
      }
      if (body) parts.push(body);
      if (mentions) {
        const mentionList = mentions.split(',').map(m => m.trim()).filter(Boolean);
        if (mentionList.length > 0) {
          parts.push(mentionList.map(m => m.startsWith('@') ? m : `@${m}`).join(' '));
        }
      }
      if (hashtags) {
        const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
        if (hashtagList.length > 0) {
          parts.push(hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' '));
        }
      }
      return parts.join('\n');
    } else if (platform === 'twitch') {
      const parts = [];
      if (title) {
        if (contentType === 'stream') parts.push(`🔴 LIVE: ${title}`);
        else if (contentType === 'event') parts.push(`📅 ${title}`);
        else if (contentType === 'reel') parts.push(`🎬 ${title}`);
        else parts.push(title);
      }
      if (body) parts.push(body);
      if (hashtags) {
        const hashtagList = hashtags.split(',').map(h => h.trim()).filter(Boolean);
        if (hashtagList.length > 0) {
          parts.push(hashtagList.map(h => h.startsWith('#') ? h : `#${h}`).join(' '));
        }
      }
      return parts.join('\n\n');
    }
    return body || '';
  };

  const formattedContent = formatContentForPreview(
    platform, 
    contentType, 
    content.title, 
    content.content,
    content.hashtags,
    content.mentions
  );
  
  // For Twitter, calculate length including title and content
  const twitterFullText = formattedContent;
  const tweetText = twitterFullText.length > TWITTER_MAX_CHARS
    ? twitterFullText.slice(0, TWITTER_MAX_CHARS) + '…'
    : twitterFullText;
  const tweetLength = twitterFullText.length;
  const previews = {
    twitter: (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#0f1419]"></div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">@username</div>
              <div className="text-sm text-gray-500">Username</div>
            </div>
          </div>
          <span className={`text-xs ${tweetLength > TWITTER_MAX_CHARS ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {Math.min(tweetLength, TWITTER_MAX_CHARS)}/{TWITTER_MAX_CHARS}
          </span>
        </div>
        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">{tweetText}</p>
        {content.files?.items && content.files.items.length > 0 && (
          <div className="mt-3 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 h-48 border border-gray-200 dark:border-gray-600"></div>
        )}
      </div>
    ),
    discord: (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-900 text-white">
        {contentType === 'event' && (
          <div className="mb-3 p-2 bg-indigo-900/50 rounded border border-indigo-700">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">📅</span>
              <div>
                <div className="font-semibold">Scheduled Event</div>
                <div className="text-xs text-gray-400">Event will be created in Discord</div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500"></div>
          <div>
            <span className="font-semibold">Username</span>
            <span className="text-gray-400 text-sm ml-2">Today at 12:00 PM</span>
          </div>
        </div>
        <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}></div>
        {content.files?.items && content.files.items.length > 0 && (
          <div className="mt-3 rounded-lg overflow-hidden bg-gray-800 h-48"></div>
        )}
      </div>
    ),
    twitch: (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-purple-900 text-white">
        <div className="mb-3">
          <div className="text-sm text-purple-300 mb-1">
            {contentType === 'stream' ? '🔴 LIVE Stream' : contentType === 'event' ? '📅 Event' : contentType === 'reel' ? '🎬 Reel' : 'Stream Announcement'}
          </div>
          <h3 className="text-lg font-bold">
            {contentType === 'stream' && !content.title?.includes('🔴') ? '🔴 LIVE: ' : ''}
            {contentType === 'event' && !content.title?.includes('📅') ? '📅 ' : ''}
            {contentType === 'reel' && !content.title?.includes('🎬') ? '🎬 ' : ''}
            {content.title || 'Stream Title'}
          </h3>
        </div>
        <p className="text-purple-100">{content.content}</p>
        {content.hashtags && (
          <div className="mt-2 text-purple-300 text-sm">
            {content.hashtags.split(',').map((h, i) => (
              <span key={i} className="mr-2">#{h.trim().replace('#', '')}</span>
            ))}
          </div>
        )}
      </div>
    ),
    instagram: (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        {content.files?.items && content.files.items.length > 0 ? (
          <div className="bg-gray-200 dark:bg-gray-700 h-64"></div>
        ) : null}
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"></div>
            <span className="font-semibold">username</span>
          </div>
          <p className="mb-2">
            {contentType === 'stream' && '🔴 '}
            {contentType === 'event' && '📅 '}
            {contentType === 'reel' && '🎬 '}
            {content.title && <strong>{content.title}</strong>}
          </p>
          <p className="whitespace-pre-wrap">{content.content}</p>
          {content.hashtags && (
            <div className="mt-2 text-blue-600 dark:text-blue-400 text-sm">
              {content.hashtags.split(',').map((h, i) => (
                <span key={i} className="mr-2">#{h.trim().replace('#', '')}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    youtube: (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        {content.files?.items && content.files.items.length > 0 ? (
          <div className="bg-gray-200 dark:bg-gray-700 h-48"></div>
        ) : null}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
            {contentType === 'stream' && !content.title?.includes('🔴') && !content.title?.includes('LIVE') ? '🔴 LIVE: ' : ''}
            {contentType === 'stream' && content.title?.includes('🔴') && !content.title?.includes('LIVE') ? '🔴 LIVE: ' : ''}
            {contentType === 'event' && !content.title?.includes('📅') ? '📅 ' : ''}
            {contentType === 'reel' && !content.title?.includes('🎬') ? '🎬 ' : ''}
            {content.title || 'Video Title'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{content.content}</p>
          {content.hashtags && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {content.hashtags.split(',').map((h, i) => (
                <span key={i} className="mr-2">#{h.trim().replace('#', '')}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        <span className="capitalize">{platform}</span>
      </div>
      {previews[platform] || <div>Preview not available</div>}
    </div>
  );
}
