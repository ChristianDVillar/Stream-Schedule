/**
 * Content preview component
 * Shows how content will look on different platforms
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import React from 'react';
import { Twitter, Instagram, Twitch, MessageSquare } from 'lucide-react';

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

  const previews = {
    twitter: (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-500"></div>
          <div>
            <div className="font-semibold">@username</div>
            <div className="text-sm text-gray-500">Username</div>
          </div>
        </div>
        <p className="mb-2">{content.title && <strong>{content.title}</strong>}</p>
        <p className="text-gray-900 dark:text-gray-100">{content.content}</p>
        {content.files?.items && content.files.items.length > 0 && (
          <div className="mt-3 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 h-48"></div>
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
