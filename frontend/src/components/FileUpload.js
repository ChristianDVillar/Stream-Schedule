/**
 * File Upload Component
 * Component for uploading files to Supabase Storage
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { useState, useEffect } from 'react';
import { Upload, Image, Video, Loader2 } from 'lucide-react';
import { handleUpload, getUploadStats } from '../utils/uploadHelper';
import { formatDateTime } from '../utils/dateUtils';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

export default function FileUpload({ user, onUploadComplete }) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadStats, setUploadStats] = useState(null);

  // Determine if user is trial
  const isTrialUser = user?.licenseType === 'trial';

  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration) || 0);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error(t('media.invalidFileType'));
      return;
    }

    // Validate file size (10MB for images, 100MB for videos)
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const maxSize = isImage ? maxImageSize : maxVideoSize;

    if (file.size > maxSize) {
      toast.error(t('media.fileTooLarge', { maxSize: isImage ? '10MB' : '100MB' }));
      return;
    }

    setUploading(true);

    try {
      const bucket = isImage ? 'images' : 'videos';
      const userId = user?.id?.toString();

      const result = await handleUpload({
        file,
        bucket,
        userId,
        isTrialUser
      });

      if (result.error) {
        // Error already shown by toast in handleUpload
        return;
      }

      let durationSeconds;
      if (isVideo) {
        durationSeconds = await getVideoDuration(file);
      }

      const meta = {
        fileName: file.name,
        type: isImage ? 'image' : 'video',
        ...(durationSeconds !== undefined && { durationSeconds }),
        ...(result.path && { file_path: result.path })
      };

      // Add to uploaded files list
      setUploadedFiles(prev => [...prev, {
        url: result.url,
        bucket,
        fileName: file.name,
        uploadedAt: new Date(),
        ...(durationSeconds !== undefined && { durationSeconds })
      }]);

      // Update stats after successful upload
      if (userId) {
        try {
          const stats = await getUploadStats(userId);
          setUploadStats(stats);
        } catch (error) {
          console.error('Error loading upload stats:', error);
        }
      }

      // Notify parent component (url, bucket, meta) - meta includes file_path for backend to get fresh signed URL when publishing
      if (onUploadComplete) {
        onUploadComplete(result.url, bucket, meta);
      }

    } catch (error) {
      console.error('Error in file upload:', error);
      toast.error(t('media.uploadError'));
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      if (user?.id) {
        try {
          const stats = await getUploadStats(user.id.toString());
          if (stats && !stats.error) {
            setUploadStats(stats);
          }
        } catch (error) {
          console.error('Error loading upload stats:', error);
          // Set empty stats to prevent errors
          setUploadStats({ uploads: [], totalUploads24h: 0, isTrialUser: false });
        }
      }
    };
    loadStats();
  }, [user]);

  return (
    <div className="space-y-4">
      {/* Upload Stats: solo mostrar límite si aplica (no trial = 1 subida/día; trial por ahora sin límite) */}
      {uploadStats && uploadStats.dailyLimit != null && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {t('media.remainingToday', { remaining: uploadStats.remainingUploads ?? 0, limit: uploadStats.dailyLimit })}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                {t('media.total24hCount', { count: uploadStats.totalUploads24h })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
        <label className="cursor-pointer flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {uploading ? t('media.uploading') : t('media.clickToUpload')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('media.fileTypes')}
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('media.uploadedFilesList')}
          </h3>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {file.bucket === 'images' ? (
                  <Image className="w-5 h-5 text-blue-500" />
                ) : (
                  <Video className="w-5 h-5 text-purple-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateTime(file.uploadedAt)}
                  </p>
                </div>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                {t('media.view')}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
