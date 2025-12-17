import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiChevronDown } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import logoImage from '../assets/logo.png';
import Image from '../components/common/Image';

/**
 * Login Page - OTP Based
 * Mobile number login with OTP verification
 */
const Login = () => {
  const navigate = useNavigate();
  const { sendOTP } = useAuth();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Popular country codes
  const countryCodes = [
    { code: '+91', country: 'India', countryCode: 'IN', flag: '🇮🇳' },
    { code: '+1', country: 'USA', countryCode: 'US', flag: '🇺🇸' },
    { code: '+44', country: 'UK', countryCode: 'GB', flag: '🇬🇧' },
    { code: '+61', country: 'Australia', countryCode: 'AU', flag: '🇦🇺' },
    { code: '+971', country: 'UAE', countryCode: 'AE', flag: '🇦🇪' },
  ];

  useEffect(() => {
    setPhone('');
    const phoneInput = document.getElementById('mobile-number-login');
    if (phoneInput) phoneInput.value = '';
  }, []);

  // If already logged in (student token present), skip login
  useEffect(() => {
    const token = localStorage.getItem('dvision_token');
    if (token) {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        if (!decoded.role || decoded.role === 'student') {
          navigate(ROUTES.DASHBOARD, { replace: true });
        }
      } catch (e) {
        // Ignore decode errors and allow normal login
      }
    }
  }, [navigate]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('[Login] Starting login process...');
    
    if (!phone || phone.length < 10) {
      console.log('[Login] Validation failed: Invalid phone number');
      setError('Please enter a valid mobile number');
      return;
    }

    setIsLoading(true);
    const fullPhone = `${selectedCountryCode}${phone}`;
    console.log('[Login] Phone number:', fullPhone);

    try {
      console.log('[Login] Importing studentAPI...');
      // Login student - POST API Call (sends OTP)
      const { studentAPI } = await import('../services/api');
      console.log('[Login] Calling studentAPI.login...');
      
      const result = await studentAPI.login(fullPhone);
      console.log('[Login] API Response:', result);
      
      if (result.success) {
        console.log('[Login] Success! Storing phone and navigating to OTP page...');
        // Store phone number for OTP verification page
        sessionStorage.setItem('login_phone', fullPhone);
        // Navigate to OTP verification page
        navigate(ROUTES.FINAL_OTP);
      } else {
        console.error('[Login] API returned success=false:', result);
        setError(result.message || 'Failed to login');
      }
    } catch (error) {
      console.error('[Login] Error occurred:', {
        message: error.message,
        name: error.name,
        errorType: error.constructor?.name,
        status: error.status,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Show user-friendly error message
      let errorMessage = error.message || 'Something went wrong. Please try again.';
      
      // Add helpful hints for common errors
      if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
        errorMessage += ' Please check your internet connection and ensure the backend server is running.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('[Login] Login process completed');
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Single Box with Left Straight and Right Curved */}
      <div 
        className="bg-[var(--app-dark-blue)] text-white h-32 sm:h-40 md:h-48 relative overflow-hidden"
        style={{
          borderBottomRightRadius: '300px',
        }}
      >
        {/* Animated Waves Pattern */}
        <div className="absolute bottom-0 left-0 w-full h-16 sm:h-20 md:h-24 overflow-hidden">
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
          <div>
            <p className="text-xs sm:text-sm md:text-base text-white/90 mb-0.5 sm:mb-1">Welcome back!</p>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">Sign In</h1>
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
        
        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="mb-4 sm:mb-5 md:mb-6 flex justify-center">
            <div className="relative">
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 bg-[var(--app-dark-blue)]/20 rounded-full blur-2xl scale-150"></div>
              <Image
                src={logoImage}
                alt="D'Vision Academy Logo"
                className="h-20 sm:h-24 md:h-28 lg:h-32 w-auto object-contain relative z-10"
              />
            </div>
          </div>
          
          <form onSubmit={handleSendOTP} autoComplete="off" noValidate className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Mobile Number Input */}
            <div>
              <label className="block text-sm sm:text-base md:text-lg font-medium text-[var(--app-black)] mb-2 sm:mb-3">
                Mobile Number
              </label>
              <div className="relative flex items-stretch">
                {/* Country Code Dropdown */}
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-4 md:px-5 h-full rounded-l-lg sm:rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors min-h-[48px] sm:min-h-[52px] md:min-h-[56px] w-auto"
                  >
                    <span className="text-[var(--app-black)]/70 font-medium text-sm sm:text-base md:text-lg whitespace-nowrap">
                      {selectedCountryCode}
                    </span>
                    <FiChevronDown className="text-[var(--app-black)]/50 text-sm sm:text-base md:text-lg flex-shrink-0" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showCountryDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowCountryDropdown(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg sm:rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto w-44 sm:w-48 md:w-56">
                        {countryCodes.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountryCode(country.code);
                              setShowCountryDropdown(false);
                            }}
                            className={`w-full flex items-center gap-2 md:gap-3 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 hover:bg-gray-50 transition-colors ${
                              selectedCountryCode === country.code ? 'bg-[var(--app-dark-blue)]/10' : ''
                            }`}
                          >
                            <span className="text-[var(--app-black)] font-bold text-xs sm:text-xs md:text-sm w-5 sm:w-6 md:w-8">
                              {country.countryCode}
                            </span>
                            <span className="text-[var(--app-black)] font-medium text-xs sm:text-xs md:text-sm">
                              {country.code}
                            </span>
                            <span className="text-[var(--app-black)]/60 text-[10px] sm:text-[10px] md:text-xs ml-auto">
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
                  name="mobile-number-login"
                  id="mobile-number-login"
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                    setPhone(value);
                  }}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  inputMode="numeric"
                  className="flex-1 pl-3 sm:pl-4 md:pl-5 pr-3 sm:pr-4 md:pr-5 py-3 sm:py-3.5 md:py-4 rounded-r-lg sm:rounded-r-xl border border-gray-300 bg-gray-50 focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 focus:bg-white transition-all text-sm sm:text-base md:text-lg text-[var(--app-black)] placeholder:text-gray-400 h-full min-h-[48px] sm:min-h-[52px] md:min-h-[56px]"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm">
                <p className="mb-1.5 sm:mb-2">{error}</p>
                {error.includes("don't have an account") && (
                  <button
                    type="button"
                    onClick={() => {
                      const fullPhone = `${selectedCountryCode}${phone}`;
                      sessionStorage.setItem('registration_phone', fullPhone);
                      sessionStorage.setItem('registration_country_code', selectedCountryCode);
                      sessionStorage.setItem('registration_mobile', phone);
                      navigate(ROUTES.REGISTRATION);
                    }}
                    className="text-red-700 font-bold underline hover:text-red-800"
                  >
                    Sign Up
                  </button>
                )}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full bg-[var(--app-dark-blue)] text-white py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !phone || phone.length < 10}
            >
              {isLoading ? 'Sending OTP...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Text */}
          <div className="mt-6 sm:mt-8 md:mt-10 text-center">
            <p className="text-xs sm:text-sm md:text-base text-[var(--app-black)]/80">
              Don't have an account?{' '}
              <Link
                to={ROUTES.REGISTRATION}
                className="text-[var(--app-teal)] font-bold underline hover:opacity-80"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Colored Pattern */}
      <div 
        className="bg-[var(--app-dark-blue)] h-16 sm:h-20 md:h-24 relative mt-auto overflow-hidden"
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
    </div>
  );
};

export default Login;
