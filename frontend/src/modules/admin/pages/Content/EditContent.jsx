import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { contentAPI } from '../../services/api'

const EditContent = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [formData, setFormData] = useState({
    type: '',
    contentType: '',
    title: '',
    content: '',
    version: '1.0.0',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')

  // Determine content type from route or state
  useEffect(() => {
    const contentType = id || location.state?.content?.contentType
    if (!contentType) {
      navigate('/admin/content')
      return
    }

    const fetchContent = async () => {
      try {
        setIsFetching(true)
        setError('')
        
        let response
        if (contentType === 'about') {
          response = await contentAPI.aboutUs.getAll()
        } else if (contentType === 'privacy') {
          response = await contentAPI.privacy.getAll()
        } else if (contentType === 'terms') {
          response = await contentAPI.terms.getAll()
        } else {
          throw new Error('Invalid content type')
        }

        if (response.success && response.data?.items && response.data.items.length > 0) {
          const latestContent = response.data.items[0] // Get latest version
          setFormData({
            type: latestContent.title || (contentType === 'about' ? 'About Us' : contentType === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions'),
            contentType: contentType,
            title: latestContent.title || '',
            content: latestContent.content || '',
            version: latestContent.version || '1.0.0',
            _id: latestContent._id,
          })
        } else if (location.state?.content) {
          // Fallback to state if available
          setFormData({
            type: location.state.content.type || '',
            contentType: location.state.content.contentType || contentType,
            title: location.state.content.title || '',
            content: location.state.content.content || '',
            version: location.state.content.version || '1.0.0',
            _id: location.state.content._id,
          })
        } else {
          setError('Content not found')
        }
      } catch (err) {
        setError(err.message || 'Failed to load content')
        console.error('Error fetching content:', err)
      } finally {
        setIsFetching(false)
      }
    }

    fetchContent()
  }, [id, location.state, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!formData.contentType || !formData._id) {
        throw new Error('Invalid content data')
      }

      const updateData = {
        title: formData.title,
        content: formData.content,
        version: formData.version,
      }

      let response
      if (formData.contentType === 'about') {
        response = await contentAPI.aboutUs.update(formData._id, updateData)
      } else if (formData.contentType === 'privacy') {
        response = await contentAPI.privacy.update(formData._id, updateData)
      } else if (formData.contentType === 'terms') {
        response = await contentAPI.terms.update(formData._id, updateData)
      } else {
        throw new Error('Invalid content type')
      }

      if (response.success) {
        navigate('/admin/content')
      } else {
        setError(response.message || 'Failed to update content')
      }
    } catch (err) {
      setError(err.message || 'Failed to update content. Please try again.')
      console.error('Error updating content:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-dvision-blue"></div>
          <p className="mt-3 sm:mt-4 text-gray-500 text-sm sm:text-base">Loading content...</p>
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
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">Edit {formData.type}</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">Update the content information</p>
            </div>
            <button
              onClick={() => navigate('/admin/content')}
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm mb-4 sm:mb-5 md:mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6">
              <div>
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Content Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.type}
                  disabled
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                  placeholder="Enter title"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                  placeholder="1.0.0"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows="12"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                  placeholder="Enter content"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => navigate('/admin/content')}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base bg-dvision-blue hover:bg-dvision-blue-dark text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Content'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditContent
