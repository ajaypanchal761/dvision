import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { contentAPI } from '../../services/api'

const Content = () => {
  const navigate = useNavigate()
  const [contents, setContents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch content from backend
  const fetchContent = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Fetch all three content types
      const [aboutRes, privacyRes, termsRes] = await Promise.all([
        contentAPI.aboutUs.getAll().catch(() => ({ success: false })),
        contentAPI.privacy.getAll().catch(() => ({ success: false })),
        contentAPI.terms.getAll().catch(() => ({ success: false }))
      ])

      const contentItems = []

      // About Us
      if (aboutRes.success && aboutRes.data) {
        const aboutItems = Array.isArray(aboutRes.data.items) ? aboutRes.data.items : (aboutRes.data.aboutUs ? [aboutRes.data.aboutUs] : [])
        const latestAbout = aboutItems[0] // Get latest version
        if (latestAbout) {
          contentItems.push({
            _id: latestAbout._id,
            id: latestAbout._id,
            type: 'About Us',
            title: latestAbout.title || 'About Us',
            content: latestAbout.content || '',
            version: latestAbout.version || '1.0.0',
            createDateTime: latestAbout.createdAt ? new Date(latestAbout.createdAt).toLocaleString() : '',
            contentType: 'about'
          })
        }
      }

      // Privacy Policy
      if (privacyRes.success && privacyRes.data) {
        const privacyItems = Array.isArray(privacyRes.data.items) ? privacyRes.data.items : (privacyRes.data.privacy ? [privacyRes.data.privacy] : [])
        const latestPrivacy = privacyItems[0]
        if (latestPrivacy) {
          contentItems.push({
            _id: latestPrivacy._id,
            id: latestPrivacy._id,
            type: 'Privacy Policy',
            title: latestPrivacy.title || 'Privacy Policy',
            content: latestPrivacy.content || '',
            version: latestPrivacy.version || '1.0.0',
            createDateTime: latestPrivacy.createdAt ? new Date(latestPrivacy.createdAt).toLocaleString() : '',
            contentType: 'privacy'
          })
        }
      }

      // Terms & Conditions
      if (termsRes.success && termsRes.data) {
        const termsItems = Array.isArray(termsRes.data.items) ? termsRes.data.items : (termsRes.data.terms ? [termsRes.data.terms] : [])
        const latestTerms = termsItems[0]
        if (latestTerms) {
          contentItems.push({
            _id: latestTerms._id,
            id: latestTerms._id,
            type: 'Terms and Conditions',
            title: latestTerms.title || 'Terms and Conditions',
            content: latestTerms.content || '',
            version: latestTerms.version || '1.0.0',
            createDateTime: latestTerms.createdAt ? new Date(latestTerms.createdAt).toLocaleString() : '',
            contentType: 'terms'
          })
        }
      }

      setContents(contentItems)
    } catch (err) {
      setError(err.message || 'Failed to load content')
      console.error('Error fetching content:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [])

  const handleEdit = (content) => {
    navigate(`/admin/content/edit/${content.contentType}`, { state: { content } })
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Manage Content</h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1">Manage About Us, Privacy Policy, and Terms & Conditions</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sm:p-8 md:p-10 text-center mt-3 sm:mt-4 md:mt-5 lg:mt-6">
            <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#1e3a5f]"></div>
            <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading content...</p>
          </div>
        ) : (
          <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {contents.map((content) => (
                <div key={content._id || content.id} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-3 sm:p-4 md:p-5">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">{content.type}</h3>
                      <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-blue-50 text-[#1e3a5f]">
                        v{content.version}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mb-2 sm:mb-3 line-clamp-3">
                      {content.content.substring(0, 150)}...
                    </p>
                    <div className="text-[10px] sm:text-xs text-gray-500 mb-2 sm:mb-3">
                      Last updated: {content.createDateTime}
                    </div>
                    <button
                      onClick={() => handleEdit(content)}
                      className="w-full px-3 sm:px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Edit Content
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Content
