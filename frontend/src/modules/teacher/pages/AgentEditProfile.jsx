import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiCamera } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { agentAPI } from '../services/api';
import BottomNav from '../components/common/BottomNav';

/**
 * Agent Edit Profile Page
 * Allows agents to edit email and profile image only
 */
const AgentEditProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [agentData, setAgentData] = useState({
    name: 'Agent',
    phone: '',
    email: '',
    profileImage: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      const response = await agentAPI.getMe();
      if (response.success && response.data && response.data.agent) {
        const agent = response.data.agent;
        setAgentData({
          name: agent.name || 'Agent',
          phone: agent.phone || '',
          email: agent.email || '',
          profileImage: agent.profileImage || null,
        });
        setFormData({
          name: agent.name || '',
          email: agent.email || '',
        });
        if (agent.profileImage) {
          setProfileImagePreview(agent.profileImage);
        }
      }
    } catch (err) {
      console.error('Error fetching agent data:', err);
      const storedData = localStorage.getItem('agent_data');
      if (storedData) {
        try {
          const agent = JSON.parse(storedData);
          setAgentData({
            name: agent.name || 'Agent',
            phone: agent.phone || '',
            email: agent.email || '',
            profileImage: agent.profileImage || null,
          });
          setFormData({
            name: agent.name || '',
            email: agent.email || '',
          });
          if (agent.profileImage) {
            setProfileImagePreview(agent.profileImage);
          }
        } catch (e) {
          console.error('Error parsing stored data:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

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
        name: formData.name,
        email: formData.email
      };

      // If profile image is selected, convert to base64
      if (profileImage) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result;
          updateData.profileImageBase64 = base64String;
          
          try {
            const response = await agentAPI.updateMe(updateData);
            
            if (response.success) {
              setIsSubmitting(false);
              setSuccessMessage('Profile updated successfully!');
              // Update local storage
              const storedData = localStorage.getItem('agent_data');
              if (storedData) {
                try {
                  const agent = JSON.parse(storedData);
                  agent.name = formData.name;
                  agent.email = formData.email;
                  agent.profileImage = base64String;
                  localStorage.setItem('agent_data', JSON.stringify(agent));
                } catch (e) {
                  console.error('Error updating local storage:', e);
                }
              }
              setTimeout(() => {
                navigate(ROUTES.AGENT_PROFILE);
              }, 1500);
            } else {
              setIsSubmitting(false);
              setErrorMessage(response.message || 'Failed to update profile. Please try again.');
            }
          } catch (error) {
            setIsSubmitting(false);
            setErrorMessage(error.message || 'Failed to update profile. Please try again.');
          }
        };
        reader.readAsDataURL(profileImage);
      } else {
        // No image to upload, just update name and email
        const response = await agentAPI.updateMe(updateData);
        
        if (response.success) {
          setIsSubmitting(false);
          setSuccessMessage('Profile updated successfully!');
          // Update local storage
          const storedData = localStorage.getItem('agent_data');
          if (storedData) {
            try {
              const agent = JSON.parse(storedData);
              agent.name = formData.name;
              agent.email = formData.email;
              localStorage.setItem('agent_data', JSON.stringify(agent));
            } catch (e) {
              console.error('Error updating local storage:', e);
            }
          }
          setTimeout(() => {
            navigate(ROUTES.AGENT_PROFILE);
          }, 1500);
        } else {
          setIsSubmitting(false);
          setErrorMessage(response.message || 'Failed to update profile. Please try again.');
        }
      }
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(error.message || 'Failed to update profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-white pb-20 sm:pb-24">
      {/* Dark Blue Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-5 pb-4 sm:pb-5 md:pb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.AGENT_PROFILE)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold">Edit Profile</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 sm:mt-4 md:mt-5">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 max-w-md mx-auto">
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium">
                {errorMessage}
              </div>
            )}

            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center mb-3 sm:mb-4">
              <div className="relative">
                {profileImagePreview ? (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 sm:border-4 border-[var(--app-dark-blue)]">
                    <img
                      src={profileImagePreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-[var(--app-dark-blue)] flex items-center justify-center border-2 sm:border-4 border-[var(--app-dark-blue)]">
                    <FiUser className="text-white text-2xl sm:text-3xl md:text-4xl" />
                  </div>
                )}
                <label
                  htmlFor="profileImage"
                  className="absolute -bottom-1 sm:-bottom-2 -right-1 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-[var(--app-dark-blue)] rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--app-dark-blue)]/90 transition-colors shadow-lg border-2 border-white"
                >
                  <FiCamera className="text-white text-sm sm:text-lg" />
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-2 text-center">Click camera icon to change photo</p>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                Name
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
                  <FiUser className="text-[var(--app-dark-blue)] text-base sm:text-lg" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name || agentData.name}
                  onChange={handleChange}
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 md:py-3.5 rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-gray-800 font-medium text-xs sm:text-sm md:text-base"
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

            {/* Phone Field (Read-only) */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
                  <FiPhone className="text-gray-400 text-base sm:text-lg" />
                </div>
                <input
                  type="tel"
                  value={agentData.phone}
                  readOnly
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 md:py-3.5 rounded-xl border-2 border-gray-200 bg-gray-100 focus:outline-none text-gray-600 font-medium cursor-not-allowed text-xs sm:text-sm md:text-base"
                  placeholder="Phone number"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Phone number cannot be changed</p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2">
                  <FiMail className="text-[var(--app-dark-blue)] text-base sm:text-lg" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 md:py-3.5 rounded-xl border-2 border-gray-200 bg-white focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all text-gray-800 font-medium text-xs sm:text-sm md:text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Save Changes Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[var(--app-dark-blue)] text-white font-bold py-3 sm:py-3.5 md:py-4 rounded-xl hover:bg-[var(--app-dark-blue)]/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6 text-xs sm:text-sm md:text-base"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium">
                {successMessage}
              </div>
            )}
          </form>
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
};

export default AgentEditProfile;

