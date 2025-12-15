import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../services/api';
import { ROUTES } from '../constants/routes';

/**
 * Payment Return Page
 * Handles Cashfree payment redirect and verifies payment
 */
const PaymentReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getCurrentUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'failed'
  const [message, setMessage] = useState('Verifying your payment...');
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Clear payment in progress flag since we're back from payment
        const storedOrderId = localStorage.getItem('payment_order_id');
        localStorage.removeItem('payment_in_progress');
        localStorage.removeItem('payment_order_id');
        localStorage.removeItem('payment_timestamp');
        
        console.log('Cleared payment flags from localStorage');
        
        // Get order_id from URL query params (Cashfree returns this)
        const orderId = searchParams.get('order_id') || storedOrderId;
        
        if (!orderId) {
          setStatus('failed');
          setMessage('Payment verification failed');
          setError('Order ID not found in payment response');
          return;
        }

        // Get other payment details from URL (Cashfree may return these)
        // These are optional - backend will verify with Cashfree API
        const referenceId = searchParams.get('reference_id') || searchParams.get('payment_id') || searchParams.get('referenceId');
        const paymentSignature = searchParams.get('payment_signature') || searchParams.get('signature');
        const txStatus = searchParams.get('tx_status') || searchParams.get('txStatus');
        const orderAmount = searchParams.get('order_amount') || searchParams.get('orderAmount');

        console.log('Payment return params:', {
          orderId,
          referenceId,
          paymentSignature,
          txStatus,
          orderAmount
        });

        // Verify payment with backend (orderId is required, others are optional)
        setStatus('verifying');
        setMessage('Verifying your payment...');

        const verifyResponse = await paymentAPI.verifyPayment(
          orderId,
          referenceId || undefined,
          paymentSignature || undefined,
          txStatus || undefined,
          orderAmount ? parseFloat(orderAmount) : undefined
        );

        console.log('Payment verification response:', verifyResponse);

        if (verifyResponse.success) {
          setStatus('success');
          setMessage('Payment successful! Your subscription has been activated.');

          // Refresh user data to get updated subscription
          try {
            await getCurrentUser();
            console.log('User data refreshed after payment');
          } catch (refreshError) {
            console.error('Error refreshing user data:', refreshError);
            // Don't fail the payment verification if refresh fails
          }

          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate(ROUTES.DASHBOARD);
          }, 3000);
        } else {
          setStatus('failed');
          setMessage('Payment verification failed');
          setError(verifyResponse.message || 'Unable to verify payment. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage('Payment verification failed');
        setError(error.message || 'An error occurred while verifying your payment. Please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate, getCurrentUser]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <FiLoader className="text-6xl text-blue-600 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-75"></div>
                <FiCheckCircle className="relative text-6xl text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            <div className="mt-6">
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="flex justify-center mb-4">
              <FiXCircle className="text-6xl text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-2">{message}</p>
            {error && (
              <p className="text-sm text-red-600 mb-4 bg-red-50 p-3 rounded-lg">{error}</p>
            )}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate(ROUTES.SUBSCRIPTION_PLANS)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate(ROUTES.DASHBOARD)}
                className="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-all duration-200"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;

