import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { timetableAPI } from '../../services/api'

const EditTimeTable = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    thumbnail: '',
    topic: '',
    isActive: true,
  })
  const [timetable, setTimetable] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await timetableAPI.getById(id)
        if (response.success && response.data?.timetable) {
          const t = response.data.timetable
          setTimetable(t)
      setFormData({
            startTime: t.startTime || '',
            endTime: t.endTime || '',
            thumbnail: t.thumbnail || '',
            topic: t.topic || '',
            isActive: t.isActive !== undefined ? t.isActive : true,
      })
          if (t.thumbnail) {
            setImagePreview(t.thumbnail)
      }
    } else {
          setError('Timetable not found')
        }
      } catch (err) {
        console.error('Error fetching timetable:', err)
        setError(err.message || 'Failed to load timetable')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchTimetable()
    }
  }, [id])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
        setFormData({ ...formData, thumbnail: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    // Validate times
    if (formData.startTime >= formData.endTime) {
      setError('End time must be after start time')
      setIsSaving(false)
      return
    }

    const updateData = {
      startTime: formData.startTime,
      endTime: formData.endTime,
      thumbnail: formData.thumbnail || undefined,
      topic: formData.topic || undefined,
      isActive: formData.isActive,
    }
    
    try {
      const response = await timetableAPI.update(id, updateData)
      if (response.success) {
        navigate('/admin/timetable')
      } else {
        setError(response.message || 'Failed to update timetable')
      }
    } catch (err) {
      console.error('Error updating timetable:', err)
      setError(err.message || 'Failed to update timetable. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const getClassDisplay = (classItem) => {
    if (!classItem) return 'N/A'
    if (classItem.type === 'preparation') {
      return classItem.name
    }
    return `Class ${classItem.class} - ${classItem.board}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dvision-blue mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading timetable...</p>
        </div>
      </div>
    )
  }

  if (error && !timetable) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/timetable')}
            className="px-4 py-2 bg-dvision-blue text-white rounded-lg font-semibold"
          >
            Back to Timetable
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
                <div>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Edit Timetable</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Update timetable information</p>
              </div>
              <button
                onClick={() => navigate('/admin/timetable')}
              className="px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 flex items-center justify-center space-x-2 hover:bg-gray-50"
              >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm mb-3 sm:mb-4">
            {error}
                    </div>
                  )}

        {/* Form */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-5 md:p-6 lg:p-8">
            {/* Read-only Info Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-4">Timetable Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">Class</label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">{getClassDisplay(timetable?.classId)}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">Subject</label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">{timetable?.subjectId?.name || 'N/A'}</p>
              </div>
              <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">Teacher</label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">{timetable?.teacherId?.name || 'N/A'}</p>
              </div>
              <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">Day of Week</label>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">{timetable?.dayOfWeek || 'N/A'}</p>
              </div>
              </div>
              </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                {/* Start Time */}
              <div>
                  <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                />
              </div>

                {/* End Time */}
              <div>
                  <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                />
              </div>

                {/* Topic */}
              <div>
                  <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Topic
                </label>
                <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                    placeholder="Enter topic (optional)"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Thumbnail */}
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Thumbnail
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-lg sm:rounded-xl border-2 border-gray-200" />
                    ) : (
                      <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gray-100 rounded-lg sm:rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <svg className="w-8 h-8 sm:w-10 sm:w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <label className="flex-1 w-full sm:w-auto cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-dvision-blue text-dvision-blue rounded-lg sm:rounded-xl font-semibold hover:bg-dvision-blue-lightestBg transition-all duration-200 text-center text-xs sm:text-sm md:text-base">
                        {imagePreview ? 'Change Image' : 'Upload Thumbnail'}
                      </div>
                    </label>
                  </div>
              </div>
            </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin/timetable')}
                  className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                  disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base bg-dvision-blue hover:bg-dvision-blue-dark text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isSaving ? 'Updating...' : 'Update Timetable'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditTimeTable
