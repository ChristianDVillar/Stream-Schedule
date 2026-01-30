/**
 * Media Gallery Component
 * Shows user's uploaded images and videos
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { useState, useEffect } from 'react';
import { Image, Video, X, Check, Trash2 } from 'lucide-react';
import { supabase, getPublicImageUrl } from '../utils/supabaseClient';
import { getUploadStats } from '../utils/uploadHelper';
import { deleteUpload, getVideoSignedUrl } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

export default function MediaGallery({ user, onSelect, selectedUrls = [], showDeleteButton = false, onDelete }) {
  const { t } = useLanguage();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadMediaFiles();
  }, [user]);

  const loadMediaFiles = async () => {
    if (!user?.id || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get upload stats which includes all uploads (not just 24h)
      const stats = await getUploadStats(user.id.toString());
      
      if (stats && !stats.error && stats.uploads && stats.uploads.length > 0) {
        // Get URLs for each upload
        const filesWithUrls = await Promise.all(
          stats.uploads.map(async (upload) => {
            let url;
            try {
              if (upload.bucket === 'images') {
                url = getPublicImageUrl(upload.file_path);
              } else {
                // Get signed URL for videos from backend (uses Service Role Key)
                try {
                  const response = await getVideoSignedUrl(upload.file_path, 3600);
                  if (response.data && response.data.signedUrl) {
                    url = response.data.signedUrl;
                    console.log('Video URL generated from backend:', { 
                      filePath: upload.file_path, 
                      url: url?.substring(0, 50) + '...' 
                    });
                  } else {
                    throw new Error('No signedUrl in response');
                  }
                } catch (backendError) {
                  console.error('Backend video URL generation failed:', {
                    filePath: upload.file_path,
                    error: backendError.response?.data || backendError.message,
                    status: backendError.response?.status
                  });
                  
                  // If file doesn't exist (404), remove orphaned DB record and filter out
                  if (backendError.response?.status === 404) {
                    console.warn('Video file not found in Storage, skipping:', upload.file_path);
                    if (upload.id) {
                      deleteUpload(upload.id).catch(() => {});
                    }
                    return null;
                  }
                  
                  // For other errors (e.g. 401), try frontend method as fallback
                  try {
                    const { getSignedVideoUrl } = await import('../utils/supabaseClient');
                    url = await getSignedVideoUrl(upload.file_path, 3600);
                    console.log('Video URL generated from frontend (fallback):', { filePath: upload.file_path });
                  } catch (frontendError) {
                    console.error('Frontend video URL generation also failed:', frontendError);
                    throw frontendError;
                  }
                }
              }
              if (!url) {
                console.warn('No URL generated for file:', upload.file_path, upload.bucket);
                return null;
              }
              return {
                ...upload,
                url,
                fileName: upload.file_path.split('/').pop() || upload.file_path
              };
            } catch (err) {
              console.error('Error getting URL for file:', upload.file_path, upload.bucket, err);
              // Don't filter out videos completely - return with error flag so we can show a message
              return {
                ...upload,
                url: null,
                fileName: upload.file_path.split('/').pop() || upload.file_path,
                error: err.message
              };
            }
          })
        );

        // Filter out nulls and files without URLs, sort by date (newest first)
        const validFiles = filesWithUrls
          .filter(f => f !== null && f.url) // Only include files with valid URLs
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        const removedOrphanedCount = filesWithUrls.filter(f => f === null).length;
        if (removedOrphanedCount > 0) {
          toast(
            `${removedOrphanedCount} registro(s) de archivos no encontrados en Storage se eliminaron de la lista.`,
            { duration: 4000, icon: '🧹' }
          );
        }
        const failedFiles = filesWithUrls.filter(f => f !== null && !f.url);
        if (failedFiles.length > 0) {
          console.warn('Some files could not be loaded:', failedFiles.map(f => ({ 
            fileName: f.fileName, 
            bucket: f.bucket, 
            error: f.error,
            filePath: f.file_path
          })));
        }

        setMediaFiles(validFiles);
      } else {
        setMediaFiles([]);
      }
    } catch (err) {
      console.error('Error loading media files:', err);
      setError(t('media.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (file) => {
    if (onSelect) {
      onSelect(file.url, file.bucket);
    }
  };

  const isSelected = (url) => {
    return selectedUrls.includes(url);
  };

  const handleDelete = async (e, file) => {
    e.stopPropagation(); // Prevent triggering selection
    
    if (!window.confirm(t('media.deleteConfirm', { fileName: file.fileName }))) {
      return;
    }

    try {
      setDeletingId(file.id);
      await deleteUpload(file.id);
      toast.success(t('media.fileDeleted'));
      
      // Remove from local state
      setMediaFiles(prev => prev.filter(f => f.id !== file.id));
      
      // Notify parent component if callback provided
      if (onDelete) {
        onDelete(file);
      }
    } catch (err) {
      console.error('Error deleting file:', err);
      const errorMessage = err.response?.data?.error || t('media.deleteError');
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">{t('media.loadingFiles')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadMediaFiles}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          {t('media.retry')}
        </button>
      </div>
    );
  }

  if (mediaFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('media.noFiles')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('media.availableFiles')} ({mediaFiles.length})
        </h3>
        <button
          onClick={loadMediaFiles}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t('media.refresh')}
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaFiles.map((file, index) => (
          <div
            key={file.id || index}
            onClick={() => handleSelect(file)}
            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              isSelected(file.url)
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
            } ${deletingId === file.id ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {file.bucket === 'images' ? (
              <div className="relative aspect-square">
                <img
                  src={file.url}
                  alt={file.fileName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EImagen%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="absolute top-2 left-2">
                  <Image className="w-4 h-4 text-white drop-shadow-lg" />
                </div>
              </div>
            ) : (
              <div className="relative aspect-square bg-gray-900 overflow-hidden group/video">
                {file.url ? (
                  <video
                    src={file.url}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                    playsInline
                    onError={(e) => {
                      console.error('Error loading video:', file.fileName, file.url, e);
                      // Show fallback if video fails to load
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.video-fallback');
                      if (fallback) {
                        fallback.style.display = 'flex';
                        const errorMsg = fallback.querySelector('.error-msg');
                        if (errorMsg) errorMsg.textContent = 'Error loading video';
                      }
                    }}
                    onLoadedMetadata={() => {
                      console.log('Video loaded successfully:', file.fileName);
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="video-fallback absolute inset-0 flex flex-col items-center justify-center">
                    <Video className="w-8 h-8 text-white mb-2" />
                    <p className="text-xs text-white/80 text-center px-2 error-msg">
                      {file.error || 'Video unavailable'}
                    </p>
                  </div>
                )}
                <div className="video-fallback absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 opacity-0 group-hover/video:opacity-100 transition-opacity" style={{ display: file.url ? 'none' : 'flex' }}>
                  <Video className="w-8 h-8 text-white mb-2" />
                  <p className="text-xs text-white/80 text-center px-2 error-msg">
                    {file.error || 'Video unavailable'}
                  </p>
                </div>
                <div className="absolute top-2 left-2 z-10">
                  <Video className="w-4 h-4 text-white drop-shadow-lg" />
                </div>
              </div>
            )}
            
            {isSelected(file.url) && (
              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                <div className="bg-blue-500 rounded-full p-2">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
            )}

            {/* Delete button */}
            {showDeleteButton && (
              <button
                onClick={(e) => handleDelete(e, file)}
                disabled={deletingId === file.id}
                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                title={t('media.deleteFile')}
              >
                {deletingId === file.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-xs text-white truncate">{file.fileName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
