import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Calendar, 
  Upload, 
  X, 
  Image, 
  Video, 
  FileText,
  Save,
  Plus
} from 'lucide-react';

const Schedule = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'text',
    scheduledFor: '',
    hashtags: '',
    mentions: ''
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const platforms = [
    { id: 'twitch', name: 'Twitch', color: 'bg-purple-500' },
    { id: 'twitter', name: 'Twitter/X', color: 'bg-blue-500' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
    { id: 'discord', name: 'Discord', color: 'bg-indigo-500' }
  ];

  const contentTypes = [
    { value: 'text', label: 'Text' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' },
    { value: 'stream', label: 'Stream' }
  ];

  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9)
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePlatformChange = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const contentData = {
        ...formData,
        platforms: JSON.stringify(selectedPlatforms),
        files: JSON.stringify(uploadedFiles.map(f => ({ 
          name: f.file.name, 
          size: f.file.size, 
          type: f.file.type 
        })))
      };

      await axios.post('http://localhost:5000/api/content', contentData, {
        withCredentials: true
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Content</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Content Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Content Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Write an attractive title..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Write your content here..."
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content Type
                      </label>
                      <select
                        value={formData.contentType}
                        onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        {contentTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Publication Date and Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.scheduledFor}
                        onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hashtags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={formData.hashtags}
                        onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="#gaming #streamer #live"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mentions (comma separated)
                      </label>
                      <input
                        type="text"
                        value={formData.mentions}
                        onChange={(e) => setFormData({ ...formData, mentions: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="@user1 @user2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Media Files</h2>
                
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Click to select files
                  </h3>
                  <p className="text-gray-600 mb-2">or drag files here</p>
                  <p className="text-sm text-gray-500">
                    Supported: JPG, PNG, GIF, MP4, AVI, MOV (max 50MB per file)
                  </p>
                </div>

                {/* File List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Uploaded files ({uploadedFiles.length})
                    </h3>
                    <div className="space-y-2">
                      {uploadedFiles.map((fileWithPreview) => (
                        <div key={fileWithPreview.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(fileWithPreview.file.type)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{fileWithPreview.file.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(fileWithPreview.file.size)} • {fileWithPreview.file.type}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(fileWithPreview.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Platforms */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Platforms</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select the platforms where you want to publish
                </p>
                
                <div className="space-y-3">
                  {platforms.map(platform => (
                    <label key={platform.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => handlePlatformChange(platform.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div className={`w-6 h-6 ${platform.color} rounded flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">
                          {platform.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                    </label>
                  ))}
                </div>
                
                {selectedPlatforms.length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Select at least one platform
                    </p>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Preview</h2>
                
                {formData.title && (
                  <h3 className="font-medium text-gray-900 mb-2">{formData.title}</h3>
                )}
                
                {formData.content && (
                  <p className="text-gray-600 mb-3 text-sm">{formData.content}</p>
                )}
                
                {uploadedFiles.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Attached files:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedFiles.slice(0, 3).map((fileWithPreview) => (
                        <img
                          key={fileWithPreview.id}
                          src={fileWithPreview.preview}
                          alt={fileWithPreview.file.name}
                          className="w-full h-16 object-cover rounded"
                        />
                      ))}
                      {uploadedFiles.length > 3 && (
                        <div className="w-full h-16 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">+{uploadedFiles.length - 3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {formData.hashtags && (
                  <div className="mb-3">
                    {formData.hashtags.split(',').map((tag, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  Will be published on: {selectedPlatforms.length} platform(s)
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedPlatforms.length === 0 || !formData.title || !formData.content}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default Schedule; 