import React, { useState, useRef } from 'react';
import { MessageSquare, Send, AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import { createMessage } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

export default function ContactAdmin({ token }) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    priority: 'normal',
    category: 'support'
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.error(t('messages.onlyImagesAllowed') || 'Only image files are allowed');
    }
    
    if (attachments.length + imageFiles.length > 5) {
      toast.error(t('messages.max5Images') || 'Maximum 5 images allowed');
      return;
    }
    
    // Check file sizes (5MB max per file)
    const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(t('messages.maxFileSize') || 'Each image must be less than 5MB');
      return;
    }
    
    setAttachments([...attachments, ...imageFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.content.trim()) {
      toast.error(t('messages.subjectAndContentRequired') || 'Subject and content are required');
      return;
    }

    setLoading(true);
    try {
      await createMessage({
        subject: formData.subject.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        category: formData.category,
        attachments: attachments.length > 0 ? attachments : undefined,
        token
      });
      
      toast.success(t('messages.messageSent') || 'Message sent successfully!');
      setFormData({
        subject: '',
        content: '',
        priority: 'normal',
        category: 'support'
      });
      setAttachments([]);
      setShowForm(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || t('messages.sendError') || 'Failed to send message';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
        <span>{t('messages.contactAdmin') || 'Contact Administrator'}</span>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {t('messages.contactAdmin') || 'Contact Administrator'}
        </h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('messages.category') || 'Category'}
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="support">{t('messages.categorySupport') || 'Support'}</option>
            <option value="bug">{t('messages.categoryBug') || 'Bug Report'}</option>
            <option value="feature">{t('messages.categoryFeature') || 'Feature Request'}</option>
            <option value="billing">{t('messages.categoryBilling') || 'Billing'}</option>
            <option value="account">{t('messages.categoryAccount') || 'Account'}</option>
            <option value="other">{t('messages.categoryOther') || 'Other'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('messages.priority') || 'Priority'}
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="low">{t('messages.priorityLow') || 'Low'}</option>
            <option value="normal">{t('messages.priorityNormal') || 'Normal'}</option>
            <option value="high">{t('messages.priorityHigh') || 'High'}</option>
            <option value="urgent">{t('messages.priorityUrgent') || 'Urgent'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('messages.subject') || 'Subject'} *
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            maxLength={255}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder={t('messages.subjectPlaceholder') || 'Enter message subject'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('messages.message') || 'Message'} *
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={6}
            maxLength={10000}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            placeholder={t('messages.messagePlaceholder') || 'Enter your message...'}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
            {formData.content.length}/10000
          </div>
        </div>

        {/* File Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('messages.attachments') || 'Attachments'} ({attachments.length}/5)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            className="hidden"
            id="attachment-input"
          />
          <label
            htmlFor="attachment-input"
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            <span>{t('messages.addImages') || 'Add Images'}</span>
          </label>
          
          {attachments.length > 0 && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{file.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('messages.responseTime') || 'We typically respond within 24-48 hours. For urgent matters, please select "Urgent" priority.'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={loading || !formData.subject.trim() || !formData.content.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('messages.sending') || 'Sending...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('messages.send') || 'Send Message'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
