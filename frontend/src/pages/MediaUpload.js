/**
 * Media Upload Page
 * Page for uploading and managing media files
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import FileUpload from '../components/FileUpload';
import MediaGallery from '../components/MediaGallery';
import { getUploadStats } from '../utils/uploadHelper';
import { Image, Video, Upload, BarChart3 } from 'lucide-react';

export default function MediaUpload({ user, token }) {
  const { t } = useLanguage();
  const [uploadStats, setUploadStats] = useState(null);

  // Load upload stats
  useEffect(() => {
    const loadStats = async () => {
      if (user?.id) {
        try {
          const stats = await getUploadStats(user.id.toString());
          setUploadStats(stats);
        } catch (error) {
          console.error('Error loading upload stats:', error);
        }
      }
    };
    loadStats();
  }, [user]);

  const handleUploadComplete = (url, bucket) => {
    // Reload stats after upload
    if (user?.id) {
      getUploadStats(user.id.toString()).then(setUploadStats).catch(console.error);
    }
  };

  const handleFileDelete = () => {
    // Reload stats after deletion
    if (user?.id) {
      getUploadStats(user.id.toString()).then(setUploadStats).catch(console.error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:p-6 py-4 min-w-0">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('media.title')}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t('media.subtitle')}
        </p>
      </div>

      {/* Upload Stats */}
      {uploadStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('media.uploadStats')}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Image className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {t('media.images')}
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {uploadStats.uploads?.filter(u => u.bucket === 'images').length || 0}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Video className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                  {t('media.videos')}
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {uploadStats.uploads?.filter(u => u.bucket === 'videos').length || 0}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                  {t('media.total24h')}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                {uploadStats.totalUploads24h || 0}
              </p>
            </div>
          </div>

          {uploadStats.isTrialUser && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>{t('media.trialPlan')}:</strong> {t('media.remainingUploads', { count: uploadStats.remainingUploads })}
                ({t('media.dailyLimit', { limit: uploadStats.dailyLimit })})
              </p>
            </div>
          )}
        </div>
      )}

      {/* File Upload Component */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <FileUpload user={user} onUploadComplete={handleUploadComplete} />
      </div>

      {/* Media Gallery - Show uploaded files */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('media.uploadedFiles')}
        </h2>
        <MediaGallery 
          user={user}
          showDeleteButton={true}
          onDelete={handleFileDelete}
        />
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          {t('media.instructions')}
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>{t('media.instructionsImagePublic')}</li>
          <li>{t('media.instructionsVideoPrivate')}</li>
          <li>{t('media.instructionsTrialLimit')}</li>
          <li>{t('media.instructionsProUnlimited')}</li>
        </ul>
      </div>
    </div>
  );
}
