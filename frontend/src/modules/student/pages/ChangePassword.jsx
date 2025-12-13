import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';

/**
 * Change Password Page
 * Allows users to change their password
 * Redesigned with new theme
 */
const ChangePassword = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    
    try {
      updateUser({ password: formData.newPassword });
      
      setTimeout(() => {
        setIsSubmitting(false);
        alert('Password saved successfully!');
        navigate(ROUTES.PROFILE);
      }, 1000);
    } catch (error) {
      setIsSubmitting(false);
      alert('Failed to save password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-white pb-20">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate(ROUTES.PROFILE)}
              className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
              <FiArrowLeft className="text-xl sm:text-2xl" />
          </button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Change Password</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mt-6 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-bold">
                New Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiLock className="text-[var(--app-dark-blue)] text-xl" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-gray-800 font-medium"
                  placeholder="New Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {showNewPassword ? (
                    <FiEyeOff className="text-[var(--app-dark-blue)] text-xl" />
                  ) : (
                    <FiEye className="text-[var(--app-dark-blue)] text-xl" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="block text-sm text-gray-700 mb-2 font-bold">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiLock className="text-[var(--app-dark-blue)] text-xl" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-gray-800 font-medium"
                  placeholder="Confirm New Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="text-[var(--app-dark-blue)] text-xl" />
                  ) : (
                    <FiEye className="text-[var(--app-dark-blue)] text-xl" />
                  )}
                </button>
              </div>
            </div>

            {/* Save Password Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[var(--app-dark-blue)] text-white font-bold py-4 rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Password'}
            </button>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ChangePassword;
