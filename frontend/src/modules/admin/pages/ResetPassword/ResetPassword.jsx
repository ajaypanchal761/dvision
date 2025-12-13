import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { adminAPI } from '../../services/api'

const ResetPassword = () => {
  const { resetToken } = useParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!resetToken) {
      setError('Invalid reset token. Please request a new password reset link.')
    }
  }, [resetToken])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await adminAPI.resetPassword(resetToken, password)
      
      if (response.success) {
        setSuccess('Password reset successful! Redirecting to login...')
        
        // Store token if provided
        if (response.data?.token) {
          localStorage.setItem('dvision_admin_token', response.data.token)
        }
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/admin/login', { replace: true })
        }, 2000)
      } else {
        setError(response.message || 'Failed to reset password. Please try again.')
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Panel - Promotional Section (Hidden on mobile) */}
      <div className="hidden lg:flex w-full lg:w-1/2 bg-gradient-to-br from-dvision-blue-lightBg via-dvision-blue-lighterBg to-dvision-blue-lightestBg flex-col justify-between p-8 lg:p-12">
        {/* Top Section - Promotional Text */}
        <div className="flex-1 flex items-start pt-8 lg:pt-16">
          <div className="w-full max-w-lg">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-dvision-blue-dark leading-tight mb-4">
              Reset Your Password &{' '}
              <span className="text-dvision-orange">Get Back In</span>
            </h1>
            <p className="text-lg lg:text-xl text-dvision-blue-dark/80 mt-6">
              Enter your new password below to complete the reset process.
            </p>
          </div>
        </div>

        {/* Bottom Section - Logo */}
        <div className="mt-8 lg:mt-0">
          <div className="flex items-center space-x-4">
            <img 
              src="/logo.png" 
              alt="D'Vision Academy Logo" 
              className="w-16 h-16 lg:w-20 lg:h-20 object-contain"
            />
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-dvision-blue-dark">
                D'VISION ACADEMY
              </h2>
              <p className="text-sm lg:text-base text-dvision-blue-dark/70">Empowering Education</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Reset Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 bg-gray-50 lg:bg-white">
        <div className="w-full max-w-md">
          {/* Reset Password Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-10">
            {/* Logo - Show only on mobile */}
            <div className="flex justify-center mb-6 lg:hidden">
              <img 
                src="/logo.png" 
                alt="D'Vision Academy Logo" 
                className="w-24 h-24 object-contain"
              />
            </div>
            
            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center lg:text-left">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-8 text-center lg:text-left">
              Enter your new password below.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password Field */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dvision-blue-bright focus:border-dvision-blue-bright outline-none transition-all text-gray-700 placeholder-gray-400"
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dvision-blue-bright focus:border-dvision-blue-bright outline-none transition-all text-gray-700 placeholder-gray-400"
                  placeholder="Confirm your new password"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !resetToken}
                className="w-full bg-gradient-to-b from-dvision-blue-light via-dvision-blue to-dvision-blue-dark text-white py-3.5 rounded-lg font-semibold text-base hover:shadow-xl hover:shadow-dvision-blue/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            {/* Back to Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link
                  to="/admin/login"
                  className="text-dvision-blue-bright hover:text-dvision-blue-dark font-semibold transition-colors"
                >
                  Back to Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword

