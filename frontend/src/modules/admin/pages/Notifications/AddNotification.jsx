import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { notificationAPI, classAPI } from '../../services/api'

const AddNotification = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [notificationType, setNotificationType] = useState('students') // 'students', 'teachers', 'both', 'class'
  const [selectedClass, setSelectedClass] = useState('')
  const [allClasses, setAllClasses] = useState([])
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationBody, setNotificationBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await classAPI.getAll({ limit: 1000 }) // Get all classes
        if (response.success && response.data?.classes) {
          const activeClasses = response.data.classes.filter(c => c.isActive)
          setAllClasses(activeClasses)
        }
      } catch (err) {
        console.error('Error fetching classes:', err)
      }
    }
    fetchClasses()
  }, [])

  // Fetch campaign data if in edit mode
  useEffect(() => {
    if (isEditMode && id && allClasses.length > 0) {
      const fetchCampaign = async () => {
        try {
          setLoading(true)
          const response = await notificationAPI.getCampaign(id)
          if (response.success && response.data?.campaign) {
            const campaign = response.data.campaign
            setNotificationTitle(campaign.title)
            setNotificationBody(campaign.body)
            // Handle both old and new format
            if (campaign.notificationType) {
              setNotificationType(campaign.notificationType)
            } else if (campaign.recipientTypes) {
              // Old format - convert to new
              if (campaign.recipientTypes.includes('student') && campaign.recipientTypes.includes('teacher')) {
                setNotificationType('both')
              } else if (campaign.recipientTypes.includes('student')) {
                setNotificationType('students')
              } else {
                setNotificationType('teachers')
              }
            } else if (campaign.recipientType) {
              setNotificationType(campaign.recipientType === 'student' ? 'students' : 'teachers')
            }
            if (campaign.classId) {
              setSelectedClass(campaign.classId.toString())
            } else if (campaign.classNumber) {
              // Backward compatibility: if classNumber exists, try to find matching class
              const matchingClass = allClasses.find(c => 
                c.type === 'regular' && c.class === campaign.classNumber
              )
              if (matchingClass) {
                setSelectedClass(matchingClass._id.toString())
              } else {
                setSelectedClass(campaign.classNumber.toString())
              }
            } else if (campaign.filters?.class) {
              setSelectedClass(campaign.filters.class.toString())
            }
          }
        } catch (err) {
          console.error('Error fetching campaign:', err)
          setError('Failed to load notification. Please try again.')
        } finally {
          setLoading(false)
        }
      }
      fetchCampaign()
    }
  }, [isEditMode, id, allClasses])

  const handleSubmit = async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) {
      setError('Please enter both title and message')
      return
    }

    if (notificationType === 'class' && !selectedClass) {
      setError('Please select a class for class-based notifications')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const campaignData = {
        title: notificationTitle.trim(),
        body: notificationBody.trim(),
        notificationType,
        classId: notificationType === 'class' ? selectedClass : null,
        classNumber: null // Keep for backward compatibility but prefer classId
      }

      let response
      if (isEditMode) {
        response = await notificationAPI.updateCampaign(id, campaignData)
      } else {
        response = await notificationAPI.createCampaign(campaignData)
      }

      if (response.success) {
        alert(isEditMode ? 'Notification updated successfully!' : 'Notification created successfully!')
        navigate('/admin/notifications')
      } else {
        setError(response.message || 'Failed to save notification')
      }
    } catch (err) {
      console.error('Error saving notification:', err)
      setError(err.message || 'Failed to save notification. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f] mx-auto"></div>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3">
        {/* Header */}
        <div className="pb-1 sm:pb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/admin/notifications')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#1e3a5f]">
              {isEditMode ? 'Edit Notification' : 'Add Notification'}
            </h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="mt-2 sm:mt-3 space-y-3 sm:space-y-4">
          {/* Notification Type Selection */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
            <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4">Select Notification Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                notificationType === 'students'
                  ? 'border-[#1e3a5f] bg-blue-50'
                  : 'border-gray-200 hover:border-[#1e3a5f]/30'
              }`}>
                <input
                  type="radio"
                  name="notificationType"
                  value="students"
                  checked={notificationType === 'students'}
                  onChange={(e) => {
                    setNotificationType(e.target.value)
                    setSelectedClass('')
                  }}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a5f] border-gray-300 focus:ring-[#1e3a5f]"
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-700">All Students</span>
              </label>
              <label className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                notificationType === 'teachers'
                  ? 'border-[#1e3a5f] bg-blue-50'
                  : 'border-gray-200 hover:border-[#1e3a5f]/30'
              }`}>
                <input
                  type="radio"
                  name="notificationType"
                  value="teachers"
                  checked={notificationType === 'teachers'}
                  onChange={(e) => {
                    setNotificationType(e.target.value)
                    setSelectedClass('')
                  }}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a5f] border-gray-300 focus:ring-[#1e3a5f]"
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-700">All Teachers</span>
              </label>
              <label className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                notificationType === 'both'
                  ? 'border-[#1e3a5f] bg-blue-50'
                  : 'border-gray-200 hover:border-[#1e3a5f]/30'
              }`}>
                <input
                  type="radio"
                  name="notificationType"
                  value="both"
                  checked={notificationType === 'both'}
                  onChange={(e) => {
                    setNotificationType(e.target.value)
                    setSelectedClass('')
                  }}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a5f] border-gray-300 focus:ring-[#1e3a5f]"
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Both (Students + Teachers)</span>
              </label>
              <label className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                notificationType === 'class'
                  ? 'border-[#1e3a5f] bg-blue-50'
                  : 'border-gray-200 hover:border-[#1e3a5f]/30'
              }`}>
                <input
                  type="radio"
                  name="notificationType"
                  value="class"
                  checked={notificationType === 'class'}
                  onChange={(e) => setNotificationType(e.target.value)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a5f] border-gray-300 focus:ring-[#1e3a5f]"
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Class Based</span>
              </label>
            </div>
          </div>

          {/* Class Selection for Class-based */}
          {notificationType === 'class' && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
              <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4">Select Class</h2>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                >
                  <option value="">Select Class</option>
                  {allClasses.map((classItem) => {
                    // Display name for regular classes: "Class 10 - RBSE" or "Class 10" if no board
                    // Display name for preparation classes: "JEE Preparation" or the name field
                    const displayName = classItem.type === 'regular' 
                      ? (classItem.board ? `Class ${classItem.class} - ${classItem.board}` : `Class ${classItem.class}`)
                      : (classItem.name || classItem.classCode || 'Preparation Class')
                    return (
                      <option key={classItem._id} value={classItem._id}>
                        {displayName}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Notification Form */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
            <h2 className="text-sm sm:text-base font-bold text-gray-800 mb-3 sm:mb-4">Notification Details</h2>
            <div className="space-y-3 sm:space-y-4">
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

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/notifications')}
              disabled={submitting}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !notificationTitle.trim() || !notificationBody.trim() || (notificationType === 'class' && !selectedClass)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (isEditMode ? 'Update Notification' : 'Create Notification')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddNotification
