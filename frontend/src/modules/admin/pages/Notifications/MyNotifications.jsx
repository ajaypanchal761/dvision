import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBell, FiTrash2, FiRefreshCw, FiCheck, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { notificationAPI } from '../../services/api';

/**
 * My Notifications Page for Admin
 * Shows admin's own notifications with select and delete functionality
 * Redesigned with new theme
 */
const MyNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Format time helper
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await notificationAPI.getMyNotifications();
      if (response.success && response.data?.notifications) {
        setNotifications(response.data.notifications);
        if (response.data.notifications.length > 0) {
          const unreadIds = response.data.notifications
            .filter(n => !n.isRead)
            .map(n => n._id);
          if (unreadIds.length > 0) {
            await notificationAPI.markAsRead(unreadIds);
          }
        }
      } else {
        setError('Failed to load notifications');
      }
    } catch (err) {
      const errorMsg = err?.message || err?.toString() || 'Failed to load notifications';
      setError(typeof errorMsg === 'string' ? errorMsg : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n._id));
    }
  };

  const handleSelectNotification = (notificationId) => {
    setSelectedIds(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsDeleting(true);
      const response = await notificationAPI.deleteNotifications(selectedIds);
      if (response.success) {
        setNotifications(prev => prev.filter(n => !selectedIds.includes(n._id)));
        setSelectedIds([]);
        setShowConfirmDialog(false);
        setIsSelectionMode(false);
      } else {
        setError('Failed to delete notifications');
      }
    } catch (err) {
      const errorMsg = err?.message || err?.toString() || 'Failed to delete notifications';
      setError(typeof errorMsg === 'string' ? errorMsg : 'Failed to delete notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = () => {
    setShowConfirmDialog(true);
  };

  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedIds([]);
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const confirmDeleteAll = async () => {
    try {
      setIsDeleting(true);
      const response = await notificationAPI.deleteAllNotifications();
      if (response.success) {
        setNotifications([]);
        setSelectedIds([]);
        setShowConfirmDialog(false);
      } else {
        setError('Failed to delete all notifications');
      }
    } catch (err) {
      const errorMsg = err?.message || err?.toString() || 'Failed to delete all notifications';
      setError(typeof errorMsg === 'string' ? errorMsg : 'Failed to delete all notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
              >
                <FiArrowLeft className="text-xl sm:text-2xl" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">My Notifications</h1>
                {notifications.length > 0 && !isSelectionMode && (
                  <p className="text-sm text-white/80 mt-1">{notifications.length} notification{notifications.length > 1 ? 's' : ''}</p>
                )}
                {isSelectionMode && selectedIds.length > 0 && (
                  <p className="text-sm text-white/80 mt-1">{selectedIds.length} selected</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {notifications.length > 0 && (
                <>
                  {isSelectionMode ? (
                    <>
                      <button
                        onClick={handleExitSelectionMode}
                        className="px-3 py-1.5 sm:py-2 text-white hover:bg-white/10 rounded-lg text-xs sm:text-sm font-semibold transition-colors border border-white/20"
                      >
                        Cancel
                      </button>
                      {selectedIds.length > 0 && (
                        <button
                          onClick={handleDeleteSelected}
                          disabled={isDeleting}
                          className="px-3 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shadow-lg"
                        >
                          {isDeleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleEnterSelectionMode}
                        className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Select to Delete"
                      >
                        <FiTrash2 className="text-lg sm:text-xl" />
                      </button>
                      <button 
                        onClick={fetchNotifications}
                        disabled={isLoading}
                        className="p-2 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                        title="Refresh"
                      >
                        <FiRefreshCw className={`text-lg sm:text-xl ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-6 pb-24">
        {error && (
          <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-50 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {/* Select All Button - Only show in selection mode */}
            {isSelectionMode && (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-gray-700 hover:text-[#1e3a5f] transition-colors font-bold"
                >
                  {selectedIds.length === notifications.length ? (
                    <FiCheckSquare className="text-xl text-[#1e3a5f]" />
                  ) : (
                    <FiSquare className="text-xl" />
                  )}
                  <span className="text-sm">
                    {selectedIds.length === notifications.length ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
              </div>
            )}

            {notifications.map((notification) => {
              const isSelected = selectedIds.includes(notification._id);
              return (
                <div
                  key={notification._id}
                  className={`bg-white rounded-xl p-5 shadow-md border-2 transition-all ${
                    isSelectionMode ? 'cursor-pointer' : ''
                  } ${
                    isSelected 
                      ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/20 bg-blue-50' 
                      : 'border-gray-200 hover:border-[#1e3a5f]/30'
                  } ${!notification.isRead ? 'bg-[#1e3a5f]/5' : ''}`}
                  onClick={() => isSelectionMode && handleSelectNotification(notification._id)}
                >
                  <div className="flex items-start gap-3">
                    {isSelectionMode && (
                      <div className="mt-1">
                        {isSelected ? (
                          <FiCheckSquare className="text-[#1e3a5f] text-xl" />
                        ) : (
                          <FiSquare className="text-gray-300 text-xl" />
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-bold text-base ${!notification.isRead ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-[#1e3a5f] rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                        {notification.body}
                      </p>
                      <p className="text-gray-400 text-xs font-medium">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-12">
            <div className="w-20 h-20 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mb-6">
              <FiBell className="text-[#1e3a5f] text-4xl" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 text-center">
              All Caught Up!
            </h2>
            <p className="text-gray-500 text-center max-w-md text-sm sm:text-base px-4 mb-6">
              You don't have any notifications right now. We'll notify you when something important happens!
            </p>
            <div className="bg-[#1e3a5f]/10 rounded-xl px-6 py-3 flex items-center gap-3 border border-[#1e3a5f]/20">
              <div className="bg-[#1e3a5f] rounded-full p-1.5">
                <FiCheck className="text-white text-sm" />
              </div>
              <span className="text-[#1e3a5f] font-bold text-sm">
                You're up to date
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Delete All Notifications?
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Are you sure you want to delete all notifications? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAll}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyNotifications;

