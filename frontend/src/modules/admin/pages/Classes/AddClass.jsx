import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { classAPI } from '../../services/api'

const AddClass = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    type: 'regular',
    class: '',
    board: '',
    name: '',
    description: '',
    classCode: '',
    isActive: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  const boards = ['RBSE', 'CBSE']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Prepare data for backend
    const classData = {
      type: formData.type,
      classCode: formData.classCode.trim().toUpperCase(),
      isActive: formData.isActive,
    }

    if (formData.type === 'regular') {
      classData.class = parseInt(formData.class)
      classData.board = formData.board.trim()
    } else {
      classData.name = formData.name.trim()
      if (formData.description) {
        classData.description = formData.description.trim()
      }
    }

    console.log('Submitting class data:', classData)

    try {
      const response = await classAPI.create(classData)
      console.log('API Response:', response)

      if (response.success) {
        // Success - navigate to classes list
        navigate('/admin/classes')
      } else {
        setError(response.message || 'Failed to create class')
      }
    } catch (err) {
      console.error('Error creating class:', err)
      setError(err.message || 'Failed to create class. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 md:pt-5 lg:pt-6">
        {/* Header */}
        <div className="pb-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <button
              onClick={() => navigate('/admin/classes')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors p-1"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-[#1e3a5f]">Add New Class</h1>
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
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Type Selection */}
              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Class Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    type: e.target.value,
                    class: '',
                    board: '',
                    name: '',
                    description: ''
                  })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                  disabled={isLoading}
                >
                  <option value="regular">Regular Class (Board-based)</option>
                  <option value="preparation">Preparation Class (NDA, NEET, JEE, etc.)</option>
                </select>
              </div>

              {formData.type === 'regular' ? (
                <>
                  {/* Class Selection */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value, board: '' })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                      disabled={isLoading}
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Board Selection */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Board <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.board}
                      onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                      disabled={isLoading}
                    >
                      <option value="">Select Board</option>
                      {boards.map(board => (
                        <option key={board} value={board}>{board}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* Preparation Class Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Preparation Class Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                      placeholder="e.g., NDA Special, NEET Prep, JEE Advanced"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                      Description <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                      placeholder="Enter description for this preparation class"
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}

              {/* Class Code */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Class Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.classCode}
                  onChange={(e) => setFormData({ ...formData, classCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 font-mono bg-gray-50 placeholder:text-xs"
                  placeholder="Enter class code (e.g., CLASS12CBSE)"
                  disabled={isLoading}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.isActive ? 'Active' : 'Inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'Active' })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                  disabled={isLoading}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/classes')}
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
                {isLoading ? 'Creating...' : 'Add Class'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddClass

