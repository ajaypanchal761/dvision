import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { subscriptionPlanAPI } from '../../services/api'

const EditSubscription = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [formData, setFormData] = useState({
    type: 'regular',
    name: '',
    board: '',
    classes: [],
    classId: '',
    duration: '',
    price: '',
    originalPrice: '',
    description: '',
    features: [],
    isActive: true,
    validityDays: null
  })
  const [planType, setPlanType] = useState('regular')
  const [preparationClassName, setPreparationClassName] = useState('') // Store class name separately
  const [newFeature, setNewFeature] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isAddingFeatureRef = useRef(false) // Prevent double execution

  useEffect(() => {
    fetchSubscriptionPlan()
  }, [id])

  const fetchSubscriptionPlan = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await subscriptionPlanAPI.getById(id)
      if (response.success && response.data?.subscriptionPlan) {
        const plan = response.data.subscriptionPlan
        const type = plan.type || 'regular'
        setPlanType(type)
        
        // Handle classId - can be object (populated) or string (ID)
        const classIdValue = plan.classId?._id || plan.classId || ''
        const classNameValue = plan.classId?.name || (plan.classId && typeof plan.classId === 'object' ? plan.classId.name : '') || ''
        
        setFormData({
          type: type,
          name: plan.name || '',
          board: plan.board || '',
          classes: plan.classes || [],
          classId: classIdValue,
          duration: plan.duration || '',
          price: plan.price?.toString() || '',
          originalPrice: plan.originalPrice?.toString() || '',
          description: plan.description || '',
          features: plan.features || [],
          isActive: plan.isActive !== undefined ? plan.isActive : true,
          validityDays: plan.validityDays || null
        })
        
        // Store class name separately for display
        setPreparationClassName(classNameValue)
        
        // If classId exists but name is missing, log warning
        if (type === 'preparation' && classIdValue && !classNameValue) {
          console.warn('⚠️ Preparation plan has classId but class name is missing. Class may not exist in database.')
          setPreparationClassName('⚠️ Class Not Found')
        }
      } else {
        setError('Failed to load subscription plan')
        setTimeout(() => navigate('/admin/subscriptions'), 2000)
      }
    } catch (err) {
      setError(err.message || 'Failed to load subscription plan')
      console.error('Error fetching subscription plan:', err)
      setTimeout(() => navigate('/admin/subscriptions'), 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddFeature = (e) => {
    if (e) {
      e.preventDefault()
    }
    
    // Prevent double execution
    if (isAddingFeatureRef.current) {
      return
    }
    
    const feature = newFeature.trim()
    if (feature) {
      // Check if feature already exists to prevent duplicates
      const featureExists = formData.features.some(f => f.trim() === feature)
      if (!featureExists) {
        isAddingFeatureRef.current = true
        
        setFormData(prev => ({
          ...prev,
          features: [...prev.features, feature]
        }))
        
        setNewFeature('')
        
        // Reset the ref after a short delay
        setTimeout(() => {
          isAddingFeatureRef.current = false
        }, 100)
      } else {
        // Clear input even if duplicate
        setNewFeature('')
      }
    }
  }

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate
    if (!formData.name || !formData.price) {
      setError('Please fill all required fields')
      return
    }

    if (parseFloat(formData.price) <= 0) {
      setError('Price must be greater than 0')
      return
    }

    // Validate validityDays for demo plans
    if (formData.duration === 'demo') {
      if (!formData.validityDays || parseInt(formData.validityDays) < 1) {
        setError('Please provide validity days (must be at least 1) for demo plan')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const updateData = {
        type: planType,
        name: formData.name,
        duration: formData.duration,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : parseFloat(formData.price),
        description: formData.description || '',
        features: formData.features || [],
        isActive: formData.isActive
      }

      // Add validityDays for demo plans
      if (formData.duration === 'demo' && formData.validityDays) {
        updateData.validityDays = parseInt(formData.validityDays);
      }

      // Add type-specific fields
      if (planType === 'regular') {
        updateData.board = formData.board
        updateData.classes = formData.classes
      } else {
        updateData.classId = formData.classId
      }

      const response = await subscriptionPlanAPI.update(id, updateData)
      
      if (response.success) {
        navigate('/admin/subscriptions')
      } else {
        setError(response.message || 'Failed to update subscription plan')
      }
    } catch (err) {
      setError(err.message || 'Failed to update subscription plan')
      console.error('Error updating subscription plan:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#1e3a5f]"></div>
          <p className="mt-2 sm:mt-3 text-gray-500 text-xs sm:text-sm">Loading subscription plan...</p>
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
              onClick={() => navigate('/admin/subscriptions')}
              className="text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#1e3a5f]">Edit Subscription Plan</h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 mb-2 sm:mb-3">
            <div className="bg-red-50 border border-red-200 text-red-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="mt-2 sm:mt-3">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
            {/* Read-only info */}
            <div className={`grid grid-cols-1 ${planType === 'regular' ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200`}>
              {planType === 'regular' ? (
                <>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-0.5 sm:mb-1">Type</label>
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-700`}>
                        Regular
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-0.5 sm:mb-1">Board</label>
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{formData.board}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-0.5 sm:mb-1">Classes</label>
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      {formData.classes?.map(c => `Class ${c}`).join(', ') || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-0.5 sm:mb-1">Duration</label>
                    <div className="text-xs sm:text-sm font-medium text-gray-900 capitalize">
                      {formData.duration === 'half_yearly' ? 'Half Yearly' : formData.duration === 'demo' ? 'Demo' : formData.duration}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-0.5 sm:mb-1">Type</label>
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-semibold bg-purple-100 text-purple-700`}>
                          Preparation
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-0.5 sm:mb-1">Duration</label>
                      <div className="text-xs sm:text-sm font-medium text-gray-900 capitalize">
                        {formData.duration === 'half_yearly' ? 'Half Yearly' : formData.duration === 'demo' ? 'Demo' : formData.duration}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-0.5 sm:mb-1">Preparation Class</label>
                    <div className={`text-xs sm:text-sm font-medium ${
                      preparationClassName.includes('⚠️') ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {preparationClassName || (formData.classId ? '⚠️ Class Not Found' : 'N/A')}
                    </div>
                    {formData.classId && !preparationClassName && (
                      <p className="text-[10px] sm:text-xs text-red-600 mt-0.5">
                        ⚠️ Class ID exists but class not found. Please update this plan with a valid class.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                  placeholder="Enter plan name"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                  placeholder="Enter price"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Original Price (₹) <span className="text-gray-500 text-[10px] sm:text-xs">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={(e) => handleChange('originalPrice', e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                  placeholder="Enter original price (for discount)"
                />
              </div>

              {/* Validity Days for Demo Plans */}
              {formData.duration === 'demo' && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    Validity (Days) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={formData.validityDays || ''}
                    onChange={(e) => handleChange('validityDays', parseInt(e.target.value) || 7)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                    placeholder="Enter validity in days (e.g., 7, 15, 30)"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Description <span className="text-gray-500 text-[10px] sm:text-xs">(Optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows="3"
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200"
                  placeholder="Enter plan description"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Features <span className="text-gray-500 text-[10px] sm:text-xs">(Optional)</span>
                </label>
                <div className="space-y-1.5 sm:space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 rounded-lg text-xs sm:text-sm">{feature}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddFeature(e)
                        }
                      }}
                      placeholder="Add a feature"
                      className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => handleChange('isActive', e.target.value === 'true')}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all duration-200 bg-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/admin/subscriptions')}
                className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-[#1e3a5f] to-[#2a4a6f] hover:from-[#2a4a6f] hover:to-[#1e3a5f] text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update Subscription Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditSubscription
