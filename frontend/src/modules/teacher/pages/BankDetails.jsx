import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiTrash2, FiCreditCard, FiEdit2 } from 'react-icons/fi';
import BottomNav from '../components/common/BottomNav';
import { agentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';

/**
 * Bank Details Page for Agent
 * Allows agent to add, update, and delete bank details
 * Agent can only have one bank details at a time
 */
const BankDetails = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [agentData, setAgentData] = useState({
    bankDetails: null,
    upiId: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: ''
  });
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await agentAPI.getMe();
      if (response.success && response.data && response.data.agent) {
        const agent = response.data.agent;
        setAgentData({
          bankDetails: agent.bankDetails || null,
          upiId: agent.upiId || null,
        });

        // Initialize form data if bank details exist
        if (agent.bankDetails) {
          setFormData({
            accountHolderName: agent.bankDetails.accountHolderName || '',
            accountNumber: agent.bankDetails.accountNumber || '',
            ifscCode: agent.bankDetails.ifscCode || '',
            bankName: agent.bankDetails.bankName || '',
            branchName: agent.bankDetails.branchName || ''
          });
          setIsEditing(false); // View mode if data exists
        } else {
          setIsEditing(true); // Edit mode if no data exists
        }
        setUpiId(agent.upiId || '');
      }
    } catch (err) {
      console.error('Error fetching agent data:', err);
      setError(err.message || 'Failed to load bank details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate UPI ID if provided
      if (upiId && !/^[\w.-]+@[\w.-]+$/.test(upiId)) {
        setError('Please provide a valid UPI ID (e.g., name@paytm)');
        return;
      }

      // Validate required fields if editing
      if (isEditing) {
        if (!formData.accountHolderName.trim()) {
          setError('Account Holder Name is required');
          return;
        }
        if (!formData.accountNumber.trim()) {
          setError('Account Number is required');
          return;
        }
        if (!formData.ifscCode.trim()) {
          setError('IFSC Code is required');
          return;
        }
        if (!formData.bankName.trim()) {
          setError('Bank Name is required');
          return;
        }
      }

      setSaving(true);
      setError('');
      setSuccess('');

      const response = await agentAPI.updateMe({
        bankDetails: isEditing ? formData : agentData.bankDetails,
        upiId: upiId || null
      });

      if (response.success) {
        setAgentData({
          bankDetails: response.data.agent.bankDetails,
          upiId: response.data.agent.upiId
        });
        setIsEditing(false);
        setSuccess('Bank details saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to save bank details');
      }
    } catch (err) {
      setError(err.message || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your bank details? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      const response = await agentAPI.updateMe({
        bankDetails: null,
        upiId: null
      });

      if (response.success) {
        setAgentData({
          bankDetails: null,
          upiId: null
        });
        setFormData({
          accountHolderName: '',
          accountNumber: '',
          ifscCode: '',
          bankName: '',
          branchName: ''
        });
        setUpiId('');
        setIsEditing(true);
        setSuccess('Bank details deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to delete bank details');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete bank details');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    if (agentData.bankDetails) {
      // Reset to original values
      setFormData({
        accountHolderName: agentData.bankDetails.accountHolderName || '',
        accountNumber: agentData.bankDetails.accountNumber || '',
        ifscCode: agentData.bankDetails.ifscCode || '',
        bankName: agentData.bankDetails.bankName || '',
        branchName: agentData.bankDetails.branchName || ''
      });
      setUpiId(agentData.upiId || '');
      setIsEditing(false);
    } else {
      // Clear form if no existing data
      setFormData({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        branchName: ''
      });
      setUpiId('');
    }
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-20 sm:pb-24 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-dark-blue)]"></div>
          <p className="mt-3 text-sm text-gray-600">Loading bank details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20 sm:pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--app-dark-blue)] text-white relative" style={{ borderRadius: '0 0 50% 50% / 0 0 30px 30px' }}>
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-4 sm:pb-6 md:pb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(ROUTES.AGENT_PROFILE)}
              className="p-1.5 sm:p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiArrowLeft className="text-lg sm:text-xl md:text-2xl" />
            </button>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Bank Details</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 sm:mt-4 md:mt-5">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs sm:text-sm mb-4">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs sm:text-sm mb-4">
            {error}
          </div>
        )}

        {/* Bank Details Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg border border-gray-200 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FiCreditCard className="text-blue-600 text-xl sm:text-2xl" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--app-black)]">
              {isEditing ? (agentData.bankDetails ? 'Edit' : 'Add') : 'View'} Bank Details
            </h2>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                  placeholder="Enter account holder name"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                  placeholder="Enter account number"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)] uppercase"
                    placeholder="IFSC Code"
                    maxLength={11}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
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
                  value={formData.branchName}
                  onChange={(e) => setFormData(prev => ({ ...prev, branchName: e.target.value }))}
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
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-dark-blue)]"
                  placeholder="e.g., name@paytm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[var(--app-dark-blue)] text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiSave className="text-sm" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {agentData.bankDetails && (
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {agentData.bankDetails && (agentData.bankDetails.accountHolderName || agentData.bankDetails.accountNumber) ? (
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
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
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-[var(--app-dark-blue)] text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <FiEdit2 className="text-sm" />
                  {agentData.bankDetails ? 'Edit' : 'Add'} Bank Details
                </button>
                {agentData.bankDetails && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiTrash2 className="text-sm" />
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-yellow-800">
            <strong>Note:</strong> You can only have one bank details at a time. To add new bank details, you must delete the existing one first.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default BankDetails;

