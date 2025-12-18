import React, { useState, useEffect } from 'react';
import { FiUser, FiLogOut, FiFileText, FiShield, FiFileText as FiFile, FiArrowLeft, FiEdit2, FiChevronRight, FiCreditCard, FiTrash2, FiSave, FiX } from 'react-icons/fi';
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
    bankDetails: null,
    upiId: null,
  });
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    email: '',
    profileImage: null,
  });
  const [saving, setSaving] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false);
  const [bankDetailsData, setBankDetailsData] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: ''
  });
  const [upiIdData, setUpiIdData] = useState('');
  const [savingBankDetails, setSavingBankDetails] = useState(false);

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
          bankDetails: agent.bankDetails || null,
          upiId: agent.upiId || null,
        });
        setEditData({
          email: agent.email || '',
          profileImage: agent.profileImage || null,
        });
        // Initialize bank details form data
        if (agent.bankDetails) {
          setBankDetailsData({
            accountHolderName: agent.bankDetails.accountHolderName || '',
            accountNumber: agent.bankDetails.accountNumber || '',
            ifscCode: agent.bankDetails.ifscCode || '',
            bankName: agent.bankDetails.bankName || '',
            branchName: agent.bankDetails.branchName || ''
          });
        }
        setUpiIdData(agent.upiId || '');
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
            bankDetails: agent.bankDetails || null,
            upiId: agent.upiId || null,
          });
          setEditData({
            email: agent.email || '',
            profileImage: agent.profileImage || null,
          });
          if (agent.bankDetails) {
            setBankDetailsData({
              accountHolderName: agent.bankDetails.accountHolderName || '',
              accountNumber: agent.bankDetails.accountNumber || '',
              ifscCode: agent.bankDetails.ifscCode || '',
              bankName: agent.bankDetails.bankName || '',
              branchName: agent.bankDetails.branchName || ''
            });
          }
          setUpiIdData(agent.upiId || '');
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
    localStorage.removeItem('dvision_agent_token');
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

  const handleSaveBankDetails = async () => {
    try {
      // Validate UPI ID if provided
      if (upiIdData && !/^[\w.-]+@[\w.-]+$/.test(upiIdData)) {
        alert('Please provide a valid UPI ID (e.g., name@paytm)');
        return;
      }

      setSavingBankDetails(true);
      const response = await agentAPI.updateMe({
        bankDetails: bankDetailsData,
        upiId: upiIdData || null
      });
      
      if (response.success) {
        setAgentData(prev => ({
          ...prev,
          bankDetails: response.data.agent.bankDetails,
          upiId: response.data.agent.upiId
        }));
        setIsEditingBankDetails(false);
        alert('Bank details updated successfully!');
        await fetchAgentData(); // Refresh data
      } else {
        alert(response.message || 'Failed to update bank details');
      }
    } catch (err) {
      alert(err.message || 'Failed to update bank details');
    } finally {
      setSavingBankDetails(false);
    }
  };

  const handleDeleteBankDetails = async () => {
    if (!confirm('Are you sure you want to delete your bank details? This action cannot be undone.')) {
      return;
    }

    try {
      setSavingBankDetails(true);
      const response = await agentAPI.updateMe({
        bankDetails: null,
        upiId: null
      });
      
      if (response.success) {
        setAgentData(prev => ({
          ...prev,
          bankDetails: null,
          upiId: null
        }));
        setBankDetailsData({
          accountHolderName: '',
          accountNumber: '',
          ifscCode: '',
          bankName: '',
          branchName: ''
        });
        setUpiIdData('');
        setIsEditingBankDetails(false);
        setShowBankDetails(false);
        alert('Bank details deleted successfully!');
        await fetchAgentData(); // Refresh data
      } else {
        alert(response.message || 'Failed to delete bank details');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete bank details');
    } finally {
      setSavingBankDetails(false);
    }
  };

  const menuItems = [
    {
      id: 'bank-details',
      label: 'Bank Details',
      icon: FiCreditCard,
      onClick: () => {
        setShowBankDetails(true);
        if (!agentData.bankDetails && !agentData.upiId) {
          setIsEditingBankDetails(true);
        }
      },
    },
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

      {/* Bank Details Modal */}
      {showBankDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-[var(--app-black)]">
                Bank Details
              </h3>
              <button
                onClick={() => {
                  setShowBankDetails(false);
                  setIsEditingBankDetails(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {isEditingBankDetails ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={bankDetailsData.accountHolderName}
                    onChange={(e) => setBankDetailsData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                    placeholder="Enter account holder name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankDetailsData.accountNumber}
                    onChange={(e) => setBankDetailsData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                    placeholder="Enter account number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={bankDetailsData.ifscCode}
                      onChange={(e) => setBankDetailsData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)] uppercase"
                      placeholder="IFSC Code"
                      maxLength={11}
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankDetailsData.bankName}
                      onChange={(e) => setBankDetailsData(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                      placeholder="Bank Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={bankDetailsData.branchName}
                    onChange={(e) => setBankDetailsData(prev => ({ ...prev, branchName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                    placeholder="Enter branch name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={upiIdData}
                    onChange={(e) => setUpiIdData(e.target.value.toLowerCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                    placeholder="e.g., name@paytm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveBankDetails}
                    disabled={savingBankDetails}
                    className="flex-1 bg-[var(--app-dark-blue)] text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiSave className="text-sm" />
                    {savingBankDetails ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingBankDetails(false);
                      // Reset to original values
                      if (agentData.bankDetails) {
                        setBankDetailsData({
                          accountHolderName: agentData.bankDetails.accountHolderName || '',
                          accountNumber: agentData.bankDetails.accountNumber || '',
                          ifscCode: agentData.bankDetails.ifscCode || '',
                          bankName: agentData.bankDetails.bankName || '',
                          branchName: agentData.bankDetails.branchName || ''
                        });
                      }
                      setUpiIdData(agentData.upiId || '');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    <FiX className="text-sm" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {agentData.bankDetails && (agentData.bankDetails.accountHolderName || agentData.bankDetails.accountNumber) ? (
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">Bank Information</h4>
                    {agentData.bankDetails.accountHolderName && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Account Holder Name</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{agentData.bankDetails.accountHolderName}</p>
                      </div>
                    )}
                    {agentData.bankDetails.accountNumber && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Account Number</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{agentData.bankDetails.accountNumber}</p>
                      </div>
                    )}
                    {agentData.bankDetails.ifscCode && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">IFSC Code</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{agentData.bankDetails.ifscCode}</p>
                      </div>
                    )}
                    {agentData.bankDetails.bankName && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Bank Name</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{agentData.bankDetails.bankName}</p>
                      </div>
                    )}
                    {agentData.bankDetails.branchName && (
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Branch Name</p>
                        <p className="text-xs sm:text-sm font-medium text-gray-900">{agentData.bankDetails.branchName}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiCreditCard className="text-4xl text-gray-300 mx-auto mb-3" />
                    <p className="text-xs sm:text-sm text-gray-500 mb-4">No bank details added yet</p>
                  </div>
                )}

                {agentData.upiId && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">UPI ID</h4>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">{agentData.upiId}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsEditingBankDetails(true);
                      if (!agentData.bankDetails) {
                        setBankDetailsData({
                          accountHolderName: '',
                          accountNumber: '',
                          ifscCode: '',
                          bankName: '',
                          branchName: ''
                        });
                      }
                    }}
                    className="flex-1 bg-[var(--app-dark-blue)] text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <FiEdit2 className="text-sm" />
                    {agentData.bankDetails ? 'Edit' : 'Add'} Bank Details
                  </button>
                  {agentData.bankDetails && (
                    <button
                      onClick={handleDeleteBankDetails}
                      disabled={savingBankDetails}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <FiTrash2 className="text-sm" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
