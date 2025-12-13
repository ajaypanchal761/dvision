import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiChevronDown, FiTrash2 } from 'react-icons/fi';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';

/**
 * Delete Account Page
 * Allows users to delete their account with reason and details
 * Redesigned with new theme
 */
const DeleteAccount = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [deleteReason, setDeleteReason] = useState('I don\'t need this anymore');
  const [details, setDetails] = useState('');
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteReasons = [
    'I don\'t need this anymore',
    'I found a better alternative',
    'Privacy concerns',
    'Too expensive',
    'Technical issues',
    'Other'
  ];

  const handleDelete = () => {
    if (!deleteReason) {
      alert('Please select a reason for deletion');
      return;
    }

    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setIsDeleting(true);
      
      setTimeout(() => {
        setIsDeleting(false);
        alert('Account deleted successfully');
        logout();
        navigate(ROUTES.LOGIN);
      }, 1500);
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Delete Account</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mt-6 border border-gray-200">
          {/* Heading */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <FiTrash2 className="text-red-600 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Delete Account
            </h2>
          </div>

          {/* Information Text */}
          <p className="text-gray-600 mb-6 font-medium">
            Please be informed about below information before deleting
          </p>

          {/* Before Deleting Section */}
          <div className="mb-8 bg-red-50 rounded-xl p-5 border border-red-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Before deleting
            </h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold mt-1">•</span>
                <span className="font-medium">Account deletion is permanent</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold mt-1">•</span>
                <span className="font-medium">We remove all your data</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold mt-1">•</span>
                <span className="font-medium">You can't log in to this account anymore</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-600 font-bold mt-1">•</span>
                <span className="font-medium">Any services that are currently on progress will be suspended</span>
              </li>
            </ul>
          </div>

          {/* Delete Reason Dropdown */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Delete reason
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReasonDropdown(!showReasonDropdown)}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-gray-800 text-left flex items-center justify-between focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 transition-all font-medium"
              >
                <span>{deleteReason}</span>
                <FiChevronDown className={`text-gray-400 transition-transform ${showReasonDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showReasonDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setShowReasonDropdown(false)}
                  ></div>
                  <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    {deleteReasons.map((reason, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setDeleteReason(reason);
                          setShowReasonDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-gray-800 font-medium border-b border-gray-100 last:border-b-0"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Details Textarea */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows="4"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-gray-800 focus:outline-none focus:border-[var(--app-dark-blue)] focus:ring-2 focus:ring-[var(--app-dark-blue)]/20 resize-none font-medium"
              placeholder="Write in details"
            />
          </div>

          {/* Delete Account Button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'DELETE ACCOUNT'}
          </button>
        </div>
      </main>

      <BottomNav showProfile={true} />
    </div>
  );
};

export default DeleteAccount;
