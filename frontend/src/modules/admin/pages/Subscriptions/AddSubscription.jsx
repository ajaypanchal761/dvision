import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionPlanAPI } from '../../services/api'

const AddSubscription = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Type, 2: Board/PrepClass, 3: Classes, 4: Plans
  const [planType, setPlanType] = useState('') // 'regular' or 'preparation'
  const [board, setBoard] = useState('')
  const [preparationClasses, setPreparationClasses] = useState([])
  const [selectedPrepClassId, setSelectedPrepClassId] = useState('')
  const [classes, setClasses] = useState([])
  const [selectedClasses, setSelectedClasses] = useState([])
  const [classMissingDurations, setClassMissingDurations] = useState({}) // Track missing durations per class
  const [isLoadingClasses, setIsLoadingClasses] = useState(false)
  const [error, setError] = useState('')
  const [plans, setPlans] = useState([
    { duration: 'monthly', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: null },
    { duration: 'quarterly', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: null },
    { duration: 'half_yearly', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: null },
    { duration: 'yearly', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: null },
    { duration: 'demo', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: 7 }
  ])
  const [featureInputs, setFeatureInputs] = useState(['', '', '', '', '']) // One input per plan
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addingFeatureRef = useRef({}) // Track which plan is currently adding a feature

  // Fetch classes when board is selected (for regular plans)
  useEffect(() => {
    if (board && planType === 'regular' && step === 3) {
      fetchClasses()
    }
  }, [board, planType, step])

  // Fetch preparation classes when type is selected
  useEffect(() => {
    if (planType === 'preparation' && step === 2) {
      fetchPreparationClasses()
    }
  }, [planType, step])

  const fetchClasses = async () => {
    try {
      setIsLoadingClasses(true)
      setError('')
      const response = await subscriptionPlanAPI.getClassesByBoard(board)
      if (response.success && response.data?.classes) {
        setClasses(response.data.classes)
        // Store missing durations for each class
        const missingDurationsMap = {}
        response.data.classes.forEach(classItem => {
          if (classItem.missingDurations && classItem.missingDurations.length > 0) {
            missingDurationsMap[classItem.class] = classItem.missingDurations
          }
        })
        setClassMissingDurations(missingDurationsMap)
      } else {
        setError('Failed to load classes')
      }
    } catch (err) {
      setError(err.message || 'Failed to load classes')
      console.error('Error fetching classes:', err)
    } finally {
      setIsLoadingClasses(false)
    }
  }

  const fetchPreparationClasses = async () => {
    try {
      setIsLoadingClasses(true)
      setError('')
      const response = await subscriptionPlanAPI.getPreparationClasses()
      if (response.success && response.data?.classes) {
        setPreparationClasses(response.data.classes)
        // Store missing durations for each preparation class
        const missingDurationsMap = {}
        response.data.classes.forEach(classItem => {
          if (classItem.missingDurations && classItem.missingDurations.length > 0) {
            missingDurationsMap[classItem._id] = classItem.missingDurations
          }
        })
        setClassMissingDurations(missingDurationsMap)
      } else {
        setError('Failed to load preparation classes')
      }
    } catch (err) {
      setError(err.message || 'Failed to load preparation classes')
      console.error('Error fetching preparation classes:', err)
    } finally {
      setIsLoadingClasses(false)
    }
  }

  const handleTypeSelect = (type) => {
    setPlanType(type)
    setBoard('')
    setSelectedPrepClassId('')
    setSelectedClasses([])
    setClasses([])
    setPreparationClasses([])
    setClassMissingDurations({})
    setStep(2)
  }

  const handleBoardSelect = (selectedBoard) => {
    setBoard(selectedBoard)
    setSelectedClasses([])
    setClasses([])
    setStep(3)
  }

  const handlePrepClassSelect = (classId) => {
    setSelectedPrepClassId(classId)
    setStep(4)
  }

  const handleClassToggle = (classNum) => {
    setSelectedClasses(prev => {
      if (prev.includes(classNum)) {
        return prev.filter(c => c !== classNum)
      } else {
        return [...prev, classNum].sort((a, b) => a - b)
      }
    })
  }

  const handlePlanChange = (index, field, value) => {
    setPlans(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleFeatureInputChange = (planIndex, value) => {
    setFeatureInputs(prev => {
      const updated = [...prev]
      updated[planIndex] = value
      return updated
    })
  }

  const handleFeatureAdd = (planIndex) => {
    // Prevent double execution
    if (addingFeatureRef.current[planIndex]) {
      return
    }

    const feature = featureInputs[planIndex]
    if (feature && feature.trim()) {
      const trimmedFeature = feature.trim()
      
      // Set ref to prevent double execution
      addingFeatureRef.current[planIndex] = true
      
      setPlans(prev => {
        const updated = [...prev]
        const currentPlan = updated[planIndex]
        
        // Check if feature already exists to prevent duplicates (using current state)
        const featureExists = currentPlan.features.some(f => f.trim() === trimmedFeature)
        
        if (!featureExists) {
          updated[planIndex] = {
            ...currentPlan,
            features: [...currentPlan.features, trimmedFeature]
          }
        }
        
        return updated
      })
      
      // Clear the input for this plan
      setFeatureInputs(prev => {
        const updated = [...prev]
        updated[planIndex] = ''
        return updated
      })
      
      // Reset the ref after a short delay
      setTimeout(() => {
        addingFeatureRef.current[planIndex] = false
      }, 100)
    }
  }

  const handleFeatureRemove = (planIndex, featureIndex) => {
    setPlans(prev => {
      const updated = [...prev]
      updated[planIndex].features = updated[planIndex].features.filter((_, i) => i !== featureIndex)
      return updated
    })
  }

  const handleNext = () => {
    if (step === 1) {
      if (!planType) {
        setError('Please select a plan type')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (planType === 'regular') {
        if (!board) {
          setError('Please select a board')
          return
        }
        setStep(3)
      } else {
        if (!selectedPrepClassId) {
          setError('Please select a preparation class')
          return
        }
        // For preparation class, calculate missing durations
        const allDurations = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'demo']
        const missingDurations = classMissingDurations[selectedPrepClassId] || allDurations
        
        setPlans(prev => prev.map(plan => ({
          ...plan,
          isAvailable: missingDurations.includes(plan.duration)
        })))
        
        setStep(4)
      }
    } else if (step === 3) {
      if (selectedClasses.length === 0) {
        setError('Please select at least one class')
        return
      }
      setError('')
      
      // Calculate which durations are missing for selected classes
      // A duration is available if at least one selected class is missing it
      const allDurations = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'demo']
      const availableDurations = new Set()
      
      selectedClasses.forEach(classNum => {
        const missingDurations = classMissingDurations[classNum] || allDurations
        missingDurations.forEach(dur => availableDurations.add(dur))
      })
      
      // Filter plans to only show missing durations
      setPlans(prev => prev.map(plan => ({
        ...plan,
        isAvailable: availableDurations.has(plan.duration)
      })))
      
      setStep(4)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
      setPlanType('')
      setBoard('')
      setSelectedPrepClassId('')
      setSelectedClasses([])
      setClasses([])
      setPreparationClasses([])
      setClassMissingDurations({})
      // Reset plans
      setPlans([
        { duration: 'monthly', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: null },
        { duration: 'quarterly', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: null },
        { duration: 'half_yearly', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: null },
        { duration: 'yearly', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: null },
        { duration: 'demo', name: '', price: '', originalPrice: '', description: '', features: [], validityDays: 7 }
      ])
    } else if (step === 3) {
      setStep(2)
      setBoard('')
      setSelectedClasses([])
      setClasses([])
      setClassMissingDurations({})
    } else if (step === 4) {
      if (planType === 'regular') {
        setStep(3)
      } else {
        setStep(2)
        setSelectedPrepClassId('')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Filter to only available plans (missing durations)
    const availablePlans = plans.filter(plan => plan.isAvailable !== false)
    
    if (availablePlans.length === 0) {
      setError('No plans available to create. All plans already exist for selected classes.')
      return
    }

    // Validate available plans
    for (let i = 0; i < availablePlans.length; i++) {
      const plan = availablePlans[i]
      if (!plan.name || !plan.price) {
        setError(`Please fill all required fields for ${plan.duration} plan`)
        return
      }
      if (parseFloat(plan.price) <= 0) {
        setError(`Price must be greater than 0 for ${plan.duration} plan`)
        return
      }
      // Validate validityDays for demo plans
      if (plan.duration === 'demo') {
        if (!plan.validityDays || parseInt(plan.validityDays) < 1) {
          setError('Please provide validity days (must be at least 1) for demo plan')
          return
        }
      }
    }

    setIsSubmitting(true)

    try {
      // Create only available plans (missing durations)
      const promises = availablePlans.map(plan => {
        if (!plan.name || !plan.price) return null

        const planData = {
          type: planType,
          name: plan.name,
          duration: plan.duration,
          price: parseFloat(plan.price),
          originalPrice: plan.originalPrice ? parseFloat(plan.originalPrice) : parseFloat(plan.price),
          description: plan.description || '',
          features: plan.features || [],
          isActive: true
        }

        // Add validityDays for demo plans
        if (plan.duration === 'demo' && plan.validityDays) {
          planData.validityDays = parseInt(plan.validityDays);
        }

        if (planType === 'regular') {
          planData.board = board
          planData.classes = selectedClasses
        } else {
          planData.classId = selectedPrepClassId
        }

        return subscriptionPlanAPI.create(planData)
      })

      const results = await Promise.all(promises.filter(p => p !== null))

      // Check if all were successful
      const failed = results.find(r => !r.success)
      if (failed) {
        setError(failed.message || 'Failed to create some subscription plans')
        return
      }

      // Success - navigate back
    navigate('/admin/subscriptions')
    } catch (err) {
      setError(err.message || 'Failed to create subscription plans')
      console.error('Error creating subscription plans:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3">
        {/* Header */}
        <div className="pb-1 sm:pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/subscriptions')}
              className="p-1 text-[#1e3a5f] hover:text-[#2a4a6f] transition-all duration-200 flex items-center justify-center"
              title="Back"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-[#1e3a5f]">
                Add Subscription Plans
              </h1>
              <p className="text-xs text-[#1e3a5f]/70 mt-0.5">
                Step {step} of {planType === 'preparation' ? 4 : 4}: {
                  step === 1 ? 'Select Type' : 
                  step === 2 ? (planType === 'regular' ? 'Select Board' : 'Select Preparation Class') : 
                  step === 3 ? 'Select Classes' : 
                  'Create Plans'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2">
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Step 1: Select Type */}
        {step === 1 && (
          <div className="mt-2 sm:mt-3">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                Select Plan Type
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <button
                  onClick={() => handleTypeSelect('regular')}
                  className="p-4 sm:p-5 border-2 border-gray-200 rounded-lg hover:border-[#1e3a5f] hover:bg-blue-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Regular Plans</h3>
                      <p className="text-sm sm:text-base text-gray-600">Board-based plans (CBSE, RBSE)</p>
                    </div>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => handleTypeSelect('preparation')}
                  className="p-4 sm:p-5 border-2 border-gray-200 rounded-lg hover:border-[#1e3a5f] hover:bg-blue-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Preparation Plans</h3>
                      <p className="text-sm sm:text-base text-gray-600">NDA, NEET, JEE, etc.</p>
                    </div>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Board (for regular) or Preparation Class */}
        {step === 2 && planType === 'regular' && (
          <div className="mt-2 sm:mt-3">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    Select Board
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Choose a board to create subscription plans
                  </p>
                </div>
                <button
                  onClick={handleBack}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900"
                >
                  Change Type
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <button
                  onClick={() => handleBoardSelect('CBSE')}
                  className="p-4 sm:p-5 border-2 border-gray-200 rounded-lg hover:border-[#1e3a5f] hover:bg-blue-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">CBSE</h3>
                      <p className="text-sm sm:text-base text-gray-600">Central Board of Secondary Education</p>
                    </div>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => handleBoardSelect('RBSE')}
                  className="p-4 sm:p-5 border-2 border-gray-200 rounded-lg hover:border-[#1e3a5f] hover:bg-blue-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">RBSE</h3>
                      <p className="text-sm sm:text-base text-gray-600">Rajasthan Board of Secondary Education</p>
                    </div>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
            </button>
          </div>
        </div>
          </div>
        )}

        {/* Step 2: Select Preparation Class */}
        {step === 2 && planType === 'preparation' && (
          <div className="mt-2 sm:mt-3">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    Select Preparation Class
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Select a preparation class to create subscription plans
                  </p>
                </div>
                <button
                  onClick={handleBack}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900"
                >
                  Change Type
                </button>
              </div>

              {isLoadingClasses ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#1e3a5f]"></div>
                  <p className="mt-3 sm:mt-4 text-gray-500 text-sm sm:text-base">Loading preparation classes...</p>
                </div>
              ) : preparationClasses.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-500 text-sm sm:text-base mb-2">
                    All preparation classes already have subscription plans created.
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Please update existing plans from the subscriptions list instead of creating new ones.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {preparationClasses.map((classItem) => (
                    <button
                      key={classItem._id}
                      onClick={() => handlePrepClassSelect(classItem._id)}
                      className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                        selectedPrepClassId === classItem._id
                          ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div>
                        <div className="text-base sm:text-lg md:text-xl font-bold">{classItem.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">{classItem.classCode}</div>
                        {classItem.description && (
                          <div className="text-xs text-gray-600 mt-2">{classItem.description}</div>
                        )}
                        {classItem.missingDurations && classItem.missingDurations.length > 0 && (
                          <div className="text-xs text-blue-600 mt-2">
                            Missing: {classItem.missingDurations.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Classes (for regular plans only) */}
        {step === 3 && planType === 'regular' && (
          <div className="mt-2 sm:mt-3">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                    Select Classes for {board}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Select one or more classes to create subscription plans
                  </p>
                </div>
                <button
                  onClick={handleBack}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900"
                >
                  Change Board
                </button>
              </div>

              {isLoadingClasses ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#1e3a5f]"></div>
                  <p className="mt-3 sm:mt-4 text-gray-500 text-sm sm:text-base">Loading classes...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-500 text-sm sm:text-base mb-2">
                    All classes for {board} already have subscription plans created.
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Please update existing plans from the subscriptions list instead of creating new ones.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {classes.map((classItem) => (
                    <button
                      key={classItem._id}
                      onClick={() => handleClassToggle(classItem.class)}
                      className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 ${selectedClasses.includes(classItem.class)
                        ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                    >
                      <div className="text-center">
                        <div className="text-lg sm:text-xl md:text-2xl font-bold">Class {classItem.class}</div>
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">{classItem.classCode}</div>
                        {classItem.missingDurations && classItem.missingDurations.length > 0 && (
                          <div className="text-xs text-blue-600 mt-2">
                            Missing: {classItem.missingDurations.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedClasses.length > 0 && (
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    Selected Classes: <span className="font-semibold">{selectedClasses.map(c => `Class ${c}`).join(', ')}</span>
                  </p>
                  <button
                    onClick={handleNext}
                    className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                  >
                    Continue to Create Plans
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Create Plans */}
        {step === 4 && (
          <div className="mt-2 sm:mt-3">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                      Create Subscription Plans
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {planType === 'regular' 
                        ? `${board} - Classes ${selectedClasses.map(c => c).join(', ')}`
                        : preparationClasses.find(c => c._id === selectedPrepClassId)?.name || 'Preparation Class'
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900"
                  >
                    Change Selection
                  </button>
              </div>

                {plans.filter(plan => plan.isAvailable !== false).length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-gray-500 text-sm sm:text-base mb-2">
                      All subscription plans already exist for the selected classes.
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      Please update existing plans from the subscriptions list or select different classes.
                    </p>
                  </div>
                ) : (
                <div className="space-y-6 sm:space-y-8">
                  {plans.map((plan, index) => {
                    // Only show plans that are available (missing for selected classes)
                    if (plan.isAvailable === false) {
                      return null
                    }
                    return (
                    <div key={plan.duration} className="border-2 border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-4 sm:mb-6 capitalize">
                        {plan.duration === 'half_yearly' ? 'Half Yearly' : plan.duration === 'demo' ? 'Demo' : plan.duration.charAt(0).toUpperCase() + plan.duration.slice(1)} Plan
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                            Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                            type="text"
                  required
                            value={plan.name}
                            onChange={(e) => handlePlanChange(index, 'name', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                            placeholder={`e.g., ${board} ${plan.duration} Plan`}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                            Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                            value={plan.price}
                            onChange={(e) => handlePlanChange(index, 'price', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                            placeholder="Enter price"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                            Original Price (₹) <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={plan.originalPrice}
                            onChange={(e) => handlePlanChange(index, 'originalPrice', e.target.value)}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                            placeholder="Enter original price (for discount)"
                          />
              </div>

              {/* Validity Days for Demo Plans */}
              {plan.duration === 'demo' && (
                <div>
                  <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Validity (Days) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={plan.validityDays || ''}
                    onChange={(e) => handlePlanChange(index, 'validityDays', parseInt(e.target.value) || 7)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                    placeholder="Enter validity in days (e.g., 7, 15, 30)"
                  />
                </div>
              )}

                        <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                            Description <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                          <textarea
                            value={plan.description}
                            onChange={(e) => handlePlanChange(index, 'description', e.target.value)}
                            rows="3"
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                            placeholder="Enter plan description"
                          />
              </div>

                        <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 mb-1.5 sm:mb-2">
                            Features <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                          <div className="space-y-2">
                            {plan.features.map((feature, featureIndex) => (
                              <div key={featureIndex} className="flex items-center gap-2">
                                <span className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm">{feature}</span>
                                <button
                                  type="button"
                                  onClick={() => handleFeatureRemove(index, featureIndex)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                <input
                                type="text"
                                value={featureInputs[index] || ''}
                                onChange={(e) => handleFeatureInputChange(index, e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleFeatureAdd(index)
                                  }
                                }}
                                placeholder="Add a feature"
                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => handleFeatureAdd(index)}
                                className="px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg text-sm"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
              </div>
                    </div>
                    )
                  })}
                </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
              <button
                type="button"
                  onClick={handleBack}
                className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                  Back
              </button>
              <button
                type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isSubmitting ? 'Creating Plans...' : 'Create All Plans'}
              </button>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  )
}

export default AddSubscription
