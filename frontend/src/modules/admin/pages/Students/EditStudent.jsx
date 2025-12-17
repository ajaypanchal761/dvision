import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'
import { studentAPI, classAPI, subscriptionPlanAPI } from '../../services/api'

const EditStudent = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    image: null,
    imagePreview: null,
    name: '',
    email: '',
    mobile: '',
    class: '',
    board: 'CBSE',
    status: 'Active',
    subscriptionStatus: 'none',
    selectedPlanId: '',
    prepPlanIds: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')
  const [boards, setBoards] = useState([])
  const [availableClasses, setAvailableClasses] = useState([])
  const [allClassesData, setAllClassesData] = useState([])
  const [prepClassesMap, setPrepClassesMap] = useState({})
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [existingStudents, setExistingStudents] = useState([])
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [prepPlans, setPrepPlans] = useState([])
  const [loadingPrepPlans, setLoadingPrepPlans] = useState(false)

  // Popular country codes
  const countryCodes = [
    { code: '+91', country: 'India', countryCode: 'IN', flag: '🇮🇳' },
    { code: '+1', country: 'USA', countryCode: 'US', flag: '🇺🇸' },
    { code: '+44', country: 'UK', countryCode: 'GB', flag: '🇬🇧' },
    { code: '+61', country: 'Australia', countryCode: 'AU', flag: '🇦🇺' },
    { code: '+971', country: 'UAE', countryCode: 'AE', flag: '🇦🇪' },
  ]

  // Extract country code from phone number
  const extractCountryCode = (phone) => {
    if (!phone) return { code: '+91', number: '' }
    
    for (const country of countryCodes) {
      if (phone.startsWith(country.code)) {
        return {
          code: country.code,
          number: phone.substring(country.code.length)
        }
      }
    }
    // Default to +91 if no match
    return { code: '+91', number: phone }
  }

  // Fetch classes and existing students from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingClasses(true)
        
        // Fetch classes
        const classesResponse = await classAPI.getAll()
        if (classesResponse.success && classesResponse.data?.classes) {
          const classesData = classesResponse.data.classes.filter(c => c.isActive)
          
          // Store all classes data for filtering
          setAllClassesData(classesData)

          // Prep classes map for display (for prep plans)
          const prepMap = {}
          classesData.filter(c => c.type === 'preparation').forEach(c => {
            prepMap[c._id] = c.name || c.classCode || 'Preparation Class'
          })
          setPrepClassesMap(prepMap)
          
          // Extract unique boards (regular only) and sort them
          const uniqueBoards = [...new Set(classesData.filter(c => c.type === 'regular').map(c => c.board))]
            .filter(Boolean)
            .sort()
          
          setBoards(uniqueBoards)
        }

        // Fetch existing students to check for duplicates
        const studentsResponse = await studentAPI.getAll()
        if (studentsResponse.success && studentsResponse.data?.students) {
          const students = studentsResponse.data.students
            .filter(s => s._id !== id) // Exclude current student
            .map(s => s.phone || '')
            .filter(Boolean)
          setExistingStudents(students)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // Fallback to empty arrays if API fails
        setBoards([])
      } finally {
        setLoadingClasses(false)
      }
    }

    fetchData()
  }, [id])

  // When board is selected, filter classes for that board
  useEffect(() => {
    if (!formData.board) {
      setAvailableClasses([])
      return
    }

    // Filter classes by selected board (regular only)
    const classesForBoard = allClassesData
      .filter(c => c.board === formData.board && c.type === 'regular')
      .map(c => c.class)
      .sort((a, b) => a - b)

    setAvailableClasses(classesForBoard)

    // Reset class if current class is not available for selected board
    if (formData.class) {
      const currentClassNum = parseInt(formData.class)
      if (!classesForBoard.includes(currentClassNum)) {
        setFormData(prev => ({ ...prev, class: '' }))
      }
    }
  }, [formData.board, allClassesData])

  // Fetch subscription plans when subscription status is active and class/board are selected
  useEffect(() => {
    const fetchPlans = async () => {
      if (formData.subscriptionStatus === 'active' && formData.class && formData.board) {
        try {
          setLoadingPlans(true)
          const classNumber = parseInt(formData.class)
          const response = await subscriptionPlanAPI.getAll({
            class: classNumber,
            board: formData.board,
            isActive: true,
            type: 'regular' // Only get regular plans for students
          })
          if (response.success && (response.data?.plans || response.data?.subscriptionPlans)) {
            const plans = response.data.plans || response.data.subscriptionPlans || []
            setSubscriptionPlans(plans)
          } else {
            setSubscriptionPlans([])
          }
        } catch (error) {
          console.error('Error fetching subscription plans:', error)
          setSubscriptionPlans([])
        } finally {
          setLoadingPlans(false)
        }
      } else {
        setSubscriptionPlans([])
        if (formData.subscriptionStatus === 'none') {
          setFormData(prev => ({ ...prev, selectedPlanId: '' }))
        }
      }
    }

    fetchPlans()
  }, [formData.subscriptionStatus, formData.class, formData.board])

  // Fetch preparation plans (available globally)
  useEffect(() => {
    const fetchPrepPlans = async () => {
      try {
        setLoadingPrepPlans(true)
        const response = await subscriptionPlanAPI.getAll({
          type: 'preparation',
          isActive: true
        })
        if (response.success && (response.data?.plans || response.data?.subscriptionPlans)) {
          const plans = response.data.plans || response.data.subscriptionPlans || []
          setPrepPlans(plans)
        } else {
          setPrepPlans([])
        }
      } catch (error) {
        console.error('Error fetching preparation plans:', error)
        setPrepPlans([])
      } finally {
        setLoadingPrepPlans(false)
      }
    }

    fetchPrepPlans()
  }, [])

  // Fetch student data from backend
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setIsFetching(true)
        setError('')
        const response = await studentAPI.getById(id)
        if (response.success && response.data?.student) {
          const student = response.data.student
          
          // Extract country code and phone number
          const { code, number } = extractCountryCode(student.phone || '')
          
          setSelectedCountryCode(code)
          // Check if student has active regular subscription
          const hasActiveSubscription = student.subscription && student.subscription.status === 'active' && student.subscription.planId
          const subscriptionStatus = hasActiveSubscription ? 'active' : 'none'
          const selectedPlanId = hasActiveSubscription && student.subscription.planId ? student.subscription.planId.toString() : ''

          // Prep plan IDs from activeSubscriptions
          const prepPlanIds = Array.isArray(student.activeSubscriptions)
            ? student.activeSubscriptions.filter(sub => sub.type === 'preparation').map(sub => sub.planId?.toString()).filter(Boolean)
            : []

          setFormData({
            name: student.name || '',
            email: student.email || '',
            mobile: number,
            class: student.class ? String(student.class) : '',
            board: student.board || '',
            status: student.isActive ? 'Active' : 'Inactive',
            imagePreview: student.profileImage || null,
            subscriptionStatus,
            selectedPlanId,
            prepPlanIds,
          })
        } else {
          setError('Student not found')
          setTimeout(() => navigate('/admin/students'), 2000)
        }
      } catch (err) {
        setError(err.message || 'Failed to load student')
        console.error('Error fetching student:', err)
        setTimeout(() => navigate('/admin/students'), 2000)
      } finally {
        setIsFetching(false)
      }
    }

    if (id) {
      fetchStudent()
    }
  }, [id, navigate])

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
      // Validate phone number
      const phoneNumber = formData.mobile.replace(/\D/g, '')
      
      if (!phoneNumber || phoneNumber.length < 10) {
        setError('Please enter a valid mobile number (minimum 10 digits)')
        setIsLoading(false)
        return
      }

      if (phoneNumber.length > 15) {
        setError('Mobile number cannot exceed 15 digits')
        setIsLoading(false)
        return
      }

      // Combine country code with phone number
      const fullPhone = `${selectedCountryCode}${phoneNumber}`

      // Check for duplicate phone number (excluding current student)
      if (existingStudents.includes(fullPhone)) {
        setError('This mobile number is already registered. Please use a different number.')
        setIsLoading(false)
        return
      }

      // Parse class number
      const classNumber = parseInt(formData.class)
      
      if (isNaN(classNumber) || !availableClasses.includes(classNumber)) {
        throw new Error('Please select a valid class for the selected board')
      }

      // Prepare data for backend
      const studentData = {
        name: formData.name.trim(),
        phone: fullPhone, // Store with country code
        email: formData.email ? formData.email.trim() : '',
        class: classNumber,
        board: formData.board.trim(),
        isActive: formData.status === 'Active',
      }

      // Add subscription plan if active subscription is selected
      if (formData.subscriptionStatus === 'active' && formData.selectedPlanId) {
        studentData.subscriptionPlanId = formData.selectedPlanId
      } else if (formData.subscriptionStatus === 'none') {
        // If changing to none, we might need to handle subscription removal
        studentData.removeSubscription = true
      }

      // Add preparation plans (multiple) if selected
      if (formData.prepPlanIds && formData.prepPlanIds.length > 0) {
        studentData.preparationPlanIds = formData.prepPlanIds
      }

      // Add image as base64 if new image is provided
      if (formData.imagePreview && formData.image) {
        studentData.profileImageBase64 = formData.imagePreview
      }

      const response = await studentAPI.update(id, studentData)
      
      if (response.success) {
        navigate('/admin/students')
      } else {
        setError(response.message || 'Failed to update student')
      }
    } catch (err) {
      setError(err.message || 'Failed to update student. Please try again.')
      console.error('Error updating student:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return 'ST'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isFetching) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#1e3a5f]"></div>
          <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading student data...</p>
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
              onClick={() => navigate('/admin/students')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#1e3a5f]">Edit Student</h1>
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
            {/* Image Upload Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-center py-2 sm:py-3">
                <div className="relative">
                  {formData.imagePreview ? (
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-[#1e3a5f] shadow-lg"
                    />
                  ) : (
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-linear-to-br from-[#1e3a5f] to-[#2a4a6f] flex items-center justify-center border-4 border-[#1e3a5f] shadow-lg">
                      <span className="text-white font-bold text-lg sm:text-xl">
                        {getInitials(formData.name)}
                      </span>
                    </div>
                  )}
                <label className="absolute bottom-0 right-0 bg-linear-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-full p-2 sm:p-2.5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5">
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
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
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
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                    placeholder="Enter email address"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Mobile <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-stretch">
                    {/* Country Code Dropdown */}
                  <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-l-lg border-2 border-r-0 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-xs sm:text-sm"
                      >
                        <span className="text-gray-700 font-medium whitespace-nowrap">
                          {selectedCountryCode}
                        </span>
                        <FiChevronDown className="text-gray-500 text-xs shrink-0" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {showCountryDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowCountryDropdown(false)}
                          />
                          <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-2xl z-20 max-h-60 overflow-y-auto w-56">
                            {countryCodes.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountryCode(country.code)
                                  setShowCountryDropdown(false)
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-xs ${
                                  selectedCountryCode === country.code ? 'bg-[#1e3a5f]/10' : ''
                                }`}
                              >
                                <span className="text-gray-700 font-bold w-8">
                                  {country.countryCode}
                                </span>
                                <span className="text-gray-700 font-medium">
                                  {country.code}
                                </span>
                                <span className="text-gray-500 text-[10px] ml-auto">
                                  {country.country}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Mobile Number Input */}
                    <input
                      type="tel"
                      required
                      value={formData.mobile}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 15)
                        setFormData({ ...formData, mobile: value })
                      }}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                      inputMode="numeric"
                      className="flex-1 pl-3 pr-3 py-2 rounded-r-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 focus:bg-white transition-all text-xs sm:text-sm text-gray-700 placeholder:text-gray-400"
                      placeholder="Enter mobile number"
                      disabled={isLoading}
                    />
                  </div>
                  {formData.mobile && formData.mobile.length < 10 && (
                    <p className="text-[10px] text-red-500 mt-1">Mobile number must be at least 10 digits</p>
                  )}
                  {formData.mobile && formData.mobile.length > 15 && (
                    <p className="text-[10px] text-red-500 mt-1">Mobile number cannot exceed 15 digits</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Board <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.board}
                    onChange={(e) => {
                      setFormData({ ...formData, board: e.target.value, class: '' })
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                    disabled={isLoading || loadingClasses}
                  >
                    <option value="">Select Board</option>
                    {boards.map(board => (
                      <option key={board} value={board}>{board}</option>
                    ))}
                  </select>
                  {loadingClasses && (
                    <p className="text-[10px] text-gray-500 mt-1">Loading boards...</p>
                  )}
                  {!loadingClasses && boards.length === 0 && (
                    <p className="text-[10px] text-red-500 mt-1">No boards available. Please create classes first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                    disabled={isLoading || !formData.board || availableClasses.length === 0}
                  >
                    <option value="">{formData.board ? 'Select Class' : 'Select Board First'}</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                  {formData.board && availableClasses.length === 0 && !loadingClasses && (
                    <p className="text-[10px] text-red-500 mt-1">No classes available for {formData.board}. Please create a class-board combination first.</p>
                  )}
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

                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-0.5 sm:mb-1">
                    Subscription Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.subscriptionStatus}
                    onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value, selectedPlanId: '' })}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white text-[10px] sm:text-xs"
                    disabled={isLoading}
                  >
                    <option value="none">None</option>
                    <option value="active">Active</option>
                  </select>
                </div>

                {formData.subscriptionStatus === 'active' && (
                  <div className="md:col-span-2">
                    <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-0.5 sm:mb-1">
                      Subscription Plan {!formData.class || !formData.board ? '(Select Class & Board First)' : ''}
                    </label>
                    <select
                      value={formData.selectedPlanId}
                      onChange={(e) => setFormData({ ...formData, selectedPlanId: e.target.value })}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white text-[10px] sm:text-xs"
                      disabled={isLoading || !formData.class || !formData.board || loadingPlans}
                    >
                      <option value="">
                        {loadingPlans ? 'Loading plans...' : !formData.class || !formData.board ? 'Select Class & Board First' : subscriptionPlans.length === 0 ? 'No plans available' : 'Select Subscription Plan'}
                      </option>
                      {subscriptionPlans.map(plan => (
                        <option key={plan._id} value={plan._id}>
                          {plan.name} - ₹{plan.price} ({plan.duration})
                        </option>
                      ))}
                    </select>
                    {formData.class && formData.board && subscriptionPlans.length === 0 && !loadingPlans && (
                      <p className="text-[9px] text-gray-500 mt-0.5">No subscription plans available for Class {formData.class} - {formData.board}</p>
                    )}
                  </div>
                )}
              </div>

            {/* Preparation subscriptions */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <label className="block text-[11px] sm:text-sm font-semibold text-gray-700 mb-1">
                Preparation Subscriptions (optional)
              </label>
              <p className="text-[10px] sm:text-xs text-gray-500 mb-2">Assign one or more preparation plans in addition to the regular plan.</p>
              <select
                multiple
                value={formData.prepPlanIds}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions).map(opt => opt.value)
                  setFormData(prev => ({ ...prev, prepPlanIds: options }))
                }}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white text-sm sm:text-base min-h-[140px]"
                disabled={isLoading || loadingPrepPlans}
              >
                {loadingPrepPlans && <option>Loading preparation plans...</option>}
                {!loadingPrepPlans && prepPlans.length === 0 && <option disabled>No preparation plans available</option>}
                {!loadingPrepPlans && prepPlans.map(plan => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} - ₹{plan.price} ({plan.duration}) — {prepClassesMap[plan.classId] || 'Prep Class'}
                  </option>
                ))}
              </select>
            </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/students')}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-xs sm:text-sm bg-linear-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Student'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditStudent
