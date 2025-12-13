import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { subjectAPI, classAPI } from '../../services/api'

const EditSubject = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    name: '',
    classId: '',
    isActive: true,
  })
  const [allClasses, setAllClasses] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState('')

  // Fetch all classes on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true)
        
        // Fetch all classes (both regular and preparation)
        const classesResponse = await classAPI.getAll()
        if (classesResponse.success && classesResponse.data?.classes) {
          // Filter only active classes
          const activeClasses = classesResponse.data.classes.filter(c => c.isActive)
          setAllClasses(activeClasses)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data. Please refresh the page.')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [])

  // Fetch subject data from backend
  useEffect(() => {
    const fetchSubjectData = async () => {
      if (!id) return

      try {
        setIsLoadingData(true)
        setError('')
        const response = await subjectAPI.getById(id)
        if (response.success && response.data?.subject) {
          const subject = response.data.subject
          setFormData({
            name: subject.name || '',
            classId: subject.classId?._id || subject.classId || '',
            isActive: subject.isActive !== undefined ? subject.isActive : true,
          })
        } else {
          setError('Subject not found')
          setTimeout(() => navigate('/admin/subjects'), 2000)
        }
      } catch (err) {
        console.error('Error fetching subject:', err)
        setError(err.message || 'Failed to load subject data')
        setTimeout(() => navigate('/admin/subjects'), 2000)
      } finally {
        setIsLoadingData(false)
      }
    }

    if (id) {
      fetchSubjectData()
    }
  }, [id, navigate])


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Prepare data for backend
    const subjectData = {
      name: formData.name.trim(),
      classId: formData.classId,
      isActive: formData.isActive,
    }

    console.log('Updating subject data:', subjectData)

    try {
      const response = await subjectAPI.update(id, subjectData)
      console.log('API Response:', response)

      if (response.success) {
        // Success - navigate to subjects list
        navigate('/admin/subjects')
      } else {
        setError(response.message || 'Failed to update subject')
      }
    } catch (err) {
      console.error('Error updating subject:', err)
      setError(err.message || 'Failed to update subject. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#1e3a5f] mx-auto mb-2 sm:mb-3"></div>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Loading subject data...</p>
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
              onClick={() => navigate('/admin/subjects')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#1e3a5f]">Edit Subject</h1>
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
                {/* Class Selection (Regular or Preparation) */}
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Class / Preparation Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                    disabled={isLoading || allClasses.length === 0}
                  >
                    <option value="">Select Class or Preparation Class</option>
                    {allClasses.map(cls => {
                      const displayName = cls.type === 'preparation' 
                        ? `${cls.name} (${cls.classCode})` 
                        : `Class ${cls.class} - ${cls.board} (${cls.classCode})`
                      return (
                        <option key={cls._id} value={cls._id}>{displayName}</option>
                      )
                    })}
                  </select>
                  {allClasses.length === 0 && (
                    <p className="text-[10px] text-red-500 mt-1">No classes available. Please create a class first.</p>
                  )}
                </div>

                {/* Subject Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                    placeholder="Enter subject name (e.g., Mathematics)"
                    disabled={isLoading}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
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
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/subjects')}
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
                {isLoading ? 'Updating...' : 'Update Subject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditSubject
