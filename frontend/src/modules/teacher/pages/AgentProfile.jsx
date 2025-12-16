import React, { useState, useEffect } from 'react';
import { FiUser, FiLogOut, FiFileText, FiShield, FiFileText as FiFile, FiArrowLeft, FiEdit2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import { agentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';

/**
 * Agent Profile Page
 * Shows agent information with limited edit options (email, profile image only)
 */
const AgentProfile = () => {
  const navigate = useNavigate();
  const [agentData, setAgentData] = useState({
    name: 'Agent',
    phone: '',
    email: '',
    profileImage: null,
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    email: '',
    profileImage: null,
  });
  const [saving, setSaving] = useState(false);

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
        setEditData({
          email: agent.email || '',
          profileImage: agent.profileImage || null,
        });
        localStorage.setItem('agent_data', JSON.stringify(agent));
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
          setEditData({
            email: agent.email || '',
            profileImage: agent.profileImage || null,
          });
        } catch (e) {
          console.error('Error parsing stored data:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.removeItem('dvision_token');
    localStorage.removeItem('agent_data');
    localStorage.removeItem('user_role');
    sessionStorage.clear();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await agentAPI.updateMe(editData);
      if (response.success) {
        setAgentData(prev => ({
          ...prev,
          email: editData.email,
          profileImage: editData.profileImage
        }));
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert(response.message || 'Failed to update profile');
      }
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({
          ...prev,
          profileImage: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const menuItems = [
    {
      id: 'about-us',
      label: 'About Us',
      icon: FiFileText,
      onClick: () => navigate('/teacher/content/about-us'),
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: FiShield,
      onClick: () => navigate('/teacher/content/privacy-policy'),
    },
    {
      id: 'terms',
      label: 'Terms & Conditions',
      icon: FiFile,
      onClick: () => navigate('/teacher/content/terms-and-conditions'),
    },
    {
      id: 'logout',
      label: 'Log Out',
      icon: FiLogOut,
      onClick: () => setShowLogoutConfirm(true),
      isDestructive: true,
    },
  ];

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.AGENT_DASHBOARD)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Your Profile</h1>
          </div>
        </div>
      </header>

      {/* Profile Information */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 sm:mt-4 md:mt-5">
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-200 mb-4 sm:mb-5">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {editData.profileImage ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-[var(--app-dark-blue)] shadow-xl">
                  <img
                    src={editData.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-[var(--app-dark-blue)] flex items-center justify-center border-4 border-[var(--app-dark-blue)] shadow-xl">
                  <FiUser className="text-white text-3xl sm:text-4xl" />
                </div>
              )}
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-[var(--app-dark-blue)] text-white p-2 rounded-full cursor-pointer hover:opacity-90 transition-all">
                  <FiEdit2 className="text-sm" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--app-black)] mb-1">
              {agentData.name}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">{agentData.phone}</p>

            {isEditing ? (
              <div className="w-full space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                    placeholder="Enter email"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-[var(--app-dark-blue)] text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        email: agentData.email,
                        profileImage: agentData.profileImage
                      });
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600">Email</p>
                  <p className="text-sm sm:text-base font-medium text-[var(--app-black)]">
                    {agentData.email || 'Not provided'}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full mt-3 bg-[var(--app-dark-blue)] text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <FiEdit2 className="text-sm" />
                  Edit Profile
                </button>
                <p className="text-[10px] sm:text-xs text-gray-500 text-center mt-2">
                  Note: You can only edit email and profile image. Name and phone can only be changed by admin.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full flex items-center justify-between p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors ${item.isDestructive ? 'text-red-600' : 'text-[var(--app-black)]'
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="text-lg sm:text-xl" />
                <span className="text-sm sm:text-base font-medium">{item.label}</span>
              </div>
              <FiChevronRight className="text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm w-full">
            <h3 className="text-base sm:text-lg font-bold text-[var(--app-black)] mb-2">
              Confirm Logout
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default AgentProfile;
