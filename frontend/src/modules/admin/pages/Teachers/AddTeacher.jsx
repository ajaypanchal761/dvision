import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { teacherAPI } from '../../services/api'

const AddTeacher = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    image: null,
    imagePreview: null,
    name: '',
    email: '',
    mobile: '',
    status: 'Active',
    subjects: ['', ''], // Max 2 subjects as text inputs
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image: file,
          imagePreview: reader.result,
        })
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
      // Filter out empty subject inputs and trim
      const processedSubjects = formData.subjects
        .filter(subject => subject && subject.trim().length > 0)
        .map(subject => subject.trim())

      if (processedSubjects.length > 2) {
        setError('Maximum 2 subjects can be assigned to a teacher')
        setIsLoading(false)
        return
      }

      const teacherData = {
        name: formData.name,
        phone: formData.mobile,
        email: formData.email || undefined,
        isActive: formData.status === 'Active',
        subjects: processedSubjects, // Array of subject strings
        classes: [],
        boards: [],
      }

      // Add image as base64 if provided
      if (formData.imagePreview) {
        teacherData.profileImageBase64 = formData.imagePreview
      }

      const response = await teacherAPI.create(teacherData)
      
      if (response.success) {
        navigate('/admin/teachers')
      } else {
        setError(response.message || 'Failed to create teacher')
      }
    } catch (err) {
      setError(err.message || 'Failed to create teacher. Please try again.')
      console.error('Error creating teacher:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return 'TE'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3">
        {/* Header */}
        <div className="pb-1 sm:pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/teachers')}
              className="p-1 text-[#1e3a5f] hover:text-[#2a4a6f] transition-all duration-200 flex items-center justify-center"
              title="Back"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-[#1e3a5f]">Add New Teacher</h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mt-2">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="mt-2 sm:mt-3">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Image Upload Section */}
            <div className="flex items-center justify-center py-2 sm:py-3">
              <div className="relative">
                {formData.imagePreview ? (
                  <img
                    src={formData.imagePreview}
                    alt="Preview"
                    className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 rounded-full object-cover border-4 border-[#1e3a5f] shadow-lg"
                  />
                ) : (
                  <div className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2a4a6f] flex items-center justify-center border-4 border-[#1e3a5f] shadow-lg">
                    <span className="text-white font-bold text-xl sm:text-2xl md:text-3xl">
                      {getInitials(formData.name)}
                    </span>
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-full p-2 sm:p-3 md:p-4 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-sm sm:text-base"
                  placeholder="Enter full name"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-sm sm:text-base"
                  placeholder="Enter email address"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Mobile <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-sm sm:text-base"
                  placeholder="Enter mobile number"
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-dvision-blue focus:border-dvision-blue outline-none transition-all duration-200 bg-white text-sm sm:text-base"
                  disabled={isLoading}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Assigned Subjects Section */}
            <div className="border-t-2 border-gray-100 pt-3 sm:pt-4">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                Assigned Subjects <span className="text-gray-500 text-xs">(Maximum 2 - Enter subject names)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {[0, 1].map((index) => (
                  <div key={index}>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5 sm:mb-2">
                      Subject {index + 1} {index === 0 && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.subjects[index] || ''}
                      onChange={(e) => {
                        const newSubjects = [...formData.subjects]
                        newSubjects[index] = e.target.value
                        setFormData({ ...formData, subjects: newSubjects })
                      }}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 text-sm sm:text-base"
                      placeholder={`Enter subject ${index + 1} name`}
                      disabled={isLoading}
                      required={index === 0} // First subject is required
                      maxLength={100}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter subject names directly. These are independent of the Subjects module.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t-2 border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/admin/teachers')}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Add Teacher'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddTeacher
