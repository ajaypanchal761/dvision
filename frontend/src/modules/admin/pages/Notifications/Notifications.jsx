import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationAPI, classAPI } from '../../services/api'

const Notifications = () => {
  const navigate = useNavigate()
  const [recipientType, setRecipientType] = useState('student') // 'student' or 'teacher'
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedBoard, setSelectedBoard] = useState('')
  const [recipients, setRecipients] = useState([])
  const [selectedRecipients, setSelectedRecipients] = useState([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [allClasses, setAllClasses] = useState([])
  const [boards, setBoards] = useState([])
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationBody, setNotificationBody] = useState('')
  const [sending, setSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState('')
  const [notificationHistory, setNotificationHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all') // 'all', 'student', 'teacher'

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await classAPI.getAllWithoutPagination({ isActive: true })
        if (response.success && response.data?.classes) {
          setAllClasses(response.data.classes)

          // Extract unique boards
          const uniqueBoards = [...new Set(response.data.classes.map(c => c.board))].filter(Boolean).sort()
          setBoards(uniqueBoards)
        }
      } catch (err) {
        console.error('Error fetching classes:', err)
      }
    }
    fetchClasses()
  }, [])

  // Fetch notification history
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await notificationAPI.getHistory(
        historyFilter === 'all' ? null : historyFilter,
        50
      )
      if (response.success && response.data?.history) {
        setNotificationHistory(response.data.history)
      } else {
        setNotificationHistory([])
      }
    } catch (err) {
      console.error('Error fetching notification history:', err)
      setNotificationHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  // Fetch history on mount and when filter changes
  useEffect(() => {
    fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyFilter])

  // Refresh history after sending notification
  useEffect(() => {
    if (successMessage) {
      fetchHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successMessage])

  const fetchStudents = async () => {
    try {
      setLoadingRecipients(true)
      setSelectedRecipients([]) // Reset selection when fetching new data
      const response = await notificationAPI.getFilteredStudents(
        selectedClass || null,
        selectedBoard || null
      )
      if (response.success && response.data?.students) {
        setRecipients(response.data.students)
      } else {
        setRecipients([])
      }
    } catch (err) {
      console.error('Error fetching students:', err)
      setRecipients([])
    } finally {
      setLoadingRecipients(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      setLoadingRecipients(true)
      setSelectedRecipients([]) // Reset selection when fetching new data
      const response = await notificationAPI.getFilteredTeachers()
      if (response.success && response.data?.teachers) {
        setRecipients(response.data.teachers)
      } else {
        setRecipients([])
      }
    } catch (err) {
      console.error('Error fetching teachers:', err)
      setRecipients([])
    } finally {
      setLoadingRecipients(false)
    }
  }

  const handleRecipientToggle = (recipientId) => {
    setSelectedRecipients(prev => {
      if (prev.includes(recipientId)) {
        return prev.filter(id => id !== recipientId)
      } else {
        return [...prev, recipientId]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([])
    } else {
      setSelectedRecipients(recipients.map(r => r._id))
    }
  }

  // Fetch recipients when filters change
  useEffect(() => {
    if (recipientType === 'student') {
      fetchStudents()
    } else {
      fetchTeachers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientType, selectedClass, selectedBoard])

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      setError('Please enter both title and message')
      return
    }

    if (selectedRecipients.length === 0) {
      setError('Please select at least one recipient')
      return
    }

    try {
      setSending(true)
      setError('')
      setSuccessMessage('')

      const response = await notificationAPI.sendNotification({
        recipientType,
        userIds: selectedRecipients,
        class: selectedClass || undefined,
        board: selectedBoard || undefined,
        title: notificationTitle.trim(),
        body: notificationBody.trim()
      })

      if (response.success) {
        setSuccessMessage(`Notification sent successfully to ${response.data?.successCount || selectedRecipients.length} ${recipientType}(s)`)
        setNotificationTitle('')
        setNotificationBody('')
        setSelectedRecipients([])
        // Refresh history after sending
        setTimeout(() => {
          fetchHistory()
        }, 1000)
      } else {
        setError(response.message || 'Failed to send notification')
      }
    } catch (err) {
      console.error('Error sending notification:', err)
      setError(err.message || 'Failed to send notification. Please try again.')
    } finally {
      setSending(false)
    }
  }

  // Get available classes for selected board
  const getAvailableClasses = () => {
    if (!selectedBoard) return []
    const classesForBoard = allClasses
      .filter(c => c.board === selectedBoard)
      .map(c => c.class)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a - b)
    return classesForBoard
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3">
        {/* Header */}
        <div className="pb-1 sm:pb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#1e3a5f]">Send Notifications</h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {successMessage}
          </div>
        )}

        {/* Main Content */}
        <div className="mt-2 sm:mt-3 space-y-3 sm:space-y-4">
          {/* Recipient Type Selection */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
            <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4">Select Recipients</h2>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setRecipientType('student')
                  setSelectedClass('')
                  setSelectedBoard('')
                }}
                className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${recipientType === 'student'
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#1e3a5f]/30'
                  }`}
              >
                Students
              </button>
              <button
                onClick={() => {
                  setRecipientType('teacher')
                  setSelectedClass('')
                  setSelectedBoard('')
                }}
                className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${recipientType === 'teacher'
                    ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#1e3a5f]/30'
                  }`}
              >
                Teachers
              </button>
            </div>
          </div>

          {/* Filters for Students */}
          {recipientType === 'student' && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
              <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4">Filter Students</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Board Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Board
                  </label>
                  <select
                    value={selectedBoard}
                    onChange={(e) => {
                      setSelectedBoard(e.target.value)
                      setSelectedClass('') // Reset class when board changes
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                  >
                    <option value="">All Boards</option>
                    {boards.map((board) => (
                      <option key={board} value={board}>
                        {board}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={!selectedBoard}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">All Classes</option>
                    {getAvailableClasses().map((classNum) => (
                      <option key={classNum} value={classNum}>
                        Class {classNum}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Recipients List */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-sm sm:text-base font-bold text-gray-800">
                  Recipients ({recipients.length})
                </h2>
                {recipients.length > 0 && (
                  <span className="text-xs sm:text-sm text-[#1e3a5f] font-semibold">
                    ({selectedRecipients.length} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {recipients.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs sm:text-sm text-[#1e3a5f] font-semibold hover:underline"
                  >
                    {selectedRecipients.length === recipients.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
                {loadingRecipients && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e3a5f]"></div>
                )}
              </div>
            </div>
            {loadingRecipients ? (
              <div className="text-center py-4">
                <p className="text-xs sm:text-sm text-gray-500">Loading recipients...</p>
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs sm:text-sm text-gray-500">
                  No {recipientType}s found matching the selected filters.
                </p>
              </div>
            ) : (
              <div className="max-h-60 sm:max-h-80 overflow-y-auto space-y-2">
                {recipients.map((recipient) => {
                  const isSelected = selectedRecipients.includes(recipient._id)
                  return (
                    <div
                      key={recipient._id}
                      onClick={() => handleRecipientToggle(recipient._id)}
                      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected
                          ? 'bg-blue-50 border-[#1e3a5f]'
                          : 'bg-gray-50 border-gray-200 hover:border-[#1e3a5f]/30'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRecipientToggle(recipient._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a5f] border-gray-300 rounded focus:ring-[#1e3a5f] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-semibold truncate ${isSelected ? 'text-[#1e3a5f]' : 'text-gray-900'
                          }`}>
                          {recipient.name}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notification Form */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
            <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4">Notification Details</h2>
            <div className="space-y-3 sm:space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Enter notification title"
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  placeholder="Enter notification message"
                  rows={4}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              disabled={sending}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendNotification}
              disabled={sending || !notificationTitle.trim() || !notificationBody.trim() || selectedRecipients.length === 0}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {sending ? 'Sending...' : `Send to ${selectedRecipients.length} ${recipientType}(s)`}
            </button>
          </div>

          {/* Notification History */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5 mt-4 sm:mt-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-sm sm:text-base font-bold text-[#1e3a5f]">Notification History</h2>
              <div className="flex items-center gap-2">
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                >
                  <option value="all">All</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                </select>
                {loadingHistory && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e3a5f]"></div>
                )}
              </div>
            </div>

            {loadingHistory ? (
              <div className="text-center py-8">
                <p className="text-xs sm:text-sm text-gray-500">Loading history...</p>
              </div>
            ) : notificationHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs sm:text-sm text-gray-500">No notification history found.</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
                {notificationHistory.map((group, groupIndex) => (
                  <div
                    key={groupIndex}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1">
                          {group.title}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-gray-600 mb-2">
                          {group.body}
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold ${group.recipientType === 'student'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                            }`}>
                            {group.recipientType === 'student' ? 'Students' : 'Teachers'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 sm:space-y-2.5 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                      {group.batches.map((batch, batchIndex) => (
                        <div
                          key={batchIndex}
                          className="flex items-center justify-between text-[10px] sm:text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">
                              {new Date(batch.sentAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <span className="font-semibold text-[#1e3a5f]">
                            {batch.recipientCount} {batch.recipientCount === 1 ? 'recipient' : 'recipients'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Notifications

