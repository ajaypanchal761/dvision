import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../common/Input';
import Button from '../common/Button';

/**
 * Reusable Auth Form Component
 * Can be used for Login or Mobile Number entry
 */
const AuthForm = ({
  title = "Welcome Back!",
  subtitle = "Login to your account",
  showPassword = false,
  showForgotPassword = false,
  showRegisterLink = false,
  registerLinkTo = "",
  registerLinkText = "Don't have an account?",
  registerButtonText = "Register",
  onSubmit,
  buttonText = "Continue",
  mobileMaxLength = null,
}) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordToggle, setShowPasswordToggle] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ mobile, password });
    }
  };

  const handleMobileChange = (e) => {
    const value = mobileMaxLength 
      ? e.target.value.replace(/\D/g, '').slice(0, mobileMaxLength)
      : e.target.value;
    setMobile(value);
  };

  const isFormValid = showPassword 
    ? mobile && password 
    : mobile.length === (mobileMaxLength || 10);

  return (
    <div className="min-h-screen w-full bg-[var(--app-teal)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Welcome Message */}
        <div className="text-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--app-white)] mb-2">
            {title}
          </h1>
          <p className="text-[var(--app-white)]/90 text-base font-bold">
            {subtitle}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#FFFFFF] rounded-2xl p-6 shadow-2xl mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mobile Number Input */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[var(--app-black)] mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <span className="text-lg">🇮🇳</span>
                  <span className="text-[var(--app-black)] font-medium">+91</span>
                </div>
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={handleMobileChange}
                  className="w-full px-4 py-3 pl-16 rounded-xl border-2 border-[var(--app-teal)]/30 bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[var(--app-teal)] focus:border-[var(--app-teal)] transition-all text-[var(--app-black)] placeholder:text-[var(--app-black)]/50"
                  maxLength={mobileMaxLength || 10}
                  required
                />
              </div>
            </div>

            {/* Password Input - Only if showPassword is true */}
            {showPassword && (
              <div>
                <Input
                  label="Password"
                  type={showPasswordToggle ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={
                    <svg className="w-5 h-5 text-[var(--app-teal)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPasswordToggle(!showPasswordToggle)}
                      className="text-[var(--app-teal)] hover:text-[var(--app-teal)]/80 transition-colors"
                    >
                      {showPasswordToggle ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  }
                />
              </div>
            )}

            {/* Forgot Password Link - Only if showForgotPassword is true */}
            {showForgotPassword && (
              <div className="text-right">
                <Link 
                  to="#" 
                  className="text-sm text-[var(--app-teal)] font-medium hover:text-[var(--app-teal)]/80 transition-colors hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            {/* Continue Button */}
            <Button
              variant="primary"
              type="submit"
              className="w-full mt-2 shadow-lg hover:shadow-xl transition-shadow"
              disabled={!isFormValid}
            >
              {buttonText}
            </Button>
          </form>
        </div>

        {/* Registration Link - Only if showRegisterLink is true */}
        {showRegisterLink && (
          <div className="text-center">
            <p className="text-[var(--app-white)] text-sm font-bold">
              {registerLinkText}{' '}
              <Link 
                to={registerLinkTo} 
                className="text-[var(--app-teal)] font-bold underline hover:text-[var(--app-white)] transition-colors"
              >
                {registerButtonText}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthForm;

