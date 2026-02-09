/**
 * Content preview component
 * Shows how content will look on different platforms
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import React from 'react';
import { Twitter, Instagram, Twitch, MessageSquare } from 'lucide-react';
import { TWITTER_MAX_CHARS } from '../constants/platforms';

const platformIcons = {
  twitter: Twitter,
  instagram: Instagram,
  twitch: Twitch,
  discord: MessageSquare,
};

export function ContentPreview({ content, platform }) {
  const Icon = platformIcons[platform];
  
  if (!Icon) {
    return <div className="text-gray-500">Preview not available for {platform}</div>;
  }

  const tweetText = (content.content || '').length > TWITTER_MAX_CHARS
    ? (content.content || '').slice(0, TWITTER_MAX_CHARS) + '…'
    : (content.content || '');
  const tweetLength = (content.content || '').length;
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
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500"></div>
          <div>
            <span className="font-semibold">Username</span>
            <span className="text-gray-400 text-sm ml-2">Today at 12:00 PM</span>
          </div>
        </div>
        <p className="mb-2">{content.title && <strong>{content.title}</strong>}</p>
        <p>{content.content}</p>
        {content.files?.items && content.files.items.length > 0 && (
          <div className="mt-3 rounded-lg overflow-hidden bg-gray-800 h-48"></div>
        )}
      </div>
    ),
    twitch: (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-purple-900 text-white">
        <div className="mb-3">
          <div className="text-sm text-purple-300 mb-1">Stream Announcement</div>
          <h3 className="text-lg font-bold">{content.title || 'Stream Title'}</h3>
        </div>
        <p className="text-purple-100">{content.content}</p>
      </div>
    ),
    instagram: (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        {content.files?.items && content.files.items.length > 0 ? (
          <div className="bg-gray-200 dark:bg-gray-700 h-64"></div>
        ) : null}
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-pink-500"></div>
            <span className="font-semibold">username</span>
          </div>
          <p className="mb-2">{content.title && <strong>{content.title}</strong>}</p>
          <p>{content.content}</p>
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
