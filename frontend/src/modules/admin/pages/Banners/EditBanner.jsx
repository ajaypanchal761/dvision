import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { bannerAPI } from '../../services/api'

const EditBanner = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    order: 0,
    status: 'Active',
  })
  const [imagePreview, setImagePreview] = useState('')
  const [newImageSelected, setNewImageSelected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')

  // Fetch banner data from backend
  useEffect(() => {
    const fetchBanner = async () => {
      try {
        setIsFetching(true)
        setError('')
        const response = await bannerAPI.getById(id)
        if (response.success && response.data?.banner) {
          const banner = response.data.banner
          setFormData({
            title: banner.title || '',
            description: banner.description || '',
            link: banner.link || '',
            order: banner.order || 0,
            status: banner.isActive ? 'Active' : 'Inactive',
          })
          setImagePreview(banner.image || '')
        } else {
          setError('Banner not found')
          setTimeout(() => navigate('/admin/banners'), 2000)
        }
      } catch (err) {
        setError(err.message || 'Failed to load banner')
        console.error('Error fetching banner:', err)
        setTimeout(() => navigate('/admin/banners'), 2000)
      } finally {
        setIsFetching(false)
      }
    }

    if (id) {
      fetchBanner()
    }
  }, [id, navigate])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
        setNewImageSelected(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Prepare data for backend
      const bannerData = {
        title: formData.title,
        description: formData.description || undefined,
        link: formData.link || undefined,
        order: parseInt(formData.order) || 0,
        isActive: formData.status === 'Active',
      }

      // Add image as base64 if new image is selected
      if (newImageSelected && imagePreview) {
        bannerData.imageBase64 = imagePreview
      }

      const response = await bannerAPI.update(id, bannerData)
      
      if (response.success) {
        navigate('/admin/banners')
      } else {
        setError(response.message || 'Failed to update banner')
      }
    } catch (err) {
      setError(err.message || 'Failed to update banner. Please try again.')
      console.error('Error updating banner:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-dvision-blue-lightestBg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-dvision-blue"></div>
          <p className="mt-4 text-gray-500">Loading banner data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-dvision-blue-lightestBg">
      <div className="max-w-5xl mx-auto py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-dvision-blue to-dvision-blue-dark px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Edit Banner</h2>
                  <p className="text-blue-100 mt-1 text-sm">Update the banner information</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/banners')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 backdrop-blur-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Banner Image
                </label>
                <div className="flex items-center space-x-4">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-32 w-48 object-cover rounded-xl border-2 border-gray-200" />
                  ) : (
                    <div className="h-32 w-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                    <div className="px-6 py-3 border-2 border-dvision-blue text-dvision-blue rounded-xl font-semibold hover:bg-dvision-blue-lightestBg transition-all duration-200 text-center disabled:opacity-50">
                      {imagePreview ? 'Change Image' : 'Upload Image'}
                    </div>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                  placeholder="Enter banner title"
                  disabled={isLoading}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                  placeholder="Enter banner description"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Link (Optional)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                  placeholder="https://example.com"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200"
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white"
                  disabled={isLoading}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/admin/banners')}
                disabled={isLoading}
                className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3 bg-gradient-to-r from-dvision-blue to-dvision-blue-dark hover:from-dvision-blue-dark hover:to-dvision-blue text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
              >
                {isLoading ? 'Updating...' : 'Update Banner'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditBanner
