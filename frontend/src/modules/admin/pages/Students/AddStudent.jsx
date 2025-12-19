import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'
import { studentAPI, classAPI, subscriptionPlanAPI } from '../../services/api'

const AddStudent = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    image: null,
    imagePreview: null,
    name: '',
    email: '',
    mobile: '',
    class: '',
    board: '',
    status: 'Active',
    subscriptionStatus: 'none',
    selectedPlanId: '',
    prepSubscriptions: {} // { classId: planId } - one subscription per preparation class
  })
  const [isLoading, setIsLoading] = useState(false)
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
  const [prepPlans, setPrepPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingPrepPlans, setLoadingPrepPlans] = useState(false)
  const [preparationClasses, setPreparationClasses] = useState([])
  const [prepPlansByClass, setPrepPlansByClass] = useState({}) // { classId: [plans] }

  // Popular country codes
  const countryCodes = [
    { code: '+91', country: 'India', countryCode: 'IN', flag: '🇮🇳' },
    { code: '+1', country: 'USA', countryCode: 'US', flag: '🇺🇸' },
    { code: '+44', country: 'UK', countryCode: 'GB', flag: '🇬🇧' },
    { code: '+61', country: 'Australia', countryCode: 'AU', flag: '🇦🇺' },
    { code: '+971', country: 'UAE', countryCode: 'AE', flag: '🇦🇪' },
  ]

  // Fetch classes and existing students from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingClasses(true)

        // Fetch all classes without pagination
        const classesResponse = await classAPI.getAllWithoutPagination({ isActive: true })
        if (classesResponse.success && classesResponse.data?.classes) {
          const classesData = classesResponse.data.classes

          // Store all classes data for filtering
          setAllClassesData(classesData)

          // Prep classes map for display (for preparation plans)
          const prepMap = {}
          classesData.filter(c => c.type === 'preparation').forEach(c => {
            prepMap[c._id] = c.name || c.classCode || 'Preparation Class'
          })
          setPrepClassesMap(prepMap)

          // Extract unique boards and sort them (regular only)
          const uniqueBoards = [...new Set(classesData.filter(c => c.type === 'regular').map(c => c.board))]
            .filter(Boolean)
            .sort()

          setBoards(uniqueBoards)
        }

        // Fetch existing students to check for duplicates
        const studentsResponse = await studentAPI.getAll()
        if (studentsResponse.success && studentsResponse.data?.students) {
          const students = studentsResponse.data.students.map(s => s.phone || '').filter(Boolean)
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
  }, [])

  // When board is selected, filter classes for that board
  useEffect(() => {
    if (!formData.board) {
      setAvailableClasses([])
      setFormData(prev => ({ ...prev, class: '' }))
      return
    }

    // Filter classes by selected board (regular classes only)
    // Get unique class numbers and filter out null/undefined values
    // Use case-insensitive comparison for board names
    const selectedBoard = formData.board.trim()
    const classesForBoard = [...new Set(
      allClassesData
        .filter(c => {
          const classBoard = (c.board || '').trim()
          return classBoard.toLowerCase() === selectedBoard.toLowerCase() && 
                 c.type === 'regular' && 
                 c.class != null
        })
        .map(c => parseInt(c.class))
        .filter(c => !isNaN(c) && c >= 1 && c <= 12)
    )].sort((a, b) => a - b)

    setAvailableClasses(classesForBoard)

    // Reset class if current class is not available for selected board
    if (formData.class) {
      const currentClassNum = parseInt(formData.class)
      if (!classesForBoard.includes(currentClassNum)) {
        setFormData(prev => ({ ...prev, class: '' }))
      }
    }
  }, [formData.board, allClassesData, formData.class])

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
        setFormData(prev => ({ ...prev, selectedPlanId: '' }))
      }
    }

    fetchPlans()
  }, [formData.subscriptionStatus, formData.class, formData.board])

  // Fetch preparation classes and their subscriptions
  useEffect(() => {
    const fetchPrepData = async () => {
      try {
        setLoadingPrepPlans(true)
        
        // Fetch preparation classes - pass all=true to get all active classes
        const classesResponse = await subscriptionPlanAPI.getPreparationClasses(true)
        if (classesResponse.success && classesResponse.data?.classes) {
          const prepClasses = classesResponse.data.classes.filter(c => c.isActive !== false)
          setPreparationClasses(prepClasses)
        }
        
        // Fetch all preparation plans
        const plansResponse = await subscriptionPlanAPI.getAll({
          type: 'preparation',
          isActive: true
        })
        
        if (plansResponse.success && (plansResponse.data?.plans || plansResponse.data?.subscriptionPlans)) {
          const plans = plansResponse.data.plans || plansResponse.data.subscriptionPlans || []
          setPrepPlans(plans)
          
          // Group plans by classId
          const plansByClass = {}
          plans.forEach(plan => {
            const classId = plan.classId?._id || plan.classId
            if (classId) {
              const classIdStr = classId.toString()
              if (!plansByClass[classIdStr]) {
                plansByClass[classIdStr] = []
              }
              plansByClass[classIdStr].push(plan)
            }
          })
          setPrepPlansByClass(plansByClass)
        } else {
          setPrepPlans([])
          setPrepPlansByClass({})
        }
      } catch (error) {
        console.error('Error fetching preparation data:', error)
        setPrepPlans([])
        setPrepPlansByClass({})
      } finally {
        setLoadingPrepPlans(false)
      }
    }

    fetchPrepData()
  }, [])

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

      // Check for duplicate phone number
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
      }

      // Add preparation plans - convert { classId: planId } to array of planIds
      const prepPlanIds = Object.values(formData.prepSubscriptions || {}).filter(Boolean)
      if (prepPlanIds.length > 0) {
        studentData.preparationPlanIds = prepPlanIds
      }

      // Add image as base64 if provided
      if (formData.imagePreview) {
        studentData.profileImageBase64 = formData.imagePreview
      }

      const response = await studentAPI.create(studentData)

      if (response.success) {
        navigate('/admin/students')
      } else {
        setError(response.message || 'Failed to create student')
      }
    } catch (err) {
      setError(err.message || 'Failed to create student. Please try again.')
      console.error('Error creating student:', err)
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

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3">
        {/* Header */}
        <div className="pb-1 sm:pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/students')}
              className="p-1 text-[#1e3a5f] hover:text-[#2a4a6f] transition-all duration-200 flex items-center justify-center"
              title="Back"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-[#1e3a5f]">Add New Student</h1>
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
                    <div className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 rounded-full bg-linear-to-br from-[#1e3a5f] to-[#2a4a6f] flex items-center justify-center border-4 border-[#1e3a5f] shadow-lg">
                      <span className="text-white font-bold text-xl sm:text-2xl md:text-3xl">
                        {getInitials(formData.name)}
                      </span>
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-linear-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-full p-2 sm:p-3 md:p-4 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
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
                  <div className="relative flex items-stretch">
                    {/* Country Code Dropdown */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="flex items-center justify-center gap-1.5 px-3 sm:px-4 h-full rounded-l-lg sm:rounded-l-xl border-2 border-r-0 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors min-h-[42px] sm:min-h-[44px] md:min-h-[48px] w-auto"
                      >
                        <span className="text-gray-700 font-medium text-xs sm:text-sm whitespace-nowrap">
                          {selectedCountryCode}
                        </span>
                        <FiChevronDown className="text-gray-500 text-xs sm:text-sm shrink-0" />
                      </button>

                      {/* Dropdown Menu */}
                      {showCountryDropdown && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowCountryDropdown(false)}
                          />
                          <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-200 rounded-lg sm:rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto w-48 sm:w-56">
                            {countryCodes.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountryCode(country.code)
                                  setShowCountryDropdown(false)
                                }}
                                className={`w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 hover:bg-gray-50 transition-colors ${selectedCountryCode === country.code ? 'bg-[#1e3a5f]/10' : ''
                                  }`}
                              >
                                <span className="text-gray-700 font-bold text-xs md:text-sm w-6 md:w-8">
                                  {country.countryCode}
                                </span>
                                <span className="text-gray-700 font-medium text-xs md:text-sm">
                                  {country.code}
                                </span>
                                <span className="text-gray-500 text-[10px] md:text-xs ml-auto">
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
                      className="flex-1 pl-3 sm:pl-4 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 rounded-r-lg sm:rounded-r-xl border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/20 focus:bg-white transition-all text-sm sm:text-base text-gray-700 placeholder:text-gray-400 h-full min-h-[42px] sm:min-h-[44px] md:min-h-[48px]"
                      placeholder="Enter mobile number"
                      disabled={isLoading}
                    />
                  </div>
                  {formData.mobile && formData.mobile.length < 10 && (
                    <p className="text-xs text-red-500 mt-1">Mobile number must be at least 10 digits</p>
                  )}
                  {formData.mobile && formData.mobile.length > 15 && (
                    <p className="text-xs text-red-500 mt-1">Mobile number cannot exceed 15 digits</p>
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white text-sm sm:text-base"
                    disabled={isLoading || loadingClasses}
                  >
                    <option value="">Select Board</option>
                    {boards.map(board => (
                      <option key={board} value={board}>{board}</option>
                    ))}
                  </select>
                  {loadingClasses && (
                    <p className="text-xs text-gray-500 mt-1">Loading boards...</p>
                  )}
                  {!loadingClasses && boards.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">No boards available. Please create classes first.</p>
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white text-sm sm:text-base"
                    disabled={isLoading || !formData.board || availableClasses.length === 0}
                  >
                    <option value="">{formData.board ? 'Select Class' : 'Select Board First'}</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                  {formData.board && availableClasses.length === 0 && !loadingClasses && (
                    <p className="text-xs text-red-500 mt-1">No classes available for {formData.board}. Please create a class-board combination first.</p>
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
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white text-sm sm:text-base"
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
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1">
                  Preparation Subscriptions (optional)
                </label>
                <p className="text-[10px] text-gray-500 mb-1">Assign one subscription per preparation class. You can assign multiple subscriptions for different preparation classes.</p>
                
                {loadingPrepPlans ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500">Loading preparation classes...</p>
                  </div>
                ) : preparationClasses.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500">No preparation classes available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {preparationClasses.map(prepClass => {
                      const classId = prepClass._id?.toString() || prepClass._id
                      const plansForClass = prepPlansByClass[classId] || []
                      const selectedPlanId = formData.prepSubscriptions[classId] || ''
                      
                      return (
                        <div key={classId} className="border border-gray-200 rounded-lg p-2 sm:p-3">
                          <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1.5">
                            {prepClass.name || prepClass.classCode || 'Preparation Class'}
                          </label>
                          <select
                            value={selectedPlanId}
                            onChange={(e) => {
                              const newPrepSubs = { ...formData.prepSubscriptions }
                              if (e.target.value) {
                                newPrepSubs[classId] = e.target.value
                              } else {
                                delete newPrepSubs[classId]
                              }
                              setFormData(prev => ({ ...prev, prepSubscriptions: newPrepSubs }))
                            }}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white text-[10px] sm:text-xs"
                            disabled={isLoading || loadingPrepPlans}
                          >
                            <option value="">No subscription</option>
                            {plansForClass.map(plan => (
                              <option key={plan._id} value={plan._id}>
                                {plan.name} - ₹{plan.price} ({plan.duration})
                              </option>
                            ))}
                          </select>
                          {plansForClass.length === 0 && (
                            <p className="text-[9px] text-gray-400 mt-1">No subscriptions available for this class</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate('/admin/students')}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-linear-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddStudent
