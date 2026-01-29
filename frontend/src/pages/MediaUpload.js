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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Subir Archivos / Upload Files
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sube imagenes y videos para usar en tus publicaciones
        </p>
      </div>

      {/* Upload Stats */}
      {uploadStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Estadisticas de Uploads
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Image className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Imagenes
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
                  Videos
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
                  Total (24h)
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
                <strong>Plan Trial:</strong> Tienes {uploadStats.remainingUploads} uploads restantes hoy
                (Limite: {uploadStats.dailyLimit} por dia)
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
          Archivos Subidos
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
          Instrucciones / Instructions
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Las imagenes son publicas y accesibles por URL directa</li>
          <li>Los videos son privados y requieren URL firmada (valida por 5 minutos)</li>
          <li>Usuarios trial: 1 upload por dia</li>
          <li>Usuarios pro: uploads ilimitados</li>
        </ul>
      </div>
    </div>
  );
}
