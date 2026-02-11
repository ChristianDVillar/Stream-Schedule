import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Image as ImageIcon, X, CheckCircle, Clock, Lock } from 'lucide-react';
import { getMyMessages, getMessage, replyToMessage } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

export default function MyMessages({ token }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [replying, setReplying] = useState(false);
  const replyFileInputRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getMyMessages(token);
      setMessages(res.data.messages || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = async (messageId) => {
    if (!token) return;
    try {
      const res = await getMessage(messageId, token);
      setSelectedMessage(res.data.message);
      setShowMessageModal(true);
      setReplyText('');
      setReplyAttachments([]);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load message');
    }
  };

  const handleReplyFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.error('Only image files are allowed');
    }
    
    if (replyAttachments.length + imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Each image must be less than 5MB');
      return;
    }
    
    setReplyAttachments([...replyAttachments, ...imageFiles]);
    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = '';
    }
  };

  const removeReplyAttachment = (index) => {
    setReplyAttachments(replyAttachments.filter((_, i) => i !== index));
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim() || selectedMessage.resolved) return;
    setReplying(true);
    try {
      await replyToMessage({ 
        messageId: selectedMessage.id, 
        reply: replyText.trim(), 
        attachments: replyAttachments.length > 0 ? replyAttachments : undefined,
        token 
      });
      toast.success('Reply sent successfully!');
      setReplyText('');
      setReplyAttachments([]);
      await handleViewMessage(selectedMessage.id);
      fetchMessages();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error sending reply');
    } finally {
      setReplying(false);
    }
  };

  const getStatusBadge = (message) => {
    if (message.resolved) {
      return (
        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded flex items-center gap-1">
          <Lock className="w-3 h-3" />
          {t('messages.resolved') || 'Resolved'}
        </span>
      );
    }
    if (message.replies && message.replies.length > 0) {
      return (
        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {message.replies.length} {t('messages.replies') || 'replies'}
        </span>
      );
    }
    if (message.status === 'read') {
      return (
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {t('messages.read') || 'Read'}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 rounded">
        {t('messages.unread') || 'Unread'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('common.loading') || 'Loading...'}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('messages.noMessages') || 'No messages yet. Send a message to an administrator from the Support tab.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {t('messages.myMessages') || 'My Messages'} ({messages.length})
        </h3>
      </div>

      <div className="space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            onClick={() => handleViewMessage(msg.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              msg.resolved
                ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-75'
                : msg.replies && msg.replies.length > 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : msg.status === 'unread'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{msg.subject}</span>
                  {getStatusBadge(msg)}
                  {msg.category && (
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded">
                      {msg.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">{msg.content}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                  <span>{formatDate(msg.createdAt)}</span>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {msg.attachments.length}
                        </span>
                      )}
                      {msg.replies && msg.replies.length > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {msg.replies.length} {t('messages.replies') || 'replies'}
                        </span>
                      )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Detail Modal */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMessageModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedMessage.subject}</h2>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">{formatDate(selectedMessage.createdAt)}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className="ml-2">{getStatusBadge(selectedMessage)}</span>
                </div>
                {selectedMessage.category && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100 capitalize">{selectedMessage.category}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100 capitalize">{selectedMessage.priority}</span>
                </div>
              </div>

              {/* Resolved Banner */}
              {selectedMessage.resolved && (
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    {t('messages.conversationResolved') || 'This conversation has been marked as resolved.'}
                    {selectedMessage.resolvedByUser && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        by {selectedMessage.resolvedByUser.username} on {formatDate(selectedMessage.resolvedAt)}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('messages.yourMessage') || 'Your Message'}:</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMessage.content}</p>
                
                {/* User attachments */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('messages.attachments') || 'Attachments'}:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedMessage.attachments.map((att, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={att.url}
                            alt={att.name || `Attachment ${idx + 1}`}
                            className="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80"
                            onClick={() => window.open(att.url, '_blank')}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{att.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Conversation Thread */}
              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('messages.conversation') || 'Conversation'}:</h3>
                  {selectedMessage.replies.map((reply, idx) => (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-lg border ${
                        reply.isAdmin
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {reply.isAdmin ? t('messages.admin') || 'Administrator' : t('messages.you') || 'You'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(reply.createdAt)}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">{reply.content}</p>
                      
                      {/* Reply attachments */}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="mt-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {reply.attachments.map((att, attIdx) => (
                              <div key={attIdx} className="relative">
                                <img
                                  src={att.url}
                                  alt={att.name || `Attachment ${attIdx + 1}`}
                                  className="w-full h-20 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(att.url, '_blank')}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{att.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form (only if not resolved) */}
              {!selectedMessage.resolved && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('messages.reply') || 'Reply'}:</h3>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none mb-2"
                    placeholder={t('messages.replyPlaceholder') || 'Type your reply...'}
                  />
                  
                  {/* Reply attachments */}
                  <div className="mb-2">
                    <input
                      type="file"
                      ref={replyFileInputRef}
                      onChange={handleReplyFileSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                      id="reply-attachment-input"
                    />
                    <label
                      htmlFor="reply-attachment-input"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      {t('messages.addImages') || 'Add Images'} ({replyAttachments.length}/5)
                    </label>
                    
                    {replyAttachments.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {replyAttachments.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded border border-gray-200 dark:border-gray-600"
                            />
                            <button
                              type="button"
                              onClick={() => removeReplyAttachment(index)}
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
                  
                  <button
                    onClick={handleReply}
                    disabled={replying || !replyText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {replying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('messages.sending') || 'Sending...'}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {t('messages.sendReply') || 'Send Reply'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
