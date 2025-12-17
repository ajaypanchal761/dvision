import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bannerAPI } from '../../services/api'

const AddBanner = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 0,
    status: 'Active',
  })
  const [imagePreview, setImagePreview] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!imagePreview) {
        throw new Error('Please upload a banner image')
      }

      // Prepare data for backend
      const bannerData = {
        title: formData.title,
        description: formData.description || undefined,
        order: parseInt(formData.order) || 0,
        isActive: formData.status === 'Active',
        imageBase64: imagePreview,
      }

      const response = await bannerAPI.create(bannerData)
      
      if (response.success) {
        navigate('/admin/banners')
      } else {
        setError(response.message || 'Failed to create banner')
      }
    } catch (err) {
      setError(err.message || 'Failed to create banner. Please try again.')
      console.error('Error creating banner:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3">
        {/* Header */}
        <div className="pb-1 sm:pb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/admin/banners')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#1e3a5f]">Add New Banner</h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2 sm:mt-3">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="mt-2 sm:mt-3">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Banner Image <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-24 w-36 sm:h-28 sm:w-40 md:h-32 md:w-48 object-cover rounded-lg sm:rounded-xl border-2 border-gray-200" />
                  ) : (
                    <div className="h-24 w-36 sm:h-28 sm:w-40 md:h-32 md:w-48 bg-gray-100 rounded-lg sm:rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      disabled={isLoading}
                    />
                    <div className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold transition-all duration-200 text-center disabled:opacity-50">
                      {imagePreview ? 'Change Image' : 'Upload Image'}
                    </div>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                  placeholder="Enter banner title"
                  disabled={isLoading}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                  placeholder="Enter banner description"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                  disabled={isLoading}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/banners')}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Add Banner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddBanner
