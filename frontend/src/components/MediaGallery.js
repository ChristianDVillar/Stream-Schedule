/**
 * Media Gallery Component
 * Shows user's uploaded images and videos
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { useState, useEffect } from 'react';
import { Image, Video, X, Check } from 'lucide-react';
import { supabase, getPublicImageUrl, getSignedVideoUrl } from '../utils/supabaseClient';
import { getUploadStats } from '../utils/uploadHelper';

export default function MediaGallery({ user, onSelect, selectedUrls = [] }) {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      
      if (stats && stats.uploads && stats.uploads.length > 0) {
        // Get URLs for each upload
        const filesWithUrls = await Promise.all(
          stats.uploads.map(async (upload) => {
            let url;
            try {
              if (upload.bucket === 'images') {
                url = getPublicImageUrl(upload.file_path);
              } else {
                url = await getSignedVideoUrl(upload.file_path, 3600);
              }
              return {
                ...upload,
                url,
                fileName: upload.file_path.split('/').pop() || upload.file_path
              };
            } catch (err) {
              console.error('Error getting URL for file:', upload.file_path, err);
              return null;
            }
          })
        );

        // Filter out nulls and sort by date (newest first)
        const validFiles = filesWithUrls
          .filter(f => f !== null)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setMediaFiles(validFiles);
      } else {
        setMediaFiles([]);
      }
    } catch (err) {
      console.error('Error loading media files:', err);
      setError('Error cargando archivos');
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">Cargando archivos...</p>
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
          Reintentar
        </button>
      </div>
    );
  }

  if (mediaFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No hay archivos disponibles. Sube archivos para usarlos en tus posts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Archivos disponibles ({mediaFiles.length})
        </h3>
        <button
          onClick={loadMediaFiles}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Actualizar
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mediaFiles.map((file, index) => (
          <div
            key={index}
            onClick={() => handleSelect(file)}
            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              isSelected(file.url)
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
            }`}
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
              <div className="relative aspect-square bg-gray-900 flex items-center justify-center">
                <Video className="w-8 h-8 text-white" />
                <div className="absolute top-2 left-2">
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
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-xs text-white truncate">{file.fileName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
