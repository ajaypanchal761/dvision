import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { teacherAPI, agentAPI } from '../services/api';
import { initializeNotifications, savePendingFcmToken, setupForegroundMessageListener } from '../utils/notifications';
import {
  initializeAgentNotifications,
  savePendingAgentFcmToken,
  setupAgentForegroundMessageListener,
} from '../utils/agentNotifications';
import Image from '../components/common/Image';

/**
 * Final OTP Verification Page
 * Verify OTP to complete login
 */
const FinalOTP = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [loginMode, setLoginMode] = useState('teacher'); // 'teacher' or 'agent'
  const inputRef = useRef(null);

  useEffect(() => {
    // Get phone and mode from sessionStorage
    const loginPhone = sessionStorage.getItem('login_phone');
    const mode = sessionStorage.getItem('login_mode') || 'teacher';

    if (loginPhone) {
      setPhone(loginPhone);
      setLoginMode(mode);
    } else {
      // No phone found, redirect to login
      navigate(ROUTES.LOGIN);
      return;
    }

    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [navigate]);

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtp(pastedData);
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let response;

      if (loginMode === 'agent') {
        // Agent OTP verification
        response = await agentAPI.verifyOTP(phone, otp);

        if (response.success && response.data) {
          // Store token in localStorage (agent)
          if (response.data.token) {
            localStorage.setItem('dvision_agent_token', response.data.token);
          }

          // Store user role as agent
          localStorage.setItem('user_role', 'agent');
          localStorage.setItem('agent_data', JSON.stringify(response.data.agent));

          // Clear sessionStorage
          sessionStorage.removeItem('login_phone');
          sessionStorage.removeItem('login_mode');

          // Initialize notifications for agent (web)
          initializeAgentNotifications();
          setupAgentForegroundMessageListener();
          savePendingAgentFcmToken();

          // Navigate to agent dashboard on success
          navigate(ROUTES.AGENT_DASHBOARD);
        } else {
          setError(response.message || 'Wrong/Invalid OTP');
        }
      } else {
        // Teacher OTP verification
        response = await teacherAPI.verifyOTP(phone, otp);

        if (response.success && response.data) {
          // Store token in localStorage (teacher)
          if (response.data.token) {
            localStorage.setItem('dvision_teacher_token', response.data.token);
          }

          // Store user role as teacher
          localStorage.setItem('user_role', 'teacher');

          // Clear sessionStorage
          sessionStorage.removeItem('login_phone');
          sessionStorage.removeItem('login_mode');

          // Initialize notifications after login
          initializeNotifications();
          setupForegroundMessageListener();
          savePendingFcmToken();

          // Navigate to dashboard on success
          navigate(ROUTES.DASHBOARD);
        } else {
          setError(response.message || 'Wrong/Invalid OTP');
        }
      }
    } catch (error) {
      setError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    setError('');

    try {
      let response;

      if (loginMode === 'agent') {
        // Agent resend OTP
        response = await agentAPI.sendOTP(phone);
      } else {
        // Teacher resend OTP
        response = await teacherAPI.resendOTP(phone);
      }

      if (response.success) {
        // Show success message
        alert('OTP resent successfully!');
        // Clear OTP field
        setOtp('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        setError(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError(error.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const isOtpComplete = otp.length === 6;

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* Header Section */}
      <div
        className="bg-[var(--app-dark-blue)] text-white h-24 sm:h-28 md:h-32 relative overflow-hidden"
        style={{
          borderBottomRightRadius: '200px',
        }}
      >
        {/* Animated Waves Pattern */}
        <div className="absolute bottom-0 left-0 w-full h-12 sm:h-14 md:h-16 overflow-hidden">
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
              <span className="text-lg sm:text-xl md:text-2xl font-extrabold">←</span>
            </button>
            <div>
              <p className="text-xs sm:text-sm md:text-base text-white/90 mb-0.5 sm:mb-1">Verification</p>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">Verify OTP</h1>
            </div>
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

        <div className="w-full max-w-sm sm:max-w-md relative z-10">
          {/* Logo */}
          <div className="mb-4 sm:mb-5 md:mb-6 flex justify-center">
            <Image
              src="/dvisionteacher.png"
              alt="D'Vision Academy Logo"
              className="h-28 sm:h-32 md:h-36 lg:h-40 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-4 sm:mb-5 md:mb-6">
            <p className="text-black/80 text-xs sm:text-sm md:text-base mb-2">
              Enter the 6-digit code sent to {phone ? phone.replace(/\d(?=\d{4})/g, '*') : 'your mobile number'}
            </p>
          </div>

          {/* OTP Form Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-2xl border border-gray-200">
            <form onSubmit={handleVerify} className="space-y-3 sm:space-y-4 md:space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm">
                  {error}
                </div>
              )}

              {/* OTP Input Field */}
              <div>
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={handleOtpChange}
                  onPaste={handlePaste}
                  placeholder="Enter 6-digit OTP"
                  className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl border-0 bg-gray-50 focus:outline-none focus:bg-white transition-all text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-[var(--app-black)] placeholder:text-gray-400 text-center tracking-wider"
                  required
                />
              </div>

              {/* Resend OTP */}
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-1.5">
                  Didn't receive the code?
                </p>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="text-[var(--app-dark-blue)] font-semibold text-xs sm:text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? 'Resending...' : 'Resend OTP'}
                </button>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={!isOtpComplete || isLoading}
                className="w-full bg-[var(--app-dark-blue)] text-white py-3 sm:py-4 md:py-4.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base hover:opacity-90 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify & Login'}
              </button>
            </form>
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

export default FinalOTP;

