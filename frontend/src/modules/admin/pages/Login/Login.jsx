import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { adminAPI } from '../../services/api'
import { initializeNotifications, savePendingFcmToken, setupForegroundMessageListener } from '../../utils/notifications'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await adminAPI.login(email, password)

      if (response.success) {
        // Store admin data if needed
        if (response.data?.admin) {
          localStorage.setItem('admin_data', JSON.stringify(response.data.admin))
        }

        // Initialize notifications after login
        initializeNotifications();
        setupForegroundMessageListener();
        savePendingFcmToken();

        // Navigate to admin dashboard
        navigate('/admin/dashboard')
      } else {
        setError(response.message || 'Login failed. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Panel - Promotional Section (Hidden on mobile) */}
      <div className="hidden lg:flex w-full lg:w-1/2 bg-gradient-to-br from-[#1e3a5f] via-[#2a4a6f] to-[#1e3a5f] flex-col justify-between p-8 lg:p-12 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>

        {/* Top Section - Promotional Text */}
        <div className="flex-1 flex items-start pt-8 lg:pt-16 relative z-10">
          <div className="w-full max-w-lg">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4">
              Create, Manage &{' '}
              <span className="text-[#FF6B35]">Boost Your Business</span>
            </h1>
            <p className="text-lg lg:text-xl text-white/90 mt-6">
              Streamline your operations and take your academy to the next level with our comprehensive admin panel.
            </p>
          </div>
        </div>

        {/* Bottom Section - Logo */}
        <div className="mt-8 lg:mt-0 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-white/10 rounded-full blur-xl"></div>
              <img
                src="/logo.png"
                alt="D'Vision Academy Logo"
                className="w-16 h-16 lg:w-20 lg:h-20 object-contain relative z-10"
              />
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                D'VISION ACADEMY
              </h2>
              <p className="text-sm lg:text-base text-white/80">Empowering Education</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Sign-in Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-5 lg:p-6 bg-gray-50 lg:bg-white min-h-screen lg:min-h-0 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 bg-[#1e3a5f]/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 sm:w-80 sm:h-80 bg-orange-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md mx-auto relative z-10">
          {/* Sign-in Card */}
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-5 sm:p-6 lg:p-7">
            {/* Logo - Show only on mobile */}
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="relative">
                <div className="absolute inset-0 bg-[#1e3a5f]/20 rounded-full blur-2xl scale-150"></div>
                <img
                  src="/logo.png"
                  alt="D'Vision Academy Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain relative z-10"
                />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 sm:mb-6 text-center lg:text-left">Admin Sign-in</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs sm:text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all text-sm text-gray-700 placeholder-gray-400 bg-gray-50 focus:bg-white"
                  placeholder="Please enter email address"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all text-sm text-gray-700 placeholder-gray-400 bg-gray-50 focus:bg-white pr-10"
                    placeholder="Please enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1e3a5f] transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <FiEyeOff className="w-5 h-5" />
                    ) : (
                      <FiEye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="flex justify-end">
                <Link
                  to="/admin/forgot-password"
                  className="text-xs sm:text-sm text-[#1e3a5f] hover:text-[#2a4a6f] font-semibold transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1e3a5f] text-white py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base hover:bg-[#2a4a6f] hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
