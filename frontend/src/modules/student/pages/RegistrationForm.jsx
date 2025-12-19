import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiUser, FiMail, FiChevronDown, FiCamera, FiArrowLeft } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { studentAPI } from '../services/api';

/**
 * Registration Form Page
 * Complete student profile registration - Step 1 (before OTP)
 */
const RegistrationForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get referral agent ID from URL query parameter
  const referralAgentId = searchParams.get('ref') || searchParams.get('referralAgentId');
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    class: '',
    board: '',
    password: '',
    confirmPassword: '',
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [boards, setBoards] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [allClassesData, setAllClassesData] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Check if phone number is coming from login page
    const registrationPhone = sessionStorage.getItem('registration_phone');
    const registrationCountryCode = sessionStorage.getItem('registration_country_code');
    const registrationMobile = sessionStorage.getItem('registration_mobile');

    // Pre-fill phone number if coming from login
    const mobileNumber = registrationMobile || '';
    const countryCode = registrationCountryCode || '+91';

    // Clear sessionStorage after reading
    if (registrationPhone) {
      sessionStorage.removeItem('registration_phone');
      sessionStorage.removeItem('registration_country_code');
      sessionStorage.removeItem('registration_mobile');
    }

    setSelectedCountryCode(countryCode);
    setFormData({
      fullName: '',
      mobileNumber: mobileNumber,
      email: '',
      class: '',
      board: '',
      password: '',
      confirmPassword: '',
    });
    setProfilePhoto(null);
    setProfilePhotoPreview(null);

    // Fetch classes from backend
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const response = await studentAPI.getClasses();
        if (response.success && response.data && response.data.classes) {
          const classesData = response.data.classes.filter(c => c.isActive);

          // Store all classes data for filtering
          setAllClassesData(classesData);

          // Extract unique boards and sort them
          const uniqueBoards = [...new Set(classesData.map(c => c.board))]
            .filter(Boolean)
            .sort();

          setBoards(uniqueBoards);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        // Fallback to default values if API fails
        setBoards(['CBSE', 'RBSE']);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []);

  // When board is selected, filter classes for that board
  useEffect(() => {
    if (!formData.board) {
      setAvailableClasses([]);
      setFormData(prev => ({ ...prev, class: '' }));
      return;
    }

    // Filter classes by selected board
    const classesForBoard = allClassesData
      .filter(c => c.board === formData.board)
      .map(c => c.class)
      .sort((a, b) => a - b);

    // Convert to ordinal format (1 -> 1st, 2 -> 2nd, etc.)
    const formattedClasses = classesForBoard.map(c => {
      const suffix = c === 1 ? 'st' : c === 2 ? 'nd' : c === 3 ? 'rd' : 'th';
      return `${c}${suffix}`;
    });

    setAvailableClasses(formattedClasses);

    // Reset class if current class is not available for selected board
    if (formData.class) {
      const currentClassNum = parseInt(formData.class.replace(/st|nd|rd|th/gi, ''));
      if (!classesForBoard.includes(currentClassNum)) {
        setFormData(prev => ({ ...prev, class: '' }));
      }
    }
  }, [formData.board, allClassesData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Compress and resize image before converting to base64
  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);

      // Compress image before showing preview
      try {
        const compressedBase64 = await compressImage(file);
        setProfilePhotoPreview(compressedBase64);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original if compression fails
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePhotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isFormValid()) {
      setError('Please fill all required fields');
      return;
    }

    setIsLoading(true);

    try {
      // Clean and format phone number
      // Remove all non-digit characters and leading zeros
      let cleanedMobile = formData.mobileNumber.replace(/\D/g, '').replace(/^0+/, '');

      // Validate mobile number length
      if (!cleanedMobile || cleanedMobile.length < 10) {
        setError('Please enter a valid mobile number (minimum 10 digits)');
        setIsLoading(false);
        return;
      }

      if (cleanedMobile.length > 15) {
        setError('Mobile number cannot exceed 15 digits');
        setIsLoading(false);
        return;
      }

      // Combine country code with cleaned mobile number
      // Remove '+' from country code if present, we'll add it back
      const countryCode = selectedCountryCode.replace(/^\+/, '');
      const fullPhone = `+${countryCode}${cleanedMobile}`;

      console.log('=== REGISTRATION FORM SUBMIT ===');
      console.log('Form Data:', formData);
      console.log('Cleaned Mobile:', cleanedMobile);
      console.log('Full Phone:', fullPhone);
      console.log('Profile Photo:', profilePhoto ? 'Present' : 'Not Present');

      // First check if student already exists
      try {
        console.log('Step 1: Checking if student exists...');
        const { studentAPI } = await import('../services/api');
        const checkResponse = await studentAPI.checkStudentExists(fullPhone);
        console.log('Student exists check response:', checkResponse);

        // If student already exists, show modal message
        if (checkResponse.success && checkResponse.data && checkResponse.data.exists) {
          console.log('Student already exists, showing login modal');
          setShowLoginModal(true);
          setIsLoading(false);
          return;
        }
      } catch (checkError) {
        // If check API fails, continue with registration flow
        console.warn('Could not check student existence:', checkError);
      }

      // Validate password
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Register student - POST API Call (stores data and sends OTP)
      console.log('Step 2: Registering student (POST /student/register)...');
      console.log('Referral Agent ID from URL:', referralAgentId);
      const { studentAPI } = await import('../services/api');
      const registerResult = await studentAPI.register(
        fullPhone,
        formData.fullName,
        formData.email,
        formData.class,
        formData.board,
        profilePhotoPreview, // base64 image if available
        referralAgentId, // referral agent ID from URL query parameter
        formData.password // password
      );
      console.log('Register Result:', registerResult);

      if (registerResult.success) {
        // Store phone for OTP page
        sessionStorage.setItem('registration_phone', fullPhone);

        console.log('Step 3: Navigating to OTP page');
        console.log('Note: Registration data stored in backend. OTP verification will complete registration.');
        console.log('=== REGISTRATION FORM SUBMIT COMPLETE ===');

        // Navigate to OTP page
        navigate(ROUTES.FINAL_OTP);
      } else {
        setError(registerResult.message || 'Failed to register');
      }
    } catch (error) {
      console.error('Registration form submit error:', error);
      setError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.fullName &&
      formData.mobileNumber &&
      formData.email &&
      formData.class &&
      formData.board &&
      formData.password &&
      formData.confirmPassword &&
      formData.password === formData.confirmPassword
    );
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Single Box with Left Straight and Right Curved */}
      <div 
        className="bg-[var(--app-dark-blue)] text-white h-20 sm:h-24 md:h-28 relative overflow-hidden"
        style={{
          borderBottomRightRadius: '300px',
        }}
      >
        {/* Animated Waves Pattern */}
        <div className="absolute bottom-0 left-0 w-full h-8 sm:h-10 md:h-12 overflow-hidden">
          <svg 
            className="absolute bottom-0 w-full h-full"
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none"
          >
            <path 
              d="M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z" 
              fill="rgba(255,255,255,0.1)"
            >
              <animate 
                attributeName="d" 
                values="M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z;M0,60 Q300,40 600,60 T1200,60 L1200,120 L0,120 Z;M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z" 
                dur="3s" 
                repeatCount="indefinite"
              />
            </path>
            <path 
              d="M0,80 Q300,40 600,80 T1200,80 L1200,120 L0,120 Z" 
              fill="rgba(255,255,255,0.05)"
            >
              <animate 
                attributeName="d" 
                values="M0,80 Q300,40 600,80 T1200,80 L1200,120 L0,120 Z;M0,80 Q300,60 600,80 T1200,80 L1200,120 L0,120 Z;M0,80 Q300,40 600,80 T1200,80 L1200,120 L0,120 Z" 
                dur="4s" 
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute top-3 right-6 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute top-8 right-16 w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-full blur-lg"></div>
        <div className="absolute bottom-6 left-10 w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-full blur-xl"></div>
        
        <div className="pt-5 sm:pt-6 md:pt-8 px-4 sm:px-6 md:px-8 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">Sign Up</h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 flex items-center justify-center relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient Circles */}
          <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 bg-[var(--app-dark-blue)]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 sm:w-80 sm:h-80 bg-[var(--app-teal)]/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 bg-[var(--app-dark-blue)]/3 rounded-full blur-3xl"></div>
        </div>
        
        {/* Registration Form Card */}
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 shadow-2xl border border-gray-200">
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-[var(--app-black)] mb-3 sm:mb-4 md:mb-6">
              Enter your profile details!
            </h3>

          <form onSubmit={handleSubmit} autoComplete="off" noValidate className="space-y-3 sm:space-y-4 md:space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-medium text-[var(--app-black)] mb-1 sm:mb-1.5 md:mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2">
                  <FiUser className="text-[var(--app-black)]/50 text-sm sm:text-base md:text-lg" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full pl-8 sm:pl-10 md:pl-12 pr-2 sm:pr-3 md:pr-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white focus:outline-none transition-all text-xs sm:text-sm md:text-base text-[var(--app-black)] placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-medium text-[var(--app-black)] mb-1 sm:mb-1.5 md:mb-2">
                Mobile Number
              </label>
              <div className="relative flex items-stretch">
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-3 h-full rounded-l-lg sm:rounded-l-xl border-2 border-r-0 border-gray-300 bg-white hover:bg-gray-50 transition-colors min-h-[40px] sm:min-h-[44px] md:min-h-[48px] w-auto"
                  >
                    <span className="text-[var(--app-black)]/70 font-medium text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
                      {selectedCountryCode}
                    </span>
                  </button>
                </div>
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={formData.mobileNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                    handleInputChange('mobileNumber', value);
                  }}
                  className="flex-1 pl-2 sm:pl-3 md:pl-4 pr-2 sm:pr-3 md:pr-4 py-2 sm:py-2.5 md:py-3 rounded-r-lg sm:rounded-r-xl border-2 border-gray-300 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-xs sm:text-sm md:text-base text-[var(--app-black)] placeholder:text-gray-400 h-full min-h-[40px] sm:min-h-[44px] md:min-h-[48px]"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-medium text-[var(--app-black)] mb-1 sm:mb-1.5 md:mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2">
                  <FiMail className="text-[var(--app-black)]/50 text-sm sm:text-base md:text-lg" />
                </div>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-8 sm:pl-10 md:pl-12 pr-2 sm:pr-3 md:pr-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-xs sm:text-sm md:text-base text-[var(--app-black)] placeholder:text-gray-400"
                  required
                />
              </div>
            </div>

            {/* Board Dropdown - First */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-medium text-[var(--app-black)] mb-1 sm:mb-1.5 md:mb-2">
                Board
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowBoardDropdown(!showBoardDropdown);
                    setShowClassDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-colors text-left min-h-[40px] sm:min-h-[44px] md:min-h-[48px]"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                    <span className="text-[var(--app-black)]/50 text-sm sm:text-base md:text-lg">🏢</span>
                    <span className={`text-xs sm:text-sm md:text-base ${formData.board ? 'text-[var(--app-black)]' : 'text-[var(--app-black)]/50'}`}>
                      {formData.board || 'Select Board'}
                    </span>
                  </div>
                  <FiChevronDown className="text-[var(--app-black)]/50 text-sm sm:text-base md:text-lg" />
                </button>
                {showBoardDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBoardDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl shadow-2xl z-20 max-h-48 sm:max-h-60 overflow-y-auto">
                      {loadingClasses ? (
                        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                          <span className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/50">Loading...</span>
                        </div>
                      ) : boards.length === 0 ? (
                        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                          <span className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/50">No boards available</span>
                        </div>
                      ) : (
                        boards.map((board) => (
                          <button
                            key={board}
                            type="button"
                            onClick={() => {
                              handleInputChange('board', board);
                              setShowBoardDropdown(false);
                            }}
                            className={`w-full flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 hover:bg-gray-50 transition-colors ${formData.board === board ? 'bg-gray-100' : ''
                              }`}
                          >
                            <span className="text-xs sm:text-sm md:text-base text-[var(--app-black)] font-medium">{board}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Class Dropdown - After Board Selection */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-medium text-[var(--app-black)] mb-1 sm:mb-1.5 md:mb-2">
                Class
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.board) {
                      setShowBoardDropdown(true);
                      return;
                    }
                    setShowClassDropdown(!showClassDropdown);
                    setShowBoardDropdown(false);
                  }}
                  disabled={!formData.board}
                  className={`w-full flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-colors text-left min-h-[40px] sm:min-h-[44px] md:min-h-[48px] ${!formData.board ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                    <span className="text-[var(--app-black)]/50 text-sm sm:text-base md:text-lg">🎓</span>
                    <span className={`text-xs sm:text-sm md:text-base ${formData.class ? 'text-[var(--app-black)]' : 'text-[var(--app-black)]/50'}`}>
                      {formData.class || (formData.board ? 'Select Class' : 'Select Board First')}
                    </span>
                  </div>
                  <FiChevronDown className="text-[var(--app-black)]/50 text-sm sm:text-base md:text-lg" />
                </button>
                {showClassDropdown && formData.board && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowClassDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl shadow-2xl z-20 max-h-48 sm:max-h-60 overflow-y-auto">
                      {loadingClasses ? (
                        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                          <span className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/50">Loading...</span>
                        </div>
                      ) : availableClasses.length === 0 ? (
                        <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-center">
                          <span className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/50">
                            {formData.board ? `No classes available for ${formData.board}` : 'No classes available'}
                          </span>
                        </div>
                      ) : (
                        availableClasses.map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => {
                              handleInputChange('class', cls);
                              setShowClassDropdown(false);
                            }}
                            className={`w-full flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 hover:bg-gray-50 transition-colors ${formData.class === cls ? 'bg-gray-100' : ''
                              }`}
                          >
                            <span className="text-xs sm:text-sm md:text-base text-[var(--app-black)] font-medium">{cls}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-medium text-[var(--app-black)] mb-1 sm:mb-1.5 md:mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Enter your password (min 6 characters)"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-xs sm:text-sm md:text-base text-[var(--app-black)] placeholder:text-gray-400"
                required
                minLength={6}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-medium text-[var(--app-black)] mb-1 sm:mb-1.5 md:mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-2 border-gray-300 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-xs sm:text-sm md:text-base text-[var(--app-black)] placeholder:text-gray-400"
                required
                minLength={6}
              />
              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-500 text-[10px] sm:text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Profile Photo Upload */}
            <div className="pt-2 sm:pt-3 md:pt-4">
              <p className="text-[10px] sm:text-xs md:text-sm text-[var(--app-black)]/70 mb-1.5 sm:mb-2 md:mb-3 text-center">
                Upload your profile photo (Optional)
              </p>
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                    className="hidden"
                  />
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full border-2 sm:border-4 border-dashed border-gray-300 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
                    {profilePhotoPreview ? (
                      <img
                        src={profilePhotoPreview}
                        alt="Profile preview"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <FiCamera className="text-gray-500 text-xl sm:text-2xl md:text-3xl mx-auto mb-0.5 sm:mb-1 md:mb-2" />
                        <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 font-medium">Click to Upload</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className="w-full bg-[var(--app-dark-blue)] text-white py-2 sm:py-2.5 md:py-3 lg:py-3.5 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mt-3 sm:mt-4 md:mt-6"
            >
              {isLoading ? 'Sending OTP...' : 'Continue'}
            </button>
          </form>
          </div>
        </div>
      </div>

      {/* Bottom Colored Pattern */}
      <div 
        className="bg-[var(--app-dark-blue)] h-12 sm:h-14 md:h-16 relative mt-auto overflow-hidden"
        style={{
          borderTopLeftRadius: '300px',
        }}
      >
        {/* Animated Waves Pattern */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <svg 
            className="absolute top-0 w-full h-full"
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none"
          >
            <path 
              d="M0,40 Q300,80 600,40 T1200,40 L1200,0 L0,0 Z" 
              fill="rgba(255,255,255,0.1)"
            >
              <animate 
                attributeName="d" 
                values="M0,40 Q300,80 600,40 T1200,40 L1200,0 L0,0 Z;M0,40 Q300,60 600,40 T1200,40 L1200,0 L0,0 Z;M0,40 Q300,80 600,40 T1200,40 L1200,0 L0,0 Z" 
                dur="3s" 
                repeatCount="indefinite"
              />
            </path>
            <path 
              d="M0,20 Q300,60 600,20 T1200,20 L1200,0 L0,0 Z" 
              fill="rgba(255,255,255,0.05)"
            >
              <animate 
                attributeName="d" 
                values="M0,20 Q300,60 600,20 T1200,20 L1200,0 L0,0 Z;M0,20 Q300,40 600,20 T1200,20 L1200,0 L0,0 Z;M0,20 Q300,60 600,20 T1200,20 L1200,0 L0,0 Z" 
                dur="4s" 
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute bottom-3 left-6 w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-8 left-16 w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-full blur-lg"></div>
        <div className="absolute top-6 right-10 w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {/* Login Modal - Number Already Exists */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="mb-4 sm:mb-6">
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--app-black)] mb-2 sm:mb-3">
                  Number Already Exists
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  This mobile number is already registered. Please login to continue.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                  }}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Store phone number for login page
                    // Clean and format phone number (same as in handleSubmit)
                    let cleanedMobile = formData.mobileNumber.replace(/\D/g, '').replace(/^0+/, '');
                    const countryCode = selectedCountryCode.replace(/^\+/, '');
                    const fullPhone = `+${countryCode}${cleanedMobile}`;
                    sessionStorage.setItem('login_phone', fullPhone);

                    // Redirect to login page
                    navigate(ROUTES.LOGIN);
                    setShowLoginModal(false);
                  }}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--app-dark-blue)] text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:opacity-90 transition-all shadow-lg"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationForm;





