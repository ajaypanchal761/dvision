import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiBook, FiFileText, FiCamera } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';

/**
 * Edit Profile Page
 * Allows users to edit their personal information
 * Redesigned with new theme
 */
const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    class: '',
    board: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.name || user.fullName || '',
        mobileNumber: user.phone || user.mobileNumber || '',
        email: user.email || '',
        class: user.class || '',
        board: user.board || ''
      });
      if (user.profileImage) {
        setProfileImagePreview(user.profileImage);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select an image file');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size should be less than 5MB');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }

      setProfileImage(file);
      setErrorMessage('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      // Prepare update data
      const updateData = {
        name: formData.fullName,
        email: formData.email
      };

      // If profile image is selected, convert to base64
      if (profileImage) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result;
          updateData.profileImageBase64 = base64String;
          
          try {
            const result = await updateUser(updateData);
            
            if (result.success) {
              setIsSubmitting(false);
              setSuccessMessage('Profile updated successfully!');
              setTimeout(() => {
                navigate(ROUTES.PROFILE);
              }, 1500);
            } else {
              setIsSubmitting(false);
              setErrorMessage(result.message || 'Failed to update profile. Please try again.');
            }
          } catch (error) {
            setIsSubmitting(false);
            setErrorMessage(error.message || 'Failed to update profile. Please try again.');
          }
        };
        reader.readAsDataURL(profileImage);
      } else {
        // No image to upload, just update other fields
        const result = await updateUser(updateData);
        
        if (result.success) {
          setIsSubmitting(false);
          setSuccessMessage('Profile updated successfully!');
          setTimeout(() => {
            navigate(ROUTES.PROFILE);
          }, 1500);
        } else {
          setIsSubmitting(false);
          setErrorMessage(result.message || 'Failed to update profile. Please try again.');
        }
      }
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(error.message || 'Failed to update profile. Please try again.');
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Edit Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-6 mt-6 flex justify-center">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-5 sm:p-6 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                {errorMessage}
              </div>
            )}

            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                {profileImagePreview ? (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-[var(--app-dark-blue)]">
                    <img
                      src={profileImagePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[var(--app-dark-blue)] flex items-center justify-center border-4 border-[var(--app-dark-blue)]">
                    <FiUser className="text-white text-3xl sm:text-4xl" />
                  </div>
                )}
                <label
                  htmlFor="profileImage"
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-[var(--app-dark-blue)] rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--app-dark-blue)]/90 transition-colors shadow-lg border-2 border-white"
                >
                  <FiCamera className="text-white text-lg" />
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Click camera icon to change photo</p>
            </div>

            {/* Full Name Field */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiUser className="text-[var(--app-dark-blue)] text-lg" />
                </div>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-gray-800 font-medium"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            {/* Mobile Number Field (Read-only) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiPhone className="text-gray-400 text-lg" />
                </div>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  readOnly
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-100 focus:outline-none text-gray-600 font-medium cursor-not-allowed"
                  placeholder="Mobile number"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Mobile number cannot be changed</p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiMail className="text-[var(--app-dark-blue)] text-lg" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-gray-800 font-medium"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Class Field (Fixed/Read-only) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Class
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiBook className="text-gray-400 text-lg" />
                </div>
                <input
                  type="text"
                  name="class"
                  value={formData.class}
                  readOnly
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-100 focus:outline-none text-gray-600 font-medium cursor-not-allowed"
                  placeholder="Class"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Class cannot be changed</p>
            </div>

            {/* Board Field (Fixed/Read-only) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Board
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <FiFileText className="text-gray-400 text-lg" />
                </div>
                <input
                  type="text"
                  name="board"
                  value={formData.board}
                  readOnly
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-100 focus:outline-none text-gray-600 font-medium cursor-not-allowed"
                  placeholder="Board"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Board cannot be changed</p>
            </div>

            {/* Save Changes Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[var(--app-dark-blue)] text-white font-bold py-4 rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
                {successMessage}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav showProfile={true} />
    </div>
  );
};

export default EditProfile;
